# Planning File Consolidation Implementation Plan

> **STATUS: COMPLETE (2026-03-17)** — All steps executed in commits `2089f5b`, `cb940e5`, `5b8fffb`.
> Planning files archived, TODO.md restructured, dev-log converted to today-only journal. This plan is archived for reference only.

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Consolidate PetBase's 3,100+ lines of stale planning files into a clean two-file system: TODO.md (open tasks with full context, organized by phase) + dev-log.md (today's work journal that auto-archives).

**Architecture:** Archive `PetBase-Roadmap.md`, `implementation_plan.md`, and `cleanup-and-build-plan.md` into `planning/archive/`. Move completed tasks from TODO.md to the archive while preserving full bodies. Restructure TODO.md to hold only open tasks organized by phase, with a token-efficiency rule: agents read only the active phase section. Replace the old dev-log with a "today only" journal. Update all references across 10+ files.

**Tech Stack:** Markdown files, no code changes to app/ or functions/.

---

## File Structure

```
planning/
├── TODO.md                          # MODIFY — strip all done tasks, keep open only
├── dev-log.md                       # REWRITE — new format: today's session journal
├── archive/                         # CREATE — directory for all archived material
│   ├── PetBase-Roadmap.md           # MOVE — historical roadmap (read-only archive)
│   ├── implementation_plan.md       # MOVE — task-10 plan (read-only archive)
│   ├── cleanup-and-build-plan.md    # MOVE — phase 0 plan (read-only archive)
│   ├── dev-log-archive-foundation.md  # MOVE — already archived
│   ├── dev-log-archive-phase4-8.md    # MOVE — already archived
│   ├── dev-log-archive-phase9-14.md   # MOVE — already archived
│   ├── dev-log-archive-tasks.md       # MOVE — already archived
│   └── dev-log-completed.md         # CREATE — rolling archive of completed tasks
docs/
├── SYSTEM_RULES.md                  # MODIFY — update §3 Documentation Discipline
├── INDEX.md                         # MODIFY — update planning/ description
agents/
├── claude-code.md                   # MODIFY — remove implementation_plan.md ref, update dev-log policy
skills/local/
├── intake/SKILL.md                  # MODIFY — replace dev-log entry step with new format
├── handoff/SKILL.md                 # MODIFY — read TODO.md instead of dev-log for context
.claude/commands/
├── intake.md                        # MODIFY — mirror of skills/local/intake/SKILL.md
├── handoff.md                       # MODIFY — mirror of skills/local/handoff/SKILL.md
contracts/
├── privacy-contract.md              # MODIFY — update dev-log deliverable path
├── jcodemunch-contract.md           # MODIFY — update dev-log deliverable path
```

**Files NOT modified** (references are in archived files or are descriptive, not prescriptive):
- `planning/dev-log-archive-*.md` — moving to archive/, internal references are historical
- `docs/LEGACY_MIGRATION.md` — historical migration map; references to `dev-log.md` are descriptive context, not active instructions

---

## Recommendations

Before we start, here are additional improvements I recommend:

1. **Archive max size: 500 lines per file.** When `dev-log-completed.md` exceeds 500 lines, rotate to `dev-log-completed-YYYY-MM.md`. This keeps any single archive file readable.

2. **TODO.md completed-task format.** For this initial migration, preserve full task bodies (they contain audit reports, privacy checks, and other reference material). For future completions, use a slim 3-line summary (ID, title, date) — the full acceptance criteria and verification logs aren't needed once the task is closed.

3. **Drop the "Verified" dev-log state.** Currently the system asks for Start/Complete/Verified entries. In practice, verification is just the last step of completion. Simplify to just Start and Complete.

5. **Daily rotation actor.** The agent performing the first action of a new day checks if `dev-log.md` has entries from a previous date. If so, it appends them to the archive and clears the file before proceeding. This is codified in `claude-code.md` Mandatory Behaviors.

4. **`cleanup-and-build-plan.md` is fully executed.** It was the Phase 0 migration plan from Brainfile to TODO.md — 100% done. Safe to archive.

---

## Task 1: Create archive directory and move files

**Files:**
- Create: `planning/archive/` (directory)
- Move: `planning/PetBase-Roadmap.md` → `planning/archive/PetBase-Roadmap.md`
- Move: `planning/implementation_plan.md` → `planning/archive/implementation_plan.md`
- Move: `planning/cleanup-and-build-plan.md` → `planning/archive/cleanup-and-build-plan.md`
- Move: `planning/dev-log.md` → `planning/archive/dev-log-pre-consolidation.md`
- Move: `planning/dev-log-archive-foundation.md` → `planning/archive/dev-log-archive-foundation.md`
- Move: `planning/dev-log-archive-phase4-8.md` → `planning/archive/dev-log-archive-phase4-8.md`
- Move: `planning/dev-log-archive-phase9-14.md` → `planning/archive/dev-log-archive-phase9-14.md`
- Move: `planning/dev-log-archive-tasks.md` → `planning/archive/dev-log-archive-tasks.md`
- Create: `planning/archive/dev-log-completed.md`

- [x] **Step 1: Create the archive directory**

```bash
mkdir -p planning/archive
```

- [x] **Step 2: Move the three stale planning files**

```bash
git mv planning/PetBase-Roadmap.md planning/archive/PetBase-Roadmap.md
git mv planning/implementation_plan.md planning/archive/implementation_plan.md
git mv planning/cleanup-and-build-plan.md planning/archive/cleanup-and-build-plan.md
```

- [x] **Step 3: Archive current dev-log and all existing archives**

```bash
git mv planning/dev-log.md planning/archive/dev-log-pre-consolidation.md
git mv planning/dev-log-archive-foundation.md planning/archive/dev-log-archive-foundation.md
git mv planning/dev-log-archive-phase4-8.md planning/archive/dev-log-archive-phase4-8.md
git mv planning/dev-log-archive-phase9-14.md planning/archive/dev-log-archive-phase9-14.md
git mv planning/dev-log-archive-tasks.md planning/archive/dev-log-archive-tasks.md
```

- [x] **Step 4: Create the completed-tasks archive with header**

Create `planning/archive/dev-log-completed.md`:
```markdown
# Completed Tasks Archive

> Completed tasks are moved here from TODO.md. Max ~500 lines per file.
> When this file exceeds 500 lines, rotate to `dev-log-completed-YYYY-MM.md`.

---
```

- [x] **Step 5: Commit**

```bash
git add planning/archive/
git commit -m "chore: create planning/archive/ and move stale planning files"
```

---

## Task 2: Restructure TODO.md — open tasks with full context, organized by phase

**Files:**
- Modify: `planning/TODO.md`
- Modify: `planning/archive/dev-log-completed.md`

- [x] **Step 1: Audit task statuses and fix Phase 15**

Read TODO.md. Phase 15 has `Status: in-progress` but all 8 sub-tasks (TASK-42 through TASK-49) are `[x]`. Change Phase 15 status to `done` before proceeding.

Open tasks remaining:
- Security Audit Follow-ups (TASK-86 through TASK-89, status: intake)

- [x] **Step 2: Move all completed task blocks to archive**

For each done task and phase (Phase 15–21, TASK-22 through TASK-85, TASK-39/40/41, TASK-30 through TASK-38): copy the **full task body** (including acceptance criteria, verification logs, audit reports, and HTML comments) to `planning/archive/dev-log-completed.md`. These contain institutional knowledge (e.g., TASK-39 QR audit, privacy check results) worth preserving.

Group by phase with a phase header:

```markdown
## Phase 15: Quick Wins & Polish — completed 2026-03-15

### [TASK-42] Pet Birthday confetti/party UI — completed 2026-03-15
(full task body here)

### [TASK-43] ...
```

Note: The initial archive file will exceed 500 lines. That's fine — apply the rotation policy (split to `dev-log-completed-YYYY-MM.md`) if it exceeds ~500 lines after this migration.

- [x] **Step 3: Rewrite TODO.md with open tasks (full bodies, organized by phase)**

TODO.md keeps **full task bodies** for all open tasks — no slimming, no context loss. Tasks are organized under phase headers. When `/intake` adds a new task, it goes under the appropriate phase (create a new phase header if needed).

New TODO.md structure:
```markdown
# PetBase Task Board

Authoritative task list — open tasks only, organized by phase.
Completed tasks are archived to `planning/archive/dev-log-completed.md`.
Use `/intake` skill to add new tasks (place under the appropriate phase header).

> **Token efficiency:** When referencing this file, read only the phase section
> relevant to your current work — do not read the entire file.

## Status Legend
- `intake` — captured, not yet started
- `in-progress` — actively being worked
- `review` — complete, awaiting verification or PM approval
- `blocked` — waiting on a dependency (note reason inline)

---

## Phase: Security Audit Follow-ups (2026-03-17)
Tags: security, cleanup, dependencies
Status: intake

### [TASK-86] Archive `backups/` phase-snapshot ZIPs
(full task body preserved)

### [TASK-87] Upgrade vulnerable dependencies
(full task body preserved)

...etc
```

- [x] **Step 4: Verify TODO.md structure**

```bash
wc -l planning/TODO.md
# Expected: open tasks with full bodies — size will vary
grep -c "^### \[TASK-" planning/TODO.md
# Expected: 4 (TASK-86 through TASK-89)
grep -c "Status: done" planning/TODO.md
# Expected: 0 (no completed tasks remain)
```

- [x] **Step 5: Commit**

```bash
git add planning/TODO.md planning/archive/dev-log-completed.md
git commit -m "chore: restructure TODO.md — open tasks only, organized by phase; archive completed tasks"
```

---

## Task 3: Create new dev-log.md format

**Files:**
- Create: `planning/dev-log.md`

- [x] **Step 1: Write the new dev-log.md**

```markdown
# Dev Log — Today's Session

> This file tracks work done in the current day's session(s).
> At the start of each new day, move yesterday's entries to
> `planning/archive/dev-log-completed.md`, then clear this file back to the header.
>
> Entry format — one line per task transition:
> ```
> ## [YYYY-MM-DD] TASK-XX: Title — STATUS
> One-line summary of what was done. No PII.
> ```
>
> Statuses: START, COMPLETE
> When a task is COMPLETE, also update its status in TODO.md and move it to the archive.

---
```

- [x] **Step 2: Commit**

```bash
git add planning/dev-log.md
git commit -m "chore: create new dev-log.md as today-only session journal"
```

---

## Task 4: Update SYSTEM_RULES.md §3

**Files:**
- Modify: `docs/SYSTEM_RULES.md` (lines 19-24)

- [x] **Step 1: Replace §3 Documentation Discipline**

Old:
```markdown
## 3. Documentation Discipline
- `planning/TODO.md` is the authoritative task board. Use `/intake` to create tasks.
- `planning/implementation_plan.md` is the single source of truth for strategy.
- `planning/PetBase-Roadmap.md` is a checklist only.
- `planning/dev-log.md` entries are required at Start, Complete, Verified only (no PII).
- Dev-log format: `## [YYYY-MM-DD] Title`.
```

New:
```markdown
## 3. Documentation Discipline
- `planning/TODO.md` is the authoritative task board (open tasks only, organized by phase). Use `/intake` to create tasks.
- When reading TODO.md, read only the phase section relevant to your current work — not the entire file.
- `planning/dev-log.md` is a today-only session journal. Entries at Start and Complete only (no PII).
- When a task is completed: log in dev-log.md, move full task body from TODO.md to `planning/archive/dev-log-completed.md`.
- At each new day's start: move yesterday's dev-log entries to the archive, clear dev-log.md.
- Archive files live in `planning/archive/`. Max ~500 lines per archive file; rotate with date suffix.
- Dev-log format: `## [YYYY-MM-DD] TASK-XX: Title — STATUS` + one-line summary.
```

- [x] **Step 2: Update §9 Conversation Compaction**

Old:
```markdown
## 9. Conversation Compaction
- Limit tool noise.
- Read the last 10-20 lines of dev-log at session start.
```

New:
```markdown
## 9. Conversation Compaction
- Limit tool noise.
- Read `planning/dev-log.md` at session start for today's context.
- Read only the active phase section of `planning/TODO.md` — not the entire file.
```

- [x] **Step 3: Commit**

```bash
git add docs/SYSTEM_RULES.md
git commit -m "docs: update SYSTEM_RULES.md §3 and §9 for new planning structure"
```

---

## Task 5: Update agents/claude-code.md

**Files:**
- Modify: `agents/claude-code.md`

- [x] **Step 1: Update Required Reads and dev-log policy**

Old:
```markdown
## Required Reads (before any code work)
- `docs/SYSTEM_RULES.md`
- `docs/WORKFLOW.md`
- `planning/implementation_plan.md`

## Mandatory Behaviors
- Use jcodemunch for symbol-level navigation (repo: `local/PetBase`).
- Use `/intake` to create new tasks in `planning/TODO.md`.
- Use `/handoff` when handing off to another agent.
- Follow the dev-log policy: entries only at Start, Complete, Verified.
- No `git push`.
```

New:
```markdown
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
```

- [x] **Step 2: Commit**

```bash
git add agents/claude-code.md
git commit -m "docs: update claude-code.md for new planning file structure"
```

---

## Task 6: Update /intake and /handoff skills

**Files:**
- Modify: `skills/local/intake/SKILL.md` (line 57-60)
- Modify: `skills/local/handoff/SKILL.md` (line 11)
- Modify: `.claude/commands/intake.md` (line 57)
- Modify: `.claude/commands/handoff.md` (line 11)

- [x] **Step 1: Update /intake skill — replace dev-log step**

Old step 9:
```markdown
9. **Write a dev-log entry** in `planning/dev-log.md`:
   ```
   ## [YYYY-MM-DD] TASK-ID: <title> [INTAKE]
   ```
```

New step 9:
```markdown
9. **Write a dev-log entry** in `planning/dev-log.md`:
   ```
   ## [YYYY-MM-DD] TASK-ID: <title> — START
   Task created via /intake. <one-line description>
   ```
```

Apply to both `skills/local/intake/SKILL.md` and `.claude/commands/intake.md`.

- [x] **Step 2: Update /handoff skill — read TODO instead of dev-log for context**

Old step 1:
```markdown
1. **Read the last 15 lines** of `planning/dev-log.md` to capture recent context.
```

New step 1:
```markdown
1. **Read `planning/dev-log.md`** for today's session context, then **read `planning/TODO.md`** for the current in-progress task.
```

Apply to both `skills/local/handoff/SKILL.md` and `.claude/commands/handoff.md`.

- [x] **Step 3: Commit**

```bash
git add skills/local/intake/SKILL.md skills/local/handoff/SKILL.md .claude/commands/intake.md .claude/commands/handoff.md
git commit -m "docs: update intake and handoff skills for new dev-log format"
```

---

## Task 7: Update contracts and INDEX.md

**Files:**
- Modify: `contracts/privacy-contract.md` (line 25)
- Modify: `contracts/jcodemunch-contract.md` (line 37)
- Modify: `docs/INDEX.md` (line 9)

- [x] **Step 1: Update privacy-contract.md deliverable path**

Change line 25 from:
```yaml
      path: planning/dev-log.md
```
To:
```yaml
      path: planning/dev-log.md (today) or planning/archive/dev-log-completed.md (historical)
```

- [x] **Step 2: Update jcodemunch-contract.md deliverable path**

Same change at line 37.

- [x] **Step 3: Update docs/INDEX.md**

Old line 9:
```markdown
- `planning/` - human-readable plan, roadmap, dev log
```

New:
```markdown
- `planning/` - task board (TODO.md) + today's dev log; archive/ for completed work
```

- [x] **Step 4: Commit**

```bash
git add contracts/privacy-contract.md contracts/jcodemunch-contract.md docs/INDEX.md
git commit -m "docs: update contracts and INDEX.md for consolidated planning structure"
```

---

## Task 8: Update auto-memory MEMORY.md

**Files:**
- Modify: `C:\Users\quake\.claude\projects\C--Admin-Projects-PetBase\memory\MEMORY.md`

- [x] **Step 1: Update the Key Paths and Task Board sections**

Update references:
- Remove `planning/PetBase-Roadmap.md` and `planning/implementation_plan.md` from any key paths
- Update Task Board section to reflect new structure
- Update "Shell Commands" or other sections that reference dev-log

- [x] **Step 2: No commit needed** (memory files are outside the repo)

---

## Post-completion verification

After all 8 tasks:

```bash
# Verify no dangling references to old file locations
grep -r "planning/PetBase-Roadmap.md\|planning/implementation_plan.md\|planning/cleanup-and-build-plan.md" \
  --include="*.md" --exclude-dir=archive \
  docs/ agents/ contracts/ skills/ .claude/commands/ planning/TODO.md planning/dev-log.md

# Expected: no matches (all references should be in archive/ only)

# Verify TODO.md is slim
wc -l planning/TODO.md
# Expected: ~50-60 lines

# Verify archive directory has all files
ls planning/archive/
# Expected: 9 files (3 moved plans + 5 old archives + 1 new completed archive)
```
