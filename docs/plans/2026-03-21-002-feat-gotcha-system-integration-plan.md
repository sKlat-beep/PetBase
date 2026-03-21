---
title: Gotcha System — Native Integration Plan
type: feat
status: active
date: 2026-03-21
revision: 2
---

# Gotcha System — Native Integration Plan

## Overview

The Gotcha System is a layered failure-prevention and learning infrastructure for Claude Code.
It intercepts commands before execution (preflight), monitors outcomes after execution (post-execution),
and accumulates a ranked registry of known failure patterns with confidence-weighted guidance.

This plan maps all Gotcha System components into the repo's existing patterns — hooks, skills,
agents, orchestration documents, and config files — without creating parallel systems or
duplicating existing lifecycle logic.

**Revision 2 changes:**
- Mutable registry data moved from `.claude/configs/` to `.claude/gotcha/`
- Single canonical skill file; no duplicate command wrapper
- Durable pending approval queue with session-restart semantics defined
- Monitor trigger model widened beyond hard failures to 5 distinct trigger categories

---

## 1. Current Workflow Summary

### How commands are initiated

The user types a message or `/skill-name` in the Claude Code CLI.
Claude reads `CLAUDE.md` → `agents/claude-code.md` → `docs/SYSTEM_RULES.md` + `docs/WORKFLOW.md`.
The agent reads the active phase from `planning/TODO.md`, picks up the current task, and begins executing.

### How planning/orchestration works

Multi-phase plan execution is described in `docs/WORKFLOW.md §3`:
- Phase 1: up to 3 parallel Explore subagents
- Phase 2: cooperative design via `AskUserQuestion`
- Phase 3: collaborative review
- Phase 4: plan file written → `ExitPlanMode`
- Phase 5: automated execution via `superpowers:executing-plans` + `superpowers:subagent-driven-development` + `superpowers:verification-before-completion`

Task lifecycle: `intake → in-progress → [implement] → /ui-review → /privacy-check → test-validator → review → done`

### How agents are invoked

Agents are invoked via the `Agent` tool with `subagent_type`, or via the `/handoff` skill.
`agents/claude-code.md` maintains a conditional trigger table that maps conditions (file types, tags,
task phases) to which specialist agent to invoke.

Active specialist agents: `ui-builder`, `privacy-auditor`, `test-validator`, `firebase-deployer`,
`gotcha-monitor` (spec exists, not yet wired).

### How skills are invoked

Skills are invoked via the `Skill` tool when the user types `/skill-name`.
`skills/SKILL_MAP.yaml` maps domain tags to skill routing.
`skills/REGISTRY.md` is the master index of local + external skills.
Local skill definitions live in `skills/local/<name>/SKILL.md`, mirrored to `.claude/commands/<name>.md`.

### How command execution happens

The `Bash` tool executes shell commands. The `Edit`, `Write`, `Glob`, `Grep` dedicated tools
handle file operations. Claude selects the right tool per `docs/SYSTEM_RULES.md §8` (dedicated tool
preferred over Bash for file ops).

### How results are returned to the user

Claude outputs text directly. Structured agent reports (test-validator, privacy-auditor) are
formatted as tables. Errors are surfaced as inline text with `file:line` references.

### Where logging and errors are handled

- `planning/dev-log.md` — Start/Complete entries per task
- Agent reports — test-validator (PASS/FAIL table), privacy-auditor (field classification table)
- Mistake recovery protocol in `docs/WORKFLOW.md §3` — flag → propose permanent fix → ask user
- `feedback_escalate_recurring_errors.md` memory rule — after 2+ failures from same root cause, stop retrying

### How configuration is loaded and accessed

1. `CLAUDE.md` → `agents/claude-code.md` (read at session start)
2. `.claude/settings.local.json` — hook definitions, MCP server configs, tool permissions
3. `.claude/configs/gotcha-system-config.md` — gotcha YAML config (already present; **read-only, static**)
4. User memory `MEMORY.md` — persisted feedback + project context

---

## 2. File System Layout for Gotcha Runtime State

The gotcha system requires two distinct categories of persistent storage. They must be kept separate:

| Category | Location | Nature | Who writes |
|---|---|---|---|
| Static configuration | `.claude/configs/gotcha-system-config.md` | Read-only at runtime | Human/user only |
| Mutable runtime state | `.claude/gotcha/` | Written by hooks and agents | Hooks, agents |

### `.claude/gotcha/` directory (all mutable state)

```
.claude/gotcha/
  registry.json          ← persistent gotcha entries + preventative rules
  pending.json           ← durable approval queue (survives sessions)
  events/
    latest.json          ← most-recent captured event (overwritten each Bash call)
```

**Why not `.claude/configs/`:** Configs are intended as human-edited, version-controlled settings.
The registry is a living dataset that grows over sessions via user approvals — it belongs in a
separate mutable state directory alongside the event log and pending queue.

**Version control posture:** All three files should be committed to git. The registry is project
knowledge. Pending approvals are project state. Events/latest.json can be gitignored (ephemeral).

---

## 3. Integration Points — Clearly Mapped

### Preflight interception (before command execution)

**Best location:** `.claude/settings.local.json` → `PreToolUse` hooks
**Rationale:** The security-guidance preflight hook is already wired here with the same pattern
(`matcher: "Edit|Write|MultiEdit"`, Python script, 10s timeout). Adding a gotcha preflight hook
alongside it is a zero-friction extension of the existing mechanism.
**Matcher scope:** `Bash` tool (where risky commands run). Security-guidance hook retains its
`Edit|Write|MultiEdit` matcher — no overlap.

### Post-execution event capture (after command execution)

**Best location:** `.claude/settings.local.json` → `PostToolUse` hooks (currently unused slot)
**What the hook does:** Reads tool result from stdin; writes structured event JSON to
`.claude/gotcha/events/latest.json`; classifies event and sets `monitor_trigger` flag; exits 0 always.
The `monitor_trigger` field is the mechanism by which the hook communicates to the agent layer
whether the monitor should be invoked — without the hook ever calling an agent directly.

### Monitor invocation (post-execution reasoning)

**Best location:** `agents/claude-code.md` conditional trigger table
**Rationale:** The monitor is a Claude agent — it cannot be invoked from a shell hook. All agent
orchestration lives in `claude-code.md`. The monitor is triggered when:
- `latest.json` has `monitor_trigger` set (hook-layer signal), OR
- Agent-layer conditions are met (user language, phase transition, retry detection — see §5)

### Registry lookups

**Best location:** `.claude/commands/gotcha-registry.md` (single canonical skill file)
**No mirror needed:** The gotcha-registry skill is invoked programmatically by agents and
orchestration — not by user slash command. The canonical file lives in `.claude/commands/` because
that is what the `Skill` tool resolves. `skills/REGISTRY.md` references this path directly.
There is no `skills/local/gotcha-registry/SKILL.md` — that would be a verbatim duplicate.

### Pending approval state (cross-turn persistence)

**Location:** `.claude/gotcha/pending.json`
**Semantics:** Described fully in §6 below.

### Confidence + ranking updates (post-result handling)

**Best location:** Post-monitor orchestration step in `agents/claude-code.md`
After gotcha-monitor returns output, `update_learning(outcome)` is called via the gotcha-registry
skill. User confirmation gating per `user_confirmation_required_for_store: true` is enforced here.

### User prompting (gotcha summaries)

**Best location:** `agents/claude-code.md` post-execution section — appended to agent reply.
After monitor returns `known-gotcha` or `new-gotcha-candidate`, the agent formats a `[GOTCHA]` block
and appends it to its response. `no-issue` and `analysis-error` types are silent.

---

## 4. Component-to-Repo Mapping

### Gotcha Monitor Agent

| Attribute | Mapping |
|---|---|
| **Spec file** | `agents/gotcha-monitor/gotcha-monitor.md` (exists) |
| **Wired in** | `agents/claude-code.md` conditional trigger table (to modify) |
| **Invocation** | `Agent` tool with `subagent_type: "gotcha-monitor"` |
| **Trigger source** | `monitor_trigger` field in `.claude/gotcha/events/latest.json` + agent-layer conditions (§5) |
| **Event receipt** | Event data passed inline in invocation prompt; latest.json as secondary reference |
| **Output surfaced** | `[GOTCHA]` block appended to agent reply; silent on `no-issue` |
| **Guardrails** | Never blocks; never auto-stores; returns learning signals only |

### Gotcha Registry Skill

| Attribute | Mapping |
|---|---|
| **Canonical skill file** | `.claude/commands/gotcha-registry.md` (to create — single file, no mirror) |
| **Registry index entry** | `skills/REGISTRY.md` — reference `.claude/commands/gotcha-registry.md` directly |
| **Tag routing entry** | `skills/SKILL_MAP.yaml` — tag: `gotcha` → `gotcha-registry` |
| **Who calls it (agents)** | gotcha-monitor (search_matches, update_learning); claude-code.md (store_gotcha, update_learning) |
| **Who accesses it (hooks)** | Python hooks read `.claude/gotcha/registry.json` directly — no Skill tool call from hooks |
| **Data storage** | `.claude/gotcha/registry.json` |
| **Ranking/confidence updates** | `update_learning(outcome)` called from claude-code.md after user response |

### Preflight / Auto-Prevention Layer

| Attribute | Mapping |
|---|---|
| **Hook definition** | `.claude/settings.local.json` → `PreToolUse` → new entry alongside security-guidance hook |
| **Hook script** | `.claude/hooks/gotcha-preflight.py` (to create) |
| **Matcher** | `"Bash"` |
| **Timeout** | 75ms (`fast_path_timeout_ms` from config) |
| **Fast path** | Load `.claude/gotcha/registry.json` → tokenize command → exact/regex/fingerprint match |
| **Selective path** | Risky families only (deploy, publish, migration, delete/reset, auth/config mutation) |
| **Config read** | Reads `prevention_mode` from `.claude/configs/gotcha-system-config.md`; cached per session |
| **prevention_mode: off** | Returns `allow` immediately, zero evaluation |
| **Warnings vs blocking** | `warn`/`suggest_fix` → appended to statusMessage; `block` → non-zero exit code |
| **Minimum confidence gates** | `minimum_confidence_to_warn: medium` (≥0.45); `minimum_confidence_to_block: very_high` |

---

## 5. Monitor Trigger Model

The v1 trigger (Bash exit ≠ 0 OR stderr) was too narrow — it misses soft failures, user-stated
problems, and high-risk families that often succeed silently then fail downstream.

### Trigger architecture: hook-layer vs agent-layer

Triggers are split across two layers to avoid LLM overhead on the hot path:

**Hook layer** (`.claude/hooks/gotcha-event-capture.py`) sets `monitor_trigger` in the event JSON.
Fast, deterministic, no LLM. The agent reads this field to decide whether to invoke the monitor.

**Agent layer** (`agents/claude-code.md`) applies semantic triggers the hook cannot evaluate:
user language, phase transitions, and retry pattern detection across the session event log.

### Trigger categories

| # | Category | Layer | Condition | Notes |
|---|---|---|---|---|
| 1 | **Hard failure** | Hook | Bash exit ≠ 0 | Original trigger; always fires |
| 2 | **Soft failure** | Hook | exit 0 but stdout/stderr matches warning patterns (`warning:`, `deprecated:`, `could not`, `skipped`, `WARN`) for risky command families | Avoids false positives on noisy-but-safe commands; scoped by command family |
| 3 | **Retry detected** | Hook | Same command fingerprint seen ≥ 2 times in recent history window (20 events, per config) | Retry loops are a reliable signal of an unresolved pattern |
| 4 | **Risky family always-on** | Hook | Command family is `firebase deploy`, `migration`, `schema change`, or `auth mutation` regardless of exit code | These families produce silent gotchas downstream even on success |
| 5 | **User language signal** | Agent | User message contains failure language: "failed", "error", "not working", "broken", "still getting", "keeps happening" | Claude reads the message before executing; fires monitor against most recent event |
| 6 | **Phase transition** | Agent | Task status changes to `blocked` or `review`; or user says "ready to review" | Transition is a natural checkpoint; surfaces any patterns before the next phase |
| 7 | **Session-start pending** | Agent | `.claude/gotcha/pending.json` has non-expired entries at session start | Deferred from prior session; not a post-execution trigger but uses same output path |

**`monitor_trigger` field values written by hook:**
`"hard_failure"` | `"soft_failure"` | `"retry_detected"` | `"risky_family"` | `null`

Agent-layer triggers (5, 6, 7) invoke the monitor directly without requiring a hook-written field.

### Noise suppression

Even with wider triggers, three gates prevent alert fatigue:
1. Monitor only surfaces output when `known-gotcha` (confidence_band ≥ medium) or `new-gotcha-candidate`; `no-issue` is silent
2. `suppression_threshold: 0.30` — entries repeatedly rejected or ignored are suppressed automatically
3. For Trigger 4 (always-on risky families): only surfaces output if matched entry has confidence_band ≥ medium; below threshold is silently logged but not shown

---

## 6. Pending Approval State — Cross-Turn and Cross-Session Persistence

### Problem

When gotcha-monitor returns `new-gotcha-candidate`, the agent asks the user:
> "Add this to the gotcha registry? [yes/no]"

The user may not answer immediately. If context is compacted, or the session ends before the user
responds, the candidate is lost. The registry never learns from it.

### Design: `.claude/gotcha/pending.json`

A durable queue of pending candidates, written to disk before asking the user. Survives context
compaction, session restarts, and multiple concurrent candidates.

**Schema (array of pending entries):**
```
[
  {
    "pending_id": "<uuid>",
    "created_at": <unix_ms>,
    "expires_at": <unix_ms>,          // created_at + (pending_expiry_days * 86400000)
    "event_snapshot": { ... },        // subset of the event that triggered the monitor
    "monitor_output": { ... },        // full typed output from gotcha-monitor
    "status": "awaiting_approval"     // "approved" | "rejected" | "expired"
  }
]
```

**`pending_expiry_days` config field:** Add to `gotcha-system-config.md` alongside existing fields.
Default: 7 days. Expired entries are cleaned up at session start.

**Approval flow:**

```
monitor returns new-gotcha-candidate
    ↓
claude-code.md writes entry to pending.json (status: awaiting_approval)
    ↓
Agent asks user: "Add to gotcha-list? [yes/no]"
    ↓ (user may answer now, or later, or in a future session)
    ↓ YES                              ↓ NO
update status → "approved"        update status → "rejected"
call store_gotcha() via skill     call update_learning(rejected) via skill
remove entry from pending.json    remove entry from pending.json
```

**Session-start check (in `agents/claude-code.md` session startup sequence):**

After reading dev-log.md and TODO.md, check `.claude/gotcha/pending.json`:
- If entries exist with `status: awaiting_approval` and not expired: surface them one at a time
  > "You have a pending gotcha approval from [N hours/days] ago: [summary]. Add to registry? [yes/no]"
- If entries exist but expired: update status to `"expired"`, call `update_learning(expired)`, remove

**Context compaction safety:** Because the pending entry is written to disk before asking the user,
context loss between the ask and the answer is safe — the candidate is retrieved from disk at next
session start, not from conversation memory.

**Concurrency:** Multiple `new-gotcha-candidates` in the same session are queued in pending.json
and surfaced sequentially after the current task completes. Never interrupt mid-task execution
with approval prompts.

---

## 7. Minimal Change Plan — File by File

### Files to MODIFY (5 files)

#### `.claude/settings.local.json`
- **Add:** `PreToolUse` entry — matcher `"Bash"`, runs `.claude/hooks/gotcha-preflight.py`, timeout 75ms
- **Add:** `PostToolUse` entry — matcher `"Bash"`, runs `.claude/hooks/gotcha-event-capture.py`, timeout 50ms
- **Unchanged:** Security-guidance `PreToolUse` entry on `Edit|Write|MultiEdit` — no modification

#### `agents/claude-code.md`
- **Add to conditional trigger table:** gotcha-monitor row — condition: `latest.json` has
  non-null `monitor_trigger` OR agent-layer triggers 5/6/7 fire
- **Add post-monitor orchestration:** after monitor returns, handle each output type, write to
  pending.json for new candidates, call update_learning for known-gotcha responses
- **Add session-startup step:** check `.claude/gotcha/pending.json` for awaiting approvals
- **Add gotcha system to tools table:** reference gotcha-registry skill + gotcha-monitor agent
- **Changes are additive only:** wrapped in `<!-- GOTCHA SYSTEM START/END -->` comment delimiters

#### `skills/SKILL_MAP.yaml`
- **Add:** `gotcha: gotcha-registry` entry

#### `skills/REGISTRY.md`
- **Add:** gotcha-registry entry pointing to `.claude/commands/gotcha-registry.md`

#### `docs/WORKFLOW.md`
- **Add:** gotcha monitoring as conditional post-execution step in task lifecycle section
- **Add:** pending approval check to session startup sequence

#### `.claude/configs/gotcha-system-config.md`
- **Add:** `pending_expiry_days: 7` field (only additive change; all existing fields unchanged)

### Files to CREATE (5 files — no duplicates)

#### `.claude/gotcha/registry.json`
- Initial empty registry: `{"version": "1.0", "gotchas": [], "preventative_rules": [], "last_updated": null}`
- Mutable; committed to git; written by gotcha-registry skill and gotcha-preflight.py

#### `.claude/gotcha/pending.json`
- Initial empty queue: `[]`
- Written by claude-code.md orchestration (not by hooks); read at session startup

#### `.claude/hooks/gotcha-preflight.py`
- Reads `prevention_mode` from gotcha-system-config.md
- Loads `.claude/gotcha/registry.json`
- Tokenizes command; performs deterministic fast-path lookup; selective-path for risky families
- Exits 0 (allow), prints warning message (warn), or exits non-zero (block)
- On any Python error: exits 0 (fail-open)

#### `.claude/hooks/gotcha-event-capture.py`
- Reads tool result from stdin (Claude Code PostToolUse hook protocol)
- Writes structured event to `.claude/gotcha/events/latest.json`
- Sets `monitor_trigger` field based on Trigger categories 1–4
- Exits 0 unconditionally; never blocks; never throws

#### `.claude/commands/gotcha-registry.md`
- **Single canonical skill file** — not mirrored anywhere else
- Defines: purpose, 5 core operations (search_matches, evaluate_preflight, store_gotcha,
  update_learning, list_preventative_rules), data paths, usage examples
- Referenced from `skills/REGISTRY.md` and `skills/SKILL_MAP.yaml`
- User-invokable as `/gotcha-registry` but primarily used by agents programmatically

### Files NOT to create

- `skills/local/gotcha-registry/SKILL.md` — **would be a verbatim duplicate of `.claude/commands/gotcha-registry.md`**; omitted
- `.claude/configs/gotcha-registry-data.json` — **replaced by `.claude/gotcha/registry.json`**
- `.claude/gotcha/events/latest.json` — created at runtime by hook; not checked into git

---

## 8. Execution Lifecycle: Before vs After

### Before (current)

```
User message
    ↓
PreToolUse: security-guidance (Edit|Write|MultiEdit)
    ↓
Tool executes
    ↓
[No PostToolUse hook]
    ↓
Agent reads output → responds to user
```

### After (gotcha system integrated)

```
Session start
    ↓
claude-code.md reads pending.json                           ← NEW
  → if pending approvals exist: surface each to user

User message
  → if message contains failure language (Trigger 5):      ← NEW (agent-layer)
      queue monitor against most-recent event

PreToolUse: security-guidance (Edit|Write|MultiEdit)        ← unchanged
PreToolUse: gotcha-preflight (Bash, 75ms)                   ← NEW
    → if prevention_mode=off: allow immediately
    → tokenize command
    → fast-path: exact/regex/fingerprint match vs registry.json
    → selective-path (risky families only): history check + preventative rules
    → returns: allow | warn (statusMessage) | block (exit non-zero)

Tool executes (if not blocked)

PostToolUse: gotcha-event-capture (Bash, 50ms)              ← NEW
    → write latest.json with monitor_trigger field
    → Trigger 1: exit ≠ 0                → "hard_failure"
    → Trigger 2: exit 0 + warning output → "soft_failure"
    → Trigger 3: command seen ≥2x        → "retry_detected"
    → Trigger 4: risky family            → "risky_family"
    → else: monitor_trigger = null
    → exits 0 always

Agent reads tool output
    ↓
If monitor_trigger ≠ null                                   ← NEW (in claude-code.md)
OR phase transition to blocked/review (Trigger 6):
    → invoke gotcha-monitor agent with event context
    → monitor queries registry via gotcha-registry skill
    → returns typed output:
        known-gotcha      → format [GOTCHA] block → update_learning
        new-gotcha-candidate → write to pending.json → ask user
        no-issue          → silent
        analysis-error    → silent (log only)
    ↓
If new-gotcha-candidate prompt answered YES:
    → remove from pending.json → store_gotcha() via skill
If answered NO:
    → remove from pending.json → update_learning(rejected)
If not answered (end of turn):
    → remains in pending.json → surfaced at next session start

Agent responds to user (with optional [GOTCHA] block)
```

---

## 9. Performance and Safety Plan

### Preflight latency

- Deterministic-first: command tokenization + JSON file lookup, no LLM, no network
- Pre-filter: commands with first token in `{git, ls, echo, cat, grep, find, head, tail, pwd, which, env}` return `allow` in <5ms without touching registry
- 75ms hard timeout: hook exits 0 (allow) on timeout — never fail-closed
- Selective path only activates for risky families (deploy, publish, migration, delete, auth, config)
- `preflight_cache_ttl_seconds: 300` — registry.json loaded once per 5 minutes via module-level cache

### Deep analysis restricted to post-execution

- Monitor invoked only after tool execution; never in hot path
- Trigger conditions keep quiet runs silent: `no-issue` output never shown to user
- Monitor subagent can run with `run_in_background: true` for non-blocking analysis when appropriate

### Turning prevention off cleanly

| Scope | Action | Effect |
|---|---|---|
| Preflight only | `preflight_enabled: false` in config | Hook returns `allow` immediately; event capture continues |
| Monitoring only | `post_execution_monitoring_enabled: false` in config | Monitor never invoked; hooks still capture events |
| Both off | `prevention_mode: off` in config | Preflight pass-through; monitor skipped |
| Nuclear off | Remove hook entries from `settings.local.json` | System reverts exactly to pre-integration state; no code change needed |

### Safe default mode

- `prevention_mode: advisory` — warns but never blocks; user sees guidance, command proceeds
- `minimum_confidence_to_warn: medium` — only high-signal patterns surface
- `minimum_confidence_to_block: very_high` — blocking is effectively inert in advisory mode
- `user_confirmation_required_for_store: true` / `user_confirmation_required_for_modify: true` — registry never mutated without explicit user "yes"
- All triggers produce `no-issue` on empty registry — zero false positives on day 1

---

## 10. Risks and Edge Cases

### Risk 1: Preflight hook adds latency to ALL Bash commands

**Mitigation:** Pre-filter fast-passes trivially-safe commands in <5ms. 75ms hard cap exits 0 on
timeout — never holds up execution. Selective path for risky families only.

### Risk 2: PostToolUse hook event overwrite race

**Description:** latest.json is overwritten on every Bash call; monitor may receive stale event if
invocation is delayed.
**Mitigation:** Event includes unique ID (timestamp + nonce) + the command string. Monitor receives
event data inline in its invocation prompt — it does not poll latest.json. File is secondary reference.

### Risk 3: Duplicate monitor invocation

**Definitive design:** Monitor invoked ONLY from claude-code.md orchestration, never from a hook.
Hooks are limited to fast data capture + `monitor_trigger` flagging. One invocation path, no duplicates.

### Risk 4: Hook vs Skill registry access divergence

**Description:** Hooks read registry.json directly (Python JSON). Skill reads via structured
operations. If schema drifts, they diverge.
**Mitigation:** `registry.json` schema is versioned (top-level `"version"` field). Both hook and
skill validate schema version at load. Skill is the only writer — hooks are read-only on registry.json.
Hooks only write latest.json and pending.json.

### Risk 5: Pending.json grows unbounded

**Mitigation:** `pending_expiry_days` config field caps entries. Session-startup cleanup removes
expired entries. Each monitor invocation produces at most one pending entry. Rejected entries are
removed immediately. In practice, the queue stays near-empty.

### Risk 6: Pending entry asked twice

**Description:** User is in a session, pending entry is written, context compacts, session restarts —
user is asked again even though they may have answered in the compacted context.
**Mitigation:** Status field (`awaiting_approval` / `approved` / `rejected`) is written to disk
before asking. If the answer was committed to disk, entry is removed before next session start.
If context compacted before answer committed: entry remains `awaiting_approval` and user is asked
once more — this is correct behavior, not a bug. A duplicate ask is preferable to a lost candidate.

### Risk 7: Trigger 5 (user language) fires too broadly

**Description:** The user saying "this is broken" in a non-technical context could invoke the monitor
unnecessarily.
**Mitigation:** Trigger 5 requires a recent event in latest.json (within the last N seconds, configurable).
If the session has no recent Bash events, trigger 5 does not fire. Monitor still returns `no-issue`
on empty registry — no user-visible noise.

### Risk 8: Trigger 4 (risky family always-on) causes alert fatigue

**Mitigation:** Trigger 4 produces monitor output only if matched entry has `confidence_band ≥ medium`.
On empty registry, monitor returns `no-issue` silently. The always-on trigger is a learning accelerator,
not a noise generator.

### Risk 9: `agents/claude-code.md` changes break session startup

**Mitigation:** All gotcha additions are wrapped in `<!-- GOTCHA SYSTEM START -->` / `<!-- GOTCHA SYSTEM END -->` delimiters. Changes are purely additive. Removing the delimited block fully reverts behavior.

### Risk 10: `.claude/gotcha/registry.json` corruption

**Mitigation:** gotcha-registry skill writes via atomic temp-file rename. Python hooks are read-only
on registry.json. File is committed to git for recovery. Malformed JSON causes graceful fail-open
(hooks return `allow`; skill returns empty results with `analysis-error`).

---

## 11. Recommended Rollout Approach

### Phase A — Data layer + skill (zero behavior change)

1. Create `.claude/gotcha/` directory structure with empty `registry.json` and `pending.json`
2. Create `.claude/commands/gotcha-registry.md` (canonical skill definition)
3. Update `skills/REGISTRY.md` and `skills/SKILL_MAP.yaml`

**Validation:** `/gotcha-registry` skill is invokable; returns empty registry; no hooks wired.

### Phase B — Passive event capture

1. Create `.claude/hooks/gotcha-event-capture.py`
2. Add `PostToolUse` Bash hook to `.claude/settings.local.json`

**Validation:** Run Bash commands; confirm `latest.json` written with correct `monitor_trigger` values. No monitor invocations yet.

### Phase C — Monitor invocation (advisory, error-triggered only)

1. Add gotcha-monitor conditional trigger (Trigger 1 only) to `agents/claude-code.md`
2. Add post-monitor orchestration + pending.json write step to `agents/claude-code.md`
3. Add session-startup pending check to `agents/claude-code.md`
4. Update `docs/WORKFLOW.md`

**Validation:** Trigger a Bash failure; confirm monitor invoked; confirm `[GOTCHA]` block on match; confirm `no-issue` is silent; confirm pending.json written for new candidates.

### Phase D — Wider triggers (Triggers 2–6)

1. Update `gotcha-event-capture.py` to classify Triggers 2–4
2. Update `agents/claude-code.md` trigger table to include Triggers 5–6

**Validation:** Trigger each category deliberately; confirm monitor fires at right times; confirm
clean runs stay silent.

### Phase E — Preflight hook (prevention layer)

1. Create `.claude/hooks/gotcha-preflight.py`
2. Add `PreToolUse` Bash hook to `.claude/settings.local.json`
3. Add `pending_expiry_days: 7` to `.claude/configs/gotcha-system-config.md`

**Validation:** Confirm warning appears (but does not block) for a risky command with a matching registry entry. Confirm trivially-safe commands complete in <5ms.

### Phase F — Organic registry population

As real failures surface through Phases C–D, approve the first `new-gotcha-candidate` entries.
The registry populates from real project failures — no manual seeding required.

---

## Acceptance Criteria

- [ ] `/gotcha-registry` skill is invokable; all 5 operations reachable; empty registry returns cleanly
- [ ] No gotcha data written to `.claude/configs/` — all runtime state in `.claude/gotcha/`
- [ ] No duplicate skill definition files (single canonical at `.claude/commands/gotcha-registry.md`)
- [ ] PostToolUse hook writes valid event JSON with correct `monitor_trigger` for all 4 hook-layer triggers
- [ ] Monitor invoked for all 7 trigger categories; returns typed output in ≤30s
- [ ] `no-issue` and `analysis-error` output is completely silent to user
- [ ] `known-gotcha` surfaces formatted `[GOTCHA]` block in agent reply
- [ ] `new-gotcha-candidate` written to pending.json before user is asked
- [ ] Pending.json entry survives session restart; user is prompted at next session start
- [ ] User "yes" → store_gotcha + remove from pending; user "no" → update_learning(rejected) + remove
- [ ] Nothing stored in registry without explicit user "yes"
- [ ] `prevention_mode: off` silences all behavior cleanly without code changes
- [ ] Preflight hook completes within 75ms for normal commands; trivially-safe commands in <5ms
- [ ] Existing security-guidance `PreToolUse` hook is unaffected
- [ ] `agents/claude-code.md` session startup unaffected (gotcha block is delimited and additive)

---

## Sources & References

- Agent entry point: `agents/claude-code.md`
- Hook infrastructure: `.claude/settings.local.json`
- Gotcha system config: `.claude/configs/gotcha-system-config.md`
- Workflow lifecycle: `docs/WORKFLOW.md §2-3`
- System rules: `docs/SYSTEM_RULES.md`
- Skill routing: `skills/SKILL_MAP.yaml`, `skills/REGISTRY.md`
- Local skill pattern: `skills/local/intake/SKILL.md`
- Existing preflight hook pattern: security-guidance hook in `.claude/settings.local.json`
- Gotcha system specs: `docs/gotcha-system/architecture.md`, `docs/gotcha-system/auto-prevention-mode.md`
- Gotcha schemas: `docs/gotcha-system/schemas/`
- Planning docs: `planning/gotcha-system/workflow-interceptor.md`, `planning/gotcha-system/preflight-interceptor.md`, `planning/gotcha-system/prevention-orchestrator.md`
- Minimal specs: `agents/gotcha-monitor/gotcha-monitor-minimal.md`, `skills/gotcha-registry/gotcha-registry-minimal.md`
- Ranking model: `skills/gotcha-registry/ranking-model.md`
- Confidence learning: `skills/gotcha-registry/confidence-learning.md`
