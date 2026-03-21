# Claude Code - Execution Role

## Purpose
Primary implementation agent. Executes approved plans with minimal token usage.

## Required Reads (before any code work)
- `docs/SYSTEM_RULES.md`
- `docs/WORKFLOW.md`
- `planning/TODO.md` (read only the active phase section, not the full file)

## Mandatory Behaviors
- Use jcodemunch for symbol-level navigation (repo: `local/PetBase`).
- Use `/intake` to create new tasks in `planning/TODO.md` (place under appropriate phase header).
- Use `/handoff` when handing off to another agent.
- Dev-log policy: entries at Start and Complete only. Today's work in `planning/dev-log.md`.
- On task completion: move full task body from TODO.md to `planning/archive/dev-log-completed.md`.
- Daily rotation: at session start, if `dev-log.md` has entries from a previous date, append them to the archive and clear the file.
- No `git push`.

## Plugin Integration (Hybrid Workflow)

**Workflow backbone:** superpowers drives the flow (brainstorm → plan → execute → verify).

**Specialized review passes (CE agents):** kieran-typescript-reviewer, security-sentinel, performance-oracle, pattern-recognition-specialist.

**Auto-triggers:**
- **code-simplifier** — runs after implementation tasks
- **feature-dev** — triggers for feature requests
- **security-guidance** — PreToolUse hook checks for XSS, eval, command injection before edits
- **typescript-lsp** — real-time type diagnostics for app/ and functions/
- **context7** — live documentation lookup (React 19, Firebase, Tailwind) via CE plugin MCP
- **stitch-kit** — UI design review, accessibility auditing, and design system management

## Token Efficiency Rules
- **Never re-read a file already read in this session.** Reference the earlier read from context instead.
- **Use `offset`/`limit` for large files.** Grep for the target section first, then read only that range.
- **jcodemunch before raw reads.** `get_repo_outline` → `get_file_outline` → `get_symbol`. Only read raw files when no symbol exists for what you need.

---

## ce:work Phase Overrides (PetBase)

When executing via `/ce:work`, PetBase-specific gates override ce:work's defaults.

### Before Phase 2 — Explore (Before Touching Files)
- **Any large context file** (SocialContext, firestoreService, AuthContext, Layout, PetFormModal) →
  Launch a `feature-dev:code-explorer` agent first to understand the data flow.
- **Any Firestore schema change or new denormalized field** →
  Launch `performance-oracle` + `data-integrity-guardian` agents before writing.
- **Any library or API not already in context** →
  Query `context7` for live documentation before implementing.

### During Phase 3 — Implement
- security-guidance (PreToolUse) hook fires automatically on every Edit/Write.
- After each TypeScript file group is complete → invoke `kieran-typescript-reviewer`.
- After each Firestore-touching file change → invoke `security-sentinel` (not just at delivery).

### Phase 4 — Quality / Delivery (ALL must pass, in order)
1. `superpowers:verification-before-completion` — run build commands, confirm output.
2. `/ui-review` — for every modified `.tsx` file with visual changes (Stitch visual + a11y).
3. `/privacy-check` — for every Firestore read/write change.
4. `test-validator` agent — `npm run build` in `app/` AND `functions/`, both must exit 0.
5. **Preview verification** — `preview_start` → `preview_screenshot` → `preview_console_logs`.
   - Zero console errors required. Attach screenshot as proof before marking done.
6. `code-simplifier` agent — simplify/refine all new code (runs last).

---

## Conditional Tool Triggers

| Condition | Invoke |
|-----------|--------|
| Modifying any large context or service file | `feature-dev:code-explorer` agent before touching |
| Adding / changing Firestore fields or schema | `performance-oracle` + `data-integrity-guardian` |
| Any new TypeScript interfaces or implementations | `kieran-typescript-reviewer` after implementation |
| Any new or modified `.tsx` with visual output | `/ui-review` + `preview_screenshot` at delivery |
| Any PII field read/write change | `/privacy-check` + `privacy-auditor` agent |
| Any auth boundary, security rule, or token change | `security-sentinel` |
| Unknown library or newly added dependency | `context7` docs lookup before implementing |
| Designing a new UI screen or major component | `stitch-orchestrator` or `stitch-ui-design-spec-generator` |
| Performance concern or N+1 query suspected | `performance-oracle` |
| Codebase consistency check needed | `pattern-recognition-specialist` |
| Bash event with `monitor_trigger` ≠ null in latest.json | `gotcha-monitor` (see Gotcha System section) |
| User message contains failure language ("failed", "error", "not working", "broken", "keeps happening") | `gotcha-monitor` against most recent event |
| Task status transitions to `blocked` or `review` | `gotcha-monitor` as transition checkpoint |

---

<!-- GOTCHA SYSTEM START -->
## Gotcha System

The Gotcha System intercepts command failures and learns from them. It is advisory by default —
it warns but never blocks unless `prevention_mode: strict` is set in the config.

### Session Startup — Pending Approval Check

**Add this as step 6 of the Session Startup sequence** (after MEMORY.md check):

6. **Read `.claude/gotcha/pending.json`** — if any entries have `status: "awaiting_approval"` and
   `expires_at > now`:
   - Surface each one to the user before proceeding to task work:
     > "You have a pending gotcha approval from [N hours/days ago]: **[name]**
     > [description]. Add to the gotcha registry? **yes** / **no** / **skip**"
   - On **yes**: call `/gotcha-registry` → `store_gotcha(candidate)` then `update_learning({outcome_type: "user_accepted", pending_id})` and remove the entry.
   - On **no**: call `/gotcha-registry` → `update_learning({outcome_type: "user_rejected", pending_id})` and remove the entry.
   - On **skip**: leave in pending.json; will resurface next session.
   - Entries with `expires_at < now`: call `update_learning({outcome_type: "new_candidate_expired", pending_id})` and remove.

### Monitor Invocation Procedure

When a Gotcha Monitor trigger fires (any of the three rows in the Conditional Tool Triggers table):

1. **Read `.claude/gotcha/events/latest.json`** to get the event data.
   - If file doesn't exist or `monitor_trigger` is null and trigger is hook-based: skip monitor.
2. **Deduplication check:** If this session has already surfaced a `[GOTCHA]` block for this
   event's `gotcha_id`, and neither the context nor the command has changed, skip re-invocation.
   Track shown `gotcha_id`s in memory within the conversation (no file needed).
3. **Invoke gotcha-monitor** as a general-purpose agent:
   - Pass the event JSON and the instruction to follow `agents/gotcha-monitor/gotcha-monitor.md`.
   - Include: "Query the registry using `/gotcha-registry` → `search_matches(event)`.
     Return structured output with type, summary, risk, confidence, recommended_fix."
4. **Handle output by type:**
   - `no-issue` or `analysis-error` → silent, no user output.
   - `known-gotcha` (confidence_band ≥ medium) → surface `[GOTCHA]` block (see format below).
     Then call `/gotcha-registry` → `update_learning({outcome_type: "warning_accepted", gotcha_id})`.
   - `new-gotcha-candidate` → write to pending.json, then ask user (see Approval Flow).

### [GOTCHA] Block Format

```
---
[GOTCHA] {name}
Risk: {risk}  |  Confidence: {confidence_band} ({confidence:.2f})
{description}

Recommended fix: {recommended_fix}
{ranking_explanation}
---
```

Append this block after the main agent response. Never interrupt mid-execution with it.

### Approval Flow for New Candidates

When monitor returns `new-gotcha-candidate`:

1. Generate `pending_id` = `"pending-" + timestamp_ms`.
2. Write entry to `.claude/gotcha/pending.json` **before** prompting the user:
   ```json
   {
     "pending_id": "...",
     "created_at": "ISO-8601",
     "expires_at": "ISO-8601 (created_at + pending_expiry_days)",
     "event_snapshot": { "command": "...", "exit_code": ..., "monitor_trigger": "..." },
     "monitor_output": { full typed output from gotcha-monitor },
     "status": "awaiting_approval"
   }
   ```
3. Ask user:
   > "[GOTCHA CANDIDATE] **{name}**: {description}
   > Add to the gotcha registry? **yes** / **no**"
4. On **yes**: call `/gotcha-registry` → `store_gotcha(candidate_entry)`, then
   `update_learning({outcome_type: "user_accepted", pending_id})`. Remove from pending.json.
5. On **no**: call `/gotcha-registry` → `update_learning({outcome_type: "user_rejected", pending_id})`.
   Remove from pending.json.
6. If user does not respond before conversation ends: entry stays in pending.json.
   It will be surfaced at next session startup.

### Deduplication Rules

Within a single conversation, track shown `gotcha_id`s in memory.
Suppress re-surfacing the same gotcha UNLESS:
- The command was retried and failed again (new event with same trigger).
- The recommended fix was applied and failed (outcome: `fix_failed`).
- Confidence increased significantly (new learning updated the entry).

<!-- GOTCHA SYSTEM END -->
