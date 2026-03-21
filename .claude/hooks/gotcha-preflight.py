#!/usr/bin/env python3
"""
Gotcha Preflight Hook (PreToolUse — Bash)

Checks commands against the gotcha registry BEFORE execution.
Tier 1: deterministic fast path — command fingerprint / pattern match.
Tier 2: selective path — risky command families only.

Timing budget: 75 ms total (hard cap — exits 0 on timeout).
Blocking rules: only when prevention_mode=strict AND confidence=very_high
                AND rule explicitly marked blocking. Default: advisory warn only.

Exits 0 = allow (with optional warning printed to stdout)
Exits 2 = block  (message printed to stdout)
All exceptions → exit 0 (fail-open, never hold up commands)
"""

import json
import os
import re
import sys
import time
from datetime import datetime, timezone

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
_CLAUDE_DIR = os.path.dirname(_SCRIPT_DIR)
REPO_ROOT = os.path.dirname(_CLAUDE_DIR)

REGISTRY_PATH = os.path.join(_CLAUDE_DIR, "gotcha", "registry.json")
CONFIG_PATH   = os.path.join(_CLAUDE_DIR, "configs", "gotcha-system-config.md")

# ---------------------------------------------------------------------------
# Fast-pass tables (pre-filter before any registry access)
# ---------------------------------------------------------------------------

SAFE_FIRST_TOKENS = {
    "ls", "echo", "cat", "grep", "find", "head", "tail",
    "pwd", "which", "env", "wc", "printf", "date", "id",
    "whoami", "true", "false",
}
SAFE_GIT_SUBCMDS = {"status", "log", "diff", "branch", "show", "blame",
                    "fetch", "remote", "stash", "tag", "describe"}

RISKY_FAMILY_PATTERNS = [
    "firebase deploy",
    "firebase functions:deploy",
    "npm publish",
    "gh release",
    "migrate",
    "db:migrate",
    "schema:push",
    "rm -rf",
    "secrets:set",
]

# Confidence band → float threshold
BAND_THRESHOLDS = {
    "low": 0.0,
    "medium": 0.45,
    "high": 0.75,
    "very_high": 0.85,
}

# Severity → confidence proxy (for rule-based matches)
SEVERITY_CONFIDENCE = {
    "low": 0.30,
    "medium": 0.55,
    "high": 0.75,
    "critical": 0.90,
}

# ---------------------------------------------------------------------------
# Module-level cache to keep repeated invocations fast within same process
# ---------------------------------------------------------------------------
_config_cache: dict | None = None
_config_mtime: float = 0.0
_registry_cache: dict | None = None
_registry_mtime: float = 0.0


# ---------------------------------------------------------------------------
# Loaders (with mtime-based cache)
# ---------------------------------------------------------------------------

def load_config() -> dict:
    global _config_cache, _config_mtime
    defaults = {
        "prevention_mode": "advisory",
        "preflight_enabled": True,
        "minimum_confidence_to_warn": "medium",
        "minimum_confidence_to_block": "very_high",
    }
    try:
        mtime = os.path.getmtime(CONFIG_PATH)
        if _config_cache is not None and mtime == _config_mtime:
            return _config_cache
        with open(CONFIG_PATH) as f:
            content = f.read()
        for line in content.splitlines():
            line = line.strip()
            for key in defaults:
                if line.startswith(f"{key}:"):
                    val = line.split(":", 1)[1].strip()
                    if val.lower() == "true":
                        val = True
                    elif val.lower() == "false":
                        val = False
                    defaults[key] = val
                    break
        _config_cache = defaults
        _config_mtime = mtime
    except OSError:
        pass
    return defaults


def load_registry() -> dict:
    global _registry_cache, _registry_mtime
    empty = {"version": "1.0", "gotchas": [], "preventative_rules": []}
    try:
        mtime = os.path.getmtime(REGISTRY_PATH)
        if _registry_cache is not None and mtime == _registry_mtime:
            return _registry_cache
        with open(REGISTRY_PATH) as f:
            data = json.load(f)
        _registry_cache = data
        _registry_mtime = mtime
        return data
    except (OSError, json.JSONDecodeError):
        return empty


# ---------------------------------------------------------------------------
# Matching helpers
# ---------------------------------------------------------------------------

def is_trivially_safe(command: str) -> bool:
    tokens = command.strip().split()
    if not tokens:
        return True
    first = tokens[0].lower()
    if first in SAFE_FIRST_TOKENS:
        return True
    if first == "git" and len(tokens) > 1 and tokens[1].lower() in SAFE_GIT_SUBCMDS:
        return True
    return False


def is_risky_family(command: str) -> bool:
    cmd_lower = command.lower()
    return any(pat in cmd_lower for pat in RISKY_FAMILY_PATTERNS)


def match_gotcha_signatures(command: str, gotchas: list) -> tuple | None:
    """
    Tier 1: Deterministic match against stored gotcha signatures.
    Returns (gotcha_entry, confidence) of best match, or None.
    """
    cmd_lower = command.lower()
    best_entry = None
    best_conf = 0.0

    for gotcha in gotchas:
        profile = gotcha.get("confidence_profile", {})
        confidence = float(profile.get("confidence", 0.0))

        # Suppress entries with very low confidence (repeatedly rejected)
        if confidence < 0.30:
            continue

        sig = gotcha.get("signature", {})

        # Literal substring patterns
        matched = False
        for pat in sig.get("patterns", []):
            if isinstance(pat, str) and pat.lower() in cmd_lower:
                matched = True
                break

        # Regex patterns (only if no literal match yet)
        if not matched:
            for rp in sig.get("regex_patterns", []):
                try:
                    if re.search(rp, command, re.IGNORECASE):
                        matched = True
                        break
                except re.error:
                    pass

        if matched and confidence > best_conf:
            best_conf = confidence
            best_entry = gotcha

    return (best_entry, best_conf) if best_entry else None


def match_preventative_rules(command: str, rules: list) -> tuple | None:
    """
    Tier 2: Match against stored preventative rules (risky commands only).
    Returns (rule_entry, confidence) of best match, or None.
    """
    cmd_lower = command.lower()
    best_rule = None
    best_conf = 0.0

    for rule in rules:
        # Check condition substring
        condition = rule.get("condition", "").lower()
        families = rule.get("applies_to_command_families", [])

        matched = (condition and condition in cmd_lower) or \
                  any(f.lower() in cmd_lower for f in families)

        if not matched:
            continue

        confidence = SEVERITY_CONFIDENCE.get(rule.get("severity", "medium"), 0.55)
        if confidence > best_conf:
            best_conf = confidence
            best_rule = rule

    return (best_rule, best_conf) if best_rule else None


def confidence_band(value: float) -> str:
    if value >= 0.75:
        return "high"
    if value >= 0.45:
        return "medium"
    return "low"


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    deadline = time.monotonic() + 0.070  # 70 ms hard cap (5 ms buffer)

    try:
        raw = sys.stdin.read()
        payload = json.loads(raw) if raw.strip() else {}
    except Exception:
        sys.exit(0)

    try:
        # Only handle Bash
        if payload.get("tool_name") != "Bash":
            sys.exit(0)

        command = payload.get("tool_input", {}).get("command", "")
        if not command:
            sys.exit(0)

        # Trivially safe → immediate allow
        if is_trivially_safe(command):
            sys.exit(0)

        # Load config (cached)
        config = load_config()

        # preflight disabled or prevention_mode=off → immediate allow
        if not config.get("preflight_enabled", True):
            sys.exit(0)
        if str(config.get("prevention_mode", "advisory")).lower() == "off":
            sys.exit(0)

        prevention_mode = str(config.get("prevention_mode", "advisory")).lower()
        min_warn_threshold  = BAND_THRESHOLDS.get(
            str(config.get("minimum_confidence_to_warn",  "medium")).lower(), 0.45)
        min_block_threshold = BAND_THRESHOLDS.get(
            str(config.get("minimum_confidence_to_block", "very_high")).lower(), 0.85)

        # Time-check before loading registry
        if time.monotonic() > deadline:
            sys.exit(0)

        # Load registry (cached)
        registry = load_registry()

        # Time-check after load
        if time.monotonic() > deadline:
            sys.exit(0)

        # --- Tier 1: gotcha signature match (always runs) ---
        gotcha_match = match_gotcha_signatures(command, registry.get("gotchas", []))

        # --- Tier 2: preventative rule match (risky families only) ---
        rule_match = None
        if is_risky_family(command):
            rule_match = match_preventative_rules(command, registry.get("preventative_rules", []))

        # Pick best match
        if not gotcha_match and not rule_match:
            sys.exit(0)

        if gotcha_match and rule_match:
            match_source = "gotcha" if gotcha_match[1] >= rule_match[1] else "rule"
            entry, confidence = gotcha_match if gotcha_match[1] >= rule_match[1] else rule_match
        elif gotcha_match:
            match_source, entry, confidence = "gotcha", *gotcha_match
        else:
            match_source, entry, confidence = "rule", *rule_match

        # Below minimum warn threshold → silent allow
        if confidence < min_warn_threshold:
            sys.exit(0)

        # Time-check before output
        if time.monotonic() > deadline:
            sys.exit(0)

        # --- Extract fields for message ---
        if match_source == "gotcha":
            name            = entry.get("name", "potential issue")
            description     = entry.get("description", "")
            recommended_fix = entry.get("recommended_fix", "")
            rule_type       = entry.get("preventative_rule", {}).get("rule_type", "advisory")
        else:
            name            = entry.get("rule_id", "rule match")
            description     = entry.get("condition", "")
            recommended_fix = entry.get("suggested_command", "")
            rule_type       = entry.get("rule_type", "advisory")

        band = confidence_band(confidence)

        # --- Decide: block or warn ---
        # Block only when ALL three conditions hold (plan §5 Blocking rules)
        should_block = (
            prevention_mode == "strict"
            and confidence >= min_block_threshold
            and rule_type == "blocking"
        )

        if should_block:
            print(f"[GOTCHA BLOCK] {name}")
            if description:
                print(f"  Reason: {description}")
            if recommended_fix:
                print(f"  Suggested: {recommended_fix}")
            print(f"  Confidence: {band} ({confidence:.2f}) | Mode: strict | Type: blocking")
            print("  To override: set prevention_mode: advisory in .claude/configs/gotcha-system-config.md")
            sys.exit(2)
        else:
            # Advisory / assisted: warn and allow
            print(f"[GOTCHA ADVISORY] {name} [confidence: {band}]")
            if description:
                print(f"  {description}")
            if recommended_fix:
                print(f"  Suggested fix: {recommended_fix}")
            # Exit 0 = allow (warning shown as statusMessage)
            sys.exit(0)

    except Exception:
        sys.exit(0)


if __name__ == "__main__":
    main()
