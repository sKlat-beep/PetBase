#!/usr/bin/env python3
"""
Gotcha Event Capture Hook (PostToolUse — Bash)

Captures Bash tool results as structured events for the Gotcha Monitor.
Classifies each event with a monitor_trigger so the agent layer knows
whether to invoke the monitor without reading the full output.

Always exits 0 — never blocks, never throws.
"""

import json
import os
import sys
import uuid
from datetime import datetime, timezone

# ---------------------------------------------------------------------------
# Paths (derived from script location: .claude/hooks/ → .claude/ → repo root)
# ---------------------------------------------------------------------------
_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
_CLAUDE_DIR = os.path.dirname(_SCRIPT_DIR)
REPO_ROOT = os.path.dirname(_CLAUDE_DIR)

GOTCHA_DIR   = os.path.join(_CLAUDE_DIR, "gotcha")
EVENTS_DIR   = os.path.join(GOTCHA_DIR, "events")
LATEST_PATH  = os.path.join(EVENTS_DIR, "latest.json")
RECENT_PATH  = os.path.join(EVENTS_DIR, "recent.json")
CONFIG_PATH  = os.path.join(_CLAUDE_DIR, "configs", "gotcha-system-config.md")

# ---------------------------------------------------------------------------
# Classification tables
# ---------------------------------------------------------------------------

# Commands in these families are always classified risky_family (even on exit 0)
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

# Soft-failure keywords (warn-level output on exit 0, scoped to risky families)
SOFT_FAILURE_PATTERNS = [
    "Warning:", "warning:", "WARN ",
    "deprecated", "Deprecated",
    "could not", "Could not",
    "skipped", "SKIPPED",
    "failed to", "Failed to",
    "unable to", "Unable to",
]

# Trivially safe first tokens — skip event capture entirely
SAFE_FIRST_TOKENS = {
    "ls", "echo", "cat", "grep", "find", "head", "tail",
    "pwd", "which", "env", "wc", "printf", "date", "id",
    "whoami", "true", "false",
}

# Safe git sub-commands
SAFE_GIT_SUBCMDS = {"status", "log", "diff", "branch", "show", "blame",
                    "fetch", "remote", "stash", "tag", "describe"}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def load_config() -> dict:
    """Parse gotcha-system-config.md for post_execution_monitoring_enabled."""
    defaults = {"post_execution_monitoring_enabled": True, "recent_history_window": 20}
    try:
        with open(CONFIG_PATH) as f:
            for line in f:
                line = line.strip()
                if line.startswith("post_execution_monitoring_enabled:"):
                    val = line.split(":", 1)[1].strip().lower()
                    defaults["post_execution_monitoring_enabled"] = val != "false"
                elif line.startswith("recent_history_window:"):
                    try:
                        defaults["recent_history_window"] = int(line.split(":", 1)[1].strip())
                    except ValueError:
                        pass
    except OSError:
        pass
    return defaults


def is_trivially_safe(command: str) -> bool:
    """Return True for commands that do not need event capture."""
    tokens = command.strip().split()
    if not tokens:
        return True
    first = tokens[0].lower()
    if first in SAFE_FIRST_TOKENS:
        return True
    if first == "git" and len(tokens) > 1 and tokens[1].lower() in SAFE_GIT_SUBCMDS:
        return True
    return False


def get_command_family(command: str):
    """Return risky family name if command matches, else None."""
    cmd_lower = command.lower()
    for pat in RISKY_FAMILY_PATTERNS:
        if pat in cmd_lower:
            return pat
    return None


def classify_trigger(command: str, combined_output: str, exit_code) -> str | None:
    """
    Classify the monitor_trigger value.
    Returns one of: "hard_failure" | "soft_failure" | "risky_family" | None
    (retry_detected is checked separately against recent history)
    """
    # Hard failure: non-zero exit
    if exit_code is not None and exit_code != 0:
        return "hard_failure"

    # Risky family: always flag regardless of exit code
    family = get_command_family(command)
    if family:
        return "risky_family"

    # Soft failure: warning-pattern output
    for pat in SOFT_FAILURE_PATTERNS:
        if pat in combined_output:
            return "soft_failure"

    return None


def load_recent() -> list:
    try:
        with open(RECENT_PATH) as f:
            return json.load(f)
    except (OSError, json.JSONDecodeError):
        return []


def is_retry(command: str, recent: list, window: int = 20) -> bool:
    """Return True if same command fingerprint appeared in last `window` events."""
    fingerprint = command.strip()[:80]
    seen = sum(
        1 for e in recent[-window:]
        if e.get("command", "").strip()[:80] == fingerprint
    )
    return seen >= 1


def write_atomic(path: str, data) -> None:
    """Write JSON atomically via temp-file rename."""
    tmp = path + ".tmp"
    with open(tmp, "w") as f:
        json.dump(data, f, indent=2)
    os.replace(tmp, path)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    try:
        raw = sys.stdin.read()
        payload = json.loads(raw) if raw.strip() else {}
    except Exception:
        sys.exit(0)

    try:
        # Only process Bash tool results
        if payload.get("tool_name") != "Bash":
            sys.exit(0)

        command = payload.get("tool_input", {}).get("command", "")

        # Skip trivially safe commands
        if is_trivially_safe(command):
            sys.exit(0)

        # Check monitoring enabled
        config = load_config()
        if not config.get("post_execution_monitoring_enabled", True):
            sys.exit(0)

        # Extract output and exit code from tool_response
        tool_response = payload.get("tool_response", "")
        if isinstance(tool_response, dict):
            combined_output = tool_response.get("content") or tool_response.get("output") or ""
            exit_code = tool_response.get("exit_code")
            if tool_response.get("is_error") and exit_code is None:
                exit_code = 1
        else:
            combined_output = str(tool_response)
            exit_code = None

        # Classify trigger (hard_failure / risky_family / soft_failure)
        trigger = classify_trigger(command, combined_output, exit_code)

        # Override or supplement with retry detection
        recent = load_recent()
        if trigger is None and is_retry(command, recent, config.get("recent_history_window", 20)):
            trigger = "retry_detected"

        # Build event (schema: docs/gotcha-system/schemas/event-schema.md)
        event = {
            "id": str(uuid.uuid4()),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "tool": "Bash",
            "command": command,
            "stdout": combined_output[:4000],
            "stderr": "",
            "exit_code": exit_code,
            "context": {},
            "phase": None,
            "environment": "development",
            # Extension fields for gotcha system
            "monitor_trigger": trigger,
            "command_family": get_command_family(command),
        }

        # Ensure events directory exists
        os.makedirs(EVENTS_DIR, exist_ok=True)

        # Write latest event (atomic)
        write_atomic(LATEST_PATH, event)

        # Update rolling recent history
        summary = {k: event[k] for k in ("id", "command", "exit_code", "timestamp", "monitor_trigger")}
        window = config.get("recent_history_window", 20)
        updated_recent = (recent + [summary])[-window:]
        write_atomic(RECENT_PATH, updated_recent)

    except Exception:
        pass  # Always fail-open

    sys.exit(0)


if __name__ == "__main__":
    main()
