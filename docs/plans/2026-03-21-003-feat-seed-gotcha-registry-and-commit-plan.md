---
title: Seed Gotcha Registry + Commit Gotcha System
type: feat
status: active
date: 2026-03-21
---

# Seed Gotcha Registry + Commit Gotcha System

## Overview

Two-part task:
1. Seed `.claude/gotcha/registry.json` with known PetBase failure patterns so preflight and the
   monitor provide value immediately, rather than waiting for organic registry growth.
2. Commit the full Gotcha System implementation (all files created/modified in this session) as
   a single clean commit and merge to main.

---

## Part 1 — Registry Seed Entries

Each entry targets a pattern with a real history of failures or explicit rules in this repo.
Sources: `planning/dev-log.md`, `docs/WORKFLOW.md §5`, feedback memories.

### Entry 1 — `deploy-before-build-validated`
- **Pattern:** `firebase deploy` (any variant)
- **Root cause:** Deploying before both app/ and functions/ builds pass causes runtime errors
  requiring a rollback or hotfix deploy. The delivery gate in `docs/WORKFLOW.md §2` mandates
  test-validator passage before any deploy.
- **Fix:** `npm --prefix app run build && npm --prefix functions run build` — both must exit 0.
- **Preventative rule type:** `advisory`
- **Severity:** `high`
- **Starting confidence:** `0.80` (high — explicit workflow rule, previously caused rollbacks)
- **Trigger families:** `firebase`

### Entry 2 — `npm-command-missing-prefix`
- **Pattern:** `npm run ` at repo root without `--prefix` (i.e., bare `npm run build`, `npm run dev`)
- **Root cause:** Repo root has no package.json scripts. Running bare `npm run *` from root exits
  non-zero with "missing script" or runs wrong workspace. Must use `npm --prefix app` or
  `npm --prefix functions`.
- **Fix:** `npm --prefix app run build` or `npm --prefix functions run build`
- **Preventative rule type:** `advisory`
- **Severity:** `medium`
- **Starting confidence:** `0.70`

### Entry 3 — `cd-and-git-chain`
- **Pattern:** `cd ... && git` or `cd ...; git` — chaining directory change with git command
- **Root cause:** Feedback memory `feedback_git_commands.md` — shell state does not persist
  between Bash calls; `cd + git` chains fail silently or affect only the subprocess.
  Use `git -C /path` instead.
- **Fix:** Replace `cd /path && git <cmd>` with `git -C /path <cmd>`
- **Preventative rule type:** `advisory`
- **Severity:** `medium`
- **Starting confidence:** `0.75` (explicit feedback rule, has caused incorrect git operations)

### Entry 4 — `cd-and-npm-chain`
- **Pattern:** `cd ... && npm` or `cd ...; npm` — chaining directory change with npm/node/npx
- **Root cause:** Feedback memory `feedback_bash_commands.md` — same compound-cd anti-pattern.
  Use `npm --prefix /path` instead.
- **Fix:** Replace `cd app && npm run build` with `npm --prefix app run build`
- **Preventative rule type:** `advisory`
- **Severity:** `medium`
- **Starting confidence:** `0.75`

### Entry 5 — `git-push-without-approval`
- **Pattern:** `git push` (any form that pushes to remote)
- **Root cause:** `docs/WORKFLOW.md §5` / `agents/claude-code.md` — "No git push without asking
  for approval." Pushing without confirmation can publish unreviewed commits or overwrite upstream.
- **Fix:** Ask user for explicit approval before running `git push`.
- **Preventative rule type:** `advisory` (would become `blocking` in strict mode)
- **Severity:** `high`
- **Starting confidence:** `0.85` (explicit system rule)

### Entry 6 — `git-force-push`
- **Pattern:** `git push --force` or `git push -f`
- **Root cause:** Destructive operation — can overwrite upstream history. SYSTEM_RULES
  prohibits destructive git ops without confirmation. Especially dangerous on main.
- **Fix:** Use `git push --force-with-lease` if forced push is truly required; confirm with user first.
- **Preventative rule type:** `advisory`
- **Severity:** `critical`
- **Starting confidence:** `0.90`

---

## Part 2 — Commit Scope

All files created or modified in this session as part of the Gotcha System implementation:

**New files:**
- `.claude/gotcha/registry.json`
- `.claude/gotcha/pending.json`
- `.claude/hooks/gotcha-event-capture.py`
- `.claude/hooks/gotcha-preflight.py`
- `.claude/commands/gotcha-registry.md`
- `docs/plans/2026-03-21-002-feat-gotcha-system-integration-plan.md`
- `docs/plans/2026-03-21-003-feat-seed-gotcha-registry-and-commit-plan.md` (this file)

**Modified files:**
- `.claude/settings.local.json` (added PreToolUse + PostToolUse hooks)
- `agents/claude-code.md` (added Gotcha System section + trigger table rows)
- `skills/SKILL_MAP.yaml` (added gotcha tag)
- `skills/REGISTRY.md` (added gotcha-registry entry)
- `docs/WORKFLOW.md` (added session startup step 6 + auto-trigger entries)
- `.claude/configs/gotcha-system-config.md` (added pending_expiry_days)

**Commit message:** `feat(tooling): add Gotcha System — preflight hooks, event capture, registry, and approval flow`

---

## Acceptance Criteria

- [ ] All 6 gotcha entries written to `.claude/gotcha/registry.json` with correct schema
- [ ] Each entry has: `gotcha_id`, `name`, `signature.patterns[]`, `description`, `root_cause`,
      `recommended_fix`, `preventative_rule.rule_type`, `confidence_profile.confidence`,
      `confidence_profile.confidence_band`, `created_at`, `updated_at`, `version: 1`
- [ ] Preflight hook produces correct `[GOTCHA ADVISORY]` output for at least 2 seed entries
      (smoke test with `firebase deploy` and `git push` payloads)
- [ ] Registry JSON is valid (parseable by Python)
- [ ] All Gotcha System files staged and committed
- [ ] Commit on main branch, ready for merge (or already on main)

---

## Sources

- Registry schema: `docs/gotcha-system/schemas/gotcha-entry-schema.md`
- Confidence profile schema: `docs/gotcha-system/schemas/confidence-profile-schema.md`
- PetBase shell command rules: `docs/WORKFLOW.md §5` + `agents/claude-code.md`
- Feedback memories: `feedback_git_commands.md`, `feedback_bash_commands.md`
- Delivery gate rules: `docs/WORKFLOW.md §2` (Delivery section)
- Dev-log evidence: `planning/dev-log.md` (vaccine reminders wrong collection, Phase 34 rollbacks)
