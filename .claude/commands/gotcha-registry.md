# /gotcha-registry Skill

**Purpose:** Manage the Gotcha Registry — store, retrieve, rank, and update confidence for known
failure patterns. Called by the gotcha-monitor agent and by claude-code.md orchestration.
Not intended for direct user invocation in normal workflow.

**Data file:** `.claude/gotcha/registry.json`
**Schemas:** `docs/gotcha-system/schemas/`

---

## Operations

When this skill is invoked, the user (or calling agent) must specify the operation name and provide
the required input. Execute the operation by reading/writing `.claude/gotcha/registry.json`
directly using the Read, Edit, and Write tools. Never use Firestore or any external storage.

---

### 1. `search_matches(event)`

**Input:** A post-execution event object (see `docs/gotcha-system/schemas/event-schema.md`)
**Output:** A `match-result` object (see `docs/gotcha-system/schemas/match-result-schema.md`)

**Steps:**
1. Read `.claude/gotcha/registry.json`.
2. Extract `command`, `stdout`, `stderr`, `exit_code`, `command_family` from the event.
3. For each gotcha entry in `registry.gotchas`:
   a. **Deterministic match (weight 0.35):** Check if any `signature.patterns[]` substring
      appears in the command. Check `signature.regex_patterns[]` via regex match.
   b. **Context match (weight 0.15):** Award bonus if `context_tags` overlap with
      `command_family`, `phase`, or `environment` from the event.
   c. **Historical weight (weight 0.15):** Use `confidence_profile.fix_success_count` /
      (`fix_success_count` + `fix_failure_count`) as fix success rate. Apply
      `suppression_threshold: 0.30` — skip entries with confidence < 0.30.
   d. Compute `rank_score` = deterministic_strength × 0.35 + context_score × 0.15 +
      fix_success_rate × 0.15 + `confidence_profile.confidence` × 0.35.
4. Sort by `rank_score` descending. Return top 3 matches.
5. For each match include: `gotcha_id`, `name`, `match_type`, `rank_score`, `confidence`,
   `confidence_band`, `recommended_fix`, `preventative_rule`, `ranking_explanation`.
6. Return `{ "matched": true|false, "matches": [...], "learning_updated": false }`.

---

### 2. `evaluate_preflight(preflight_event, prevention_mode)`

**Input:** A preflight event (see `docs/gotcha-system/schemas/preflight-event-schema.md`)
  and the current `prevention_mode` string.
**Output:** A `preflight-result` object (see `docs/gotcha-system/schemas/preflight-result-schema.md`)

**Steps:**
1. Read `.claude/gotcha/registry.json`.
2. Run `search_matches` on the preflight event (treat as an event).
3. Check `registry.preventative_rules[]` for rules whose `applies_to_command_families` or
   `condition` matches the command.
4. Determine action using the plan's blocking rules:
   - `block` only if: `prevention_mode == "strict"` AND `confidence >= very_high (0.85)` AND
     `rule_type == "blocking"`.
   - `warn` / `suggest_fix` otherwise if confidence >= `minimum_confidence_to_warn`.
   - `allow` if no match or confidence below threshold.
5. Return preflight-result with `action`, `matched_gotcha_id`, `confidence`, `confidence_band`,
   `reasoning_summary`, `recommended_next_step`, `override_allowed: true` (unless blocking strict).

---

### 3. `store_gotcha(entry)`

**Input:** A complete gotcha-entry object (see `docs/gotcha-system/schemas/gotcha-entry-schema.md`)
  with at minimum: `name`, `description`, `root_cause`, `recommended_fix`, `signature`.

**REQUIRES:** `user_confirmation_required_for_store: true` is set in config — confirm with user
  before writing. Never auto-store.

**Steps:**
1. Read `.claude/gotcha/registry.json`.
2. Generate `gotcha_id` as `"gotcha-" + slug(name) + "-" + timestamp_ms`.
3. Set `created_at` and `updated_at` to current ISO-8601 timestamp.
4. Set `version: 1`.
5. Initialize `confidence_profile` with `confidence: 0.50` (starting baseline), all counters at 0.
6. Initialize `effectiveness_metrics` with all counters at 0.
7. Append to `registry.gotchas[]`.
8. Update `registry.last_updated` to current ISO-8601 timestamp.
9. Write back to `.claude/gotcha/registry.json` atomically (write to temp path, then rename
   using Bash: `mv registry.json.tmp registry.json`).
10. Return the stored entry with assigned `gotcha_id`.

---

### 4. `update_learning(outcome)`

**Input:** An outcome object:
```
{
  "gotcha_id": "string",          // required unless "new_candidate_rejected"
  "outcome_type": "fix_succeeded" | "fix_failed" | "user_accepted" | "user_rejected"
                | "warning_accepted" | "warning_ignored" | "false_positive"
                | "new_candidate_rejected" | "new_candidate_expired",
  "pending_id": "string|null"     // for clearing pending.json entries
}
```

**Steps:**
1. Read `.claude/gotcha/registry.json`.
2. Find the gotcha entry by `gotcha_id`. If not found and `outcome_type` is rejection/expiry,
   just clean up `pending.json` and return.
3. Update the matching `confidence_profile` counters:
   - `fix_succeeded` → increment `fix_success_count`, set `last_success_at`
   - `fix_failed` → increment `fix_failure_count`
   - `user_accepted` → increment `acceptance_count`
   - `user_rejected` → increment `rejection_count`
   - `warning_accepted` → increment `warning_accepted_count`
   - `warning_ignored` → increment `warning_ignored_count`
   - `false_positive` → increment `false_positive_count`
4. Recalculate `confidence`:
   - Base: 0.50
   - +0.10 per `fix_success_count` (cap at +0.30)
   - +0.05 per `acceptance_count` (cap at +0.20)
   - −0.08 per `rejection_count` (floor 0.10)
   - −0.10 per `false_positive_count` (floor 0.10)
   - −0.05 per `warning_ignored_count` (floor 0.10, only first 3)
   - Clamp result to [0.10, 0.95].
5. Update `confidence_band` from new value: < 0.45 → low, 0.45–0.75 → medium, ≥ 0.75 → high.
6. Update `updated_at` and `last_seen_at` to current timestamp.
7. Write back registry atomically.
8. If `pending_id` is provided, remove matching entry from `.claude/gotcha/pending.json`.

---

### 5. `list_preventative_rules(command_family, environment)`

**Input:** Optional `command_family` string and optional `environment` string (filters).
**Output:** Array of matching preventative rule objects.

**Steps:**
1. Read `.claude/gotcha/registry.json`.
2. Filter `registry.preventative_rules[]` by:
   - `applies_to_command_families` contains `command_family` (if provided)
   - `applies_to_environments` contains `environment` (if provided), or is empty (applies to all)
3. Sort by `severity` descending (critical > high > medium > low).
4. Return filtered array.

---

## Notes

- **No Firestore.** This is Claude Code tooling state, not app data.
- **Atomic writes.** Always write to a temp file and rename to avoid corruption.
  Use `Bash: mv .claude/gotcha/registry.json.tmp .claude/gotcha/registry.json`
  after writing the temp file with the Write tool.
- **Fail-open.** If registry.json is missing or malformed, return empty results rather than erroring.
- **Confidence floor 0.10.** Never let confidence drop to zero — entries remain but are suppressed
  by the `suppression_threshold: 0.30` in the preflight hook.
- **Deduplication is agent-side.** Track `gotcha_id`s shown in the current conversation in memory
  to avoid repeat surfacing. Only re-surface if: context changed significantly, confidence
  increased since last shown, or fix was applied and failed again.
