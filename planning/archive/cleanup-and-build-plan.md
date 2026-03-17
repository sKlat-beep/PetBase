# PetBase Cleanup & Rebuild Plan
# Created: 2026-03-14

This is the canonical execution plan for project cleanup and infrastructure rebuild.
Work proceeds in four phases. Each phase must fully complete before the next begins.
Dev-log entries are required at Start, Complete, and Verified for each phase.

---

## PHASE 0 — Agent & Skill Creation
> Build the new tooling layer before tearing down the old one.
> No code changes to app/ or functions/ in this phase.

### 0-A: Create New Local Skills

#### Skill: `/intake` (replaces brainfile-intake)

**File:** `skills/local/intake/SKILL.md`

Purpose: Convert a human request into a structured task entry in `planning/TODO.md`.
No MCP dependency. Pure file writes.

Steps:
1. Parse the request into a short title (≤10 words) and precise description.
2. Assign tags from the domain list: `privacy | ui | ux | mobile | desktop | firebase | functions | release | performance | dx | feature | bug`.
3. Map tags to contracts using `contracts/CONTRACT_MAP.yaml`.
4. Map tags to skills using `skills/SKILL_MAP.yaml`.
5. Write a new entry to `planning/TODO.md` with this structure:
   ```
   ## [TASK-ID] Title
   Tags: <tags>
   Contracts: <mapped contracts>
   Skills: <mapped skills>
   Status: intake

   ### Description
   <description>

   ### Acceptance Criteria
   - [ ] <criterion 1>
   - [ ] <criterion 2>

   ### Verification
   - cd app && npm run build
   - cd functions && npm run build
   - <additional commands>
   ```
6. Assign a TASK-ID by reading the last ID in `planning/TODO.md` and incrementing.
7. Write a dev-log entry: `## [DATE] TASK-ID: <title> [INTAKE]`.

> NOTE: `planning/TODO.md` must be created in Phase 0 with an initial header and a
> status legend (intake / in-progress / review / done / blocked).

---

#### Skill: `/privacy-check` (replaces privacy-audit)

**File:** `skills/local/privacy-check/SKILL.md`

Purpose: Verify that new or modified Firestore-bound fields are classified and encrypted before
any code is written or deployed.

Steps:
1. Identify all new or modified fields from the task description.
2. For each field, check `contracts/privacy-contract.md` Field Dictionary.
   - If present: confirm classification (RESTRICTED_PII or UNRESTRICTED_DATA).
   - If absent: add the field to the dictionary, classify it, before proceeding.
3. For RESTRICTED_PII fields: use jcodemunch `search_symbols` to confirm that
   `encrypt()` from `app/src/lib/crypto.ts` is called before the Firestore write.
4. For tokenized fields: confirm no client-side resolution. Token resolution must
   be server-side via the Cloud Function only.
5. For No-Cloud PII fields (medical records, expenses, address): confirm the
   Firestore write path is absent or behind a compliance flag.
6. Output a compliance report with: field name, classification, encrypted (yes/no),
   line numbers of Firestore write calls.
7. If any violation found: BLOCK — do not mark the task complete.
8. Write a dev-log entry (summary only, no PII field values).

> RECOMMENDATION: Add a `contracts/privacy-contract.md` "new fields" staging section
> so audits can be batched per sprint rather than per commit.

---

#### Skill: `/ui-review` (replaces ui-consistency)

**File:** `skills/local/ui-review/SKILL.md`

Purpose: Enforce the unified UI contract across all new or modified UI components.

Steps:
1. Identify all modified `.tsx` files from the task.
2. If `.pen` files are involved, use `mcp__pencil__batch_get` to read design specs.
   Use `mcp__pencil__get_screenshot` to validate layout visually.
3. Check `contracts/unified-ui-design.md` constraints against the modified files:
   - [ ] No internal scrollbars — use pagination or load-more patterns
   - [ ] Modal adapts to bottom-sheet on mobile (use `sm:` Tailwind prefix)
   - [ ] Light and dark theme parity (check both `dark:` classes and CSS vars)
   - [ ] RESTRICTED_PII fields masked by default with eyeball toggle
   - [ ] All avatar images resolve via `tokenService.getAvatarUrl` (never raw URLs)
   - [ ] Common components reused from `app/src/components/` not reimplemented
4. Use jcodemunch `get_file_outline` on each modified file to check for violations.
5. Output a checklist report: pass/fail per constraint with line numbers.
6. If any constraint fails: flag with specific line and fix instruction before approving.

> RECOMMENDATION: Add a `app/src/components/common/` directory with shared primitives
> (Modal, BottomSheet, MaskedField, AvatarImage). Currently these patterns exist inline
> per-component and are not reusable. Centralizing them would eliminate the most common
> class of UI consistency failures.

> RECOMMENDATION: Add a Storybook or similar component catalog for visual regression
> tracking as the component library grows.

---

#### Skill: `/handoff`

**File:** `skills/local/handoff/SKILL.md`

Purpose: Produce a minimal, ready-to-paste handoff prompt for the next agent (Claude Opus,
Gemini, Antigravity, etc.). Enforces SYSTEM_RULES.md §11.

Steps:
1. Read the last 15 lines of `planning/dev-log.md`.
2. Read the current open task entry from `planning/TODO.md` (Status: in-progress).
3. Read `docs/SYSTEM_RULES.md` §§ 1-4 (Onboarding, Privacy, Docs, jcodemunch).
4. Construct a handoff prompt with these sections:
   - **Context**: What was just completed (1-3 sentences from dev-log)
   - **Current Task**: Title, ID, acceptance criteria
   - **Next Step**: The single next action the receiving agent should take
   - **Critical Rules**: Privacy rules, jcodemunch usage, no git push
   - **Files to Read First**: Max 3 files relevant to the next step
   - **Verification**: The build/test commands to confirm correctness
5. Output as a fenced markdown block ready to paste.
6. Do NOT include code snippets, file contents, or task history in the handoff prompt.

> RECOMMENDATION: Add a `target_agent` parameter so the prompt can omit rules
> that don't apply (e.g., ChatGPT doesn't use jcodemunch, so omit §4 for that target).

---

### 0-B: Create Subagent Instruction Files

#### Agent: `agents/ui-builder.md`

Purpose: Dedicated implementation agent for all UI work — pages, components, layout.

Scope:
- Reads `contracts/unified-ui-design.md` at start of every session.
- Uses Pencil MCP for design-first mockups before writing code.
- Enforces all `/ui-review` constraints in every component it produces.
- Runs `cd app && npm run build` after every code change before reporting done.
- Invokes `/ui-review` on all modified files before marking any task complete.

Mandatory behaviors:
- Use jcodemunch `get_file_outline` before editing any `.tsx` file.
- Edit blocks ≤50 lines; request multiple smaller edits rather than one large rewrite.
- Never add new utility classes that duplicate Tailwind built-ins.
- Always pair new components with dark mode variants.

> RECOMMENDATION: Add a constraint that ui-builder must also check Lighthouse
> performance score after major page changes. Target: FCP < 1.5s, TTI < 3.5s on
> mid-tier mobile.

---

#### Agent: `agents/privacy-auditor.md`

Purpose: Pre-flight privacy review before any Firestore-touching code ships.

Scope:
- Invoked before any task tagged `privacy`, `firebase`, or `functions` moves to review.
- Uses jcodemunch `search_symbols` to locate all Firestore write calls in modified files.
- Cross-references every write call against `contracts/privacy-contract.md`.
- Blocks tasks that write unclassified fields or skip encryption.

Mandatory behaviors:
- Never read raw RESTRICTED_PII field values; work only with field names and line numbers.
- Do not write to dev-log with PII field values — names only.
- If a field is unclassified, add it to the Field Dictionary before checking the code.
- Output: compliance report with field name, classification, encrypted (Y/N), line number.

> RECOMMENDATION: Add automated scanning of `firestoreService.ts` on every new symbol
> addition. Since all Firestore writes flow through this file, a targeted `get_file_outline`
> after each new function addition would catch violations at authorship time.

---

#### Agent: `agents/firebase-deployer.md`

Purpose: Controlled deployment agent. Executes Firebase deploys only after validation gates pass.

Scope:
- Activated only after test-validator reports both builds passing.
- Runs `firebase deploy` for the appropriate target (hosting, functions, or both).
- Verifies Firestore rules compiled and deployed without error.
- Writes a "Deployed" entry to `planning/dev-log.md`.

Mandatory behaviors:
- Never run `git push`.
- Never deploy without test-validator sign-off in dev-log.
- If deploy fails, log error to dev-log and halt — do not retry automatically.
- After deploy, perform a smoke test: verify the hosting URL loads and Auth still works.

> RECOMMENDATION: Add a pre-deploy Firestore rules dry-run using
> `firebase firestore:rules --check` (or the Emulator) before live deploy.
> Current workflow deploys rules without validation, which risks locking out users
> on a rules syntax error.

---

#### Agent: `agents/test-validator.md`

Purpose: Runs all validation gates before any Ready Release transition. Gate-keeper role.

Scope:
- Runs `cd app && npm run build` — must exit 0.
- Runs `cd functions && npm run build` — must exit 0.
- Runs `npx tsc --noEmit` in both `app/` and `functions/` — must exit 0.
- Validates that no new Firestore write paths bypass the encryption check.
- Reports pass/fail to dev-log.

Mandatory behaviors:
- No code changes during test/diagnostic phase (SYSTEM_RULES §7).
- If either build fails: log specific error, return blocked status to calling agent.
- If TypeScript errors exist: list each one with file:line, do not proceed.

> RECOMMENDATION: Once a test harness is added (Phase 4+), extend this agent to
> run `npm run test` and require ≥80% pass rate before sign-off. Currently there are
> zero automated tests — adding even basic unit tests for `crypto.ts` would catch the
> most dangerous class of bugs (silent encryption failures).

---

### 0-C: Update Registry Files

**File updates in this step:**

1. `skills/REGISTRY.md` — Replace `brainfile-intake` entry with three new skills:
   ```
   - skills/local/intake/SKILL.md
   - skills/local/privacy-check/SKILL.md
   - skills/local/ui-review/SKILL.md
   - skills/local/handoff/SKILL.md
   ```

2. `skills/SKILL_MAP.yaml` — Replace `brainfile-intake` mapping, add handoff:
   ```yaml
   mappings:
     - tag: intake
       skills: [intake]
     - tag: privacy
       skills: [privacy-check]
     - tag: ui
       skills: [ui-review]
     - tag: ux
       skills: [ui-review]
     - tag: mobile
       skills: [ui-review]
     - tag: desktop
       skills: [ui-review]
     - tag: handoff
       skills: [handoff]
   ```

3. `agents/AGENTS.md` — Add the four new agent files to the role list.

4. `planning/TODO.md` — Create this file with initial header (empty task list, status legend).
   This replaces the Brainfile board as the task tracking source of truth.

> RECOMMENDATION: Keep `TODO.md` to a single flat file for now. Do not pre-build a
> complex schema. The simpler the format, the less agent overhead to parse it. If the
> project scales to a team, migrate to GitHub Issues at that point.

---

### Phase 0 Verification
- All four SKILL.md files exist and are valid Markdown.
- All four agent .md files exist in `agents/`.
- `skills/REGISTRY.md` contains no reference to `brainfile-intake`.
- `skills/SKILL_MAP.yaml` maps `intake` → `intake` (not `brainfile-intake`).
- `planning/TODO.md` exists.
- Dev-log entry written: `## [DATE] Phase 0: Agent & Skill Layer Created [COMPLETE]`

---

## PHASE 1 — High Priority Items
> Security hardening and brainfile core removal.
> These changes affect running cloud infrastructure — execute carefully.

### 1-A: API Key Security (USER ACTION REQUIRED FIRST)

**This step cannot be automated. The user must:**
1. Go to `https://console.anthropic.com` → API Keys
2. Revoke the key starting with `sk-ant-api03-d_gbGN...`
3. Generate a new API key
4. Set as a system environment variable on this machine:
   ```powershell
   [System.Environment]::SetEnvironmentVariable("ANTHROPIC_API_KEY", "sk-ant-...", "User")
   ```
5. Update `.claude/settings.local.json` — remove the hardcoded key value, use env var reference or omit entirely (jcodemunch picks it up from the system environment automatically)

**Then Claude will:**
- Edit `.claude/settings.local.json` line 41 to remove the API key value
- Verify the jcodemunch MCP server still starts correctly after the change

> RECOMMENDATION: Add `.claude/settings.local.json` to `.gitignore` immediately.
> This file contains machine-specific paths and secrets — it must never be committed.
> The project is not currently a git repo (no .git directory detected), but if git is
> initialized in the future, this file will be captured in the initial commit unless
> gitignored.

---

### 1-B: Remove brainfileSync Cloud Function and Brainfile Scripts

**Files modified:**

1. **Delete:** `functions/src/brainfileSync.ts`

2. **Edit:** `functions/src/index.ts` — Remove line 224:
   ```typescript
   export * from './brainfileSync';
   ```

3. **Edit:** `functions/package.json` — Remove from `dependencies`:
   ```json
   "@brainfile/core": "^0.15.1"
   ```

4. **Run:**
   ```bash
   cd functions && npm uninstall @brainfile/core
   cd functions && npm run build
   ```
   Build must exit 0.

5. **Delete the `scripts/` directory** — all four Python scripts (`stale_detector.py`,
   `retro_report.py`, `auto_close.py`, `reconstruct-ledger.py`) are exclusively Brainfile
   board management tools. They reference `.brainfile/board` and `.brainfile/logs` and have
   no other use in the project.
   ```bash
   rm -rf scripts/
   ```

> RECOMMENDATION: While in `functions/package.json`, audit the full dependency list.
> `nodemailer` is the only other runtime dependency besides firebase-admin and
> firebase-functions. This is healthy. Keep it lean.

> RECOMMENDATION: The `feature_flags` Firestore collection was only consumed by
> `brainfileSync`. After this function is removed, the collection becomes orphaned.
> Plan a follow-up task to either delete the collection from Firestore (if it has
> no other consumers) or repurpose it for a real feature flag system (e.g., rollout
> controls for new features to subsets of users). A proper feature flag system would
> be genuinely useful for this project's phased rollout strategy.

---

### 1-C: Remove Brainfile MCP Permissions

**Edit:** `.claude/settings.local.json` — Remove these three entries from the `allow` array:
```json
"mcp__brainfile__list_tasks",
"mcp__brainfile__contract",
"mcp__brainfile__get_task"
```

Also remove (cleanup of oddly-permissioned items while in the file):
```json
"Bash(printf AIzaSyC-W8jfdYFqHlEJ6jVWm6zSH6lGt95D7_Q:*)"
```
This is a hardcoded Firebase API key in a shell permission. It is not needed as a permission entry — the key is already in the Firebase SDK config.

> RECOMMENDATION: Also remove `"Bash(python3:*)"` from permissions. The jcodemunch
> MCP server is launched by Claude Code's MCP server runner (via the `command` field
> in mcpServers config), not via manual Bash calls. This permission is unnecessary
> and slightly widens the shell surface.

---

### Phase 1 Verification
- `functions/src/brainfileSync.ts` does not exist.
- `functions/src/index.ts` has no reference to `brainfileSync`.
- `functions/node_modules/@brainfile` directory does not exist.
- `functions/lib/` rebuilt — no brainfileSync in output.
- `.claude/settings.local.json` has no `mcp__brainfile__*` entries.
- `.claude/settings.local.json` has no hardcoded API key or Firebase key in permissions.
- `cd functions && npm run build` exits 0.
- Dev-log entry: `## [DATE] Phase 1: Brainfile Core Removed [COMPLETE]`

---

## PHASE 2 — Medium Priority Items
> Documentation, contract, and skill cleanup. No cloud infrastructure changes.

### 2-A: Delete the Brainfile Board Directory

```bash
rm -rf .brainfile/
```

> RECOMMENDATION: Before deleting, scan `.brainfile/board/` for any task files with
> Status: in-progress or Status: review. Any open tasks should be migrated to
> `planning/TODO.md` (created in Phase 0) before deletion. Based on the dev-log,
> task-21 (UI Fix — duplicate medical notes) and task-22 (UI Fix — vet card template)
> appear to be OPEN. Port these to TODO.md first.

**Specific open tasks to migrate to TODO.md before deletion:**
- `task-21`: UI Fix — Remove Duplicate Medical Notes on Multi-Card
- `task-22`: UI Fix — Correct Default Vet Card Template Initialization
- Any other tasks not in `done` column

---

### 2-B: Delete Brainfile Contract and Update Registry

1. **Delete:** `contracts/brainfile-contract.md`

2. **Edit:** `contracts/REGISTRY.md` — Remove:
   ```
   - brainfile-contract.md
   ```

3. **Edit:** `contracts/privacy-contract.md` — Find and remove the reference to
   `.brainfile/board/task-10.md` in the `relatedFiles` or any linked section.

---

### 2-C: Delete Brainfile-Intake Skill

1. **Delete:** `skills/local/brainfile-intake/` (entire directory)
   (REGISTRY.md and SKILL_MAP.yaml already updated in Phase 0)

---

### 2-D: Update Documentation Files

#### `docs/INDEX.md`
Remove line 8: `- '.brainfile/' - task board + logs (authoritative state)`
Add in its place: `- 'planning/TODO.md' - task board (authoritative state)`

#### `docs/SYSTEM_RULES.md`
- Section 3 (Documentation Discipline): Change hybrid logging note from referencing
  Brainfile to: "Dev-log entries required at Start, Complete, Verified."
- Section 5 (MCP Usage): Remove the bullet: "Brainfile MCP server must be used for
  Brainfile reads/writes and task transitions."
- Section 5: Retain jcodemunch and Pencil bullets unchanged.

#### `docs/WORKFLOW.md`
Full rewrite. Replace the current Brainfile-centric YAML workflow with:

```markdown
# PetBase Workflow

## Task Lifecycle
planning/TODO.md is the authoritative task board.

Status values: intake → in-progress → review → done | blocked

## Pickup
1. Set task Status: in-progress in TODO.md.
2. Write dev-log entry: `## [DATE] TASK-ID: <title> [START]`

## Delivery
1. Run test-validator: `cd app && npm run build && cd ../functions && npm run build`
2. Run `/ui-review` if any .tsx files were modified.
3. Run `/privacy-check` if any Firestore-touching files were modified.
4. If all pass: set Status: review.
5. Write dev-log entry: `## [DATE] TASK-ID: <title> [COMPLETE]`

## Verification
1. PM reviews and approves in TODO.md.
2. firebase-deployer executes deploy.
3. Post-deploy smoke test.
4. Set Status: done.
5. Write dev-log entry: `## [DATE] TASK-ID: <title> [VERIFIED]`

## Blocked
- Set Status: blocked with a reason note.
- Do not attempt to proceed without unblocking the dependency.

## Validation Commands
- `cd app && npm run build`
- `cd functions && npm run build`
- `npx tsc --noEmit` (run in app/ and functions/)
```

#### `agents/claude-code.md`
Remove line 13: `"Use Brainfile contracts and update ledger via subtask tools."`
Replace with: `"Use /intake to create tasks, /handoff when handing off to another agent."`

#### `docs/LEGACY_MIGRATION.md`
Remove the row:
`| rollback brainfile.md | Brainfile rules and orchestration guidance | docs/SYSTEM_RULES.md + docs/WORKFLOW.md |`

Add a new row documenting this migration:
`| .brainfile/ board | Task orchestration (Brainfile MCP) | planning/TODO.md |`

#### `planning/implementation_plan.md`
Remove all `mcp_brainfile_contract pickup` and `mcp_brainfile_contract deliver` references.
Replace with references to `planning/TODO.md` task status updates.

#### `planning/dev-log.md`
Update the header note (line 4):
Change: `"use Brainfile ledger for in-progress updates"`
To: `"use TODO.md for task status; dev-log entries only at Start, Complete, Verified"`

---

### 2-E: Re-index jcodemunch

After all file deletions are complete, re-index to remove stale references:

```
index_folder(
  path: C:\Admin\Projects\PetBase,
  incremental: false,
  use_ai_summaries: true,
  extra_ignore_patterns: []
)
```

**After re-index:**
1. Note the new repo ID from the response.
2. Update `contracts/jcodemunch-contract.md` with the new ID and current date.
3. Update `docs/SYSTEM_RULES.md` §4 if repo ID is referenced there.
4. Update `MEMORY.md` with the new repo ID.

> RECOMMENDATION: Consider adding `node_modules/`, `dist/`, `lib/`, and `.firebase/`
> to the extra_ignore_patterns. These directories contain no meaningful symbols and
> inflate the index. The contract currently says "no ignore patterns" but this was
> written before the index was in use — pruning build artifacts will make symbol
> search results significantly cleaner and faster.

---

### Phase 2 Verification
- `.brainfile/` directory does not exist.
- `contracts/brainfile-contract.md` does not exist.
- `skills/local/brainfile-intake/` does not exist.
- `docs/WORKFLOW.md` contains no YAML orchestration blocks.
- `agents/claude-code.md` has no reference to "Brainfile".
- `docs/SYSTEM_RULES.md` has no reference to "Brainfile MCP server".
- `docs/INDEX.md` references `planning/TODO.md` instead of `.brainfile/`.
- jcodemunch re-indexed; new repo ID noted.
- `contracts/jcodemunch-contract.md` updated with new repo ID and date.
- Dev-log entry: `## [DATE] Phase 2: Brainfile Fully Removed [COMPLETE]`

---

## PHASE 3 — Low Priority Items (Housekeeping)

### 3-A: Fix app/package.json Name

**Edit:** `app/package.json` line 2:
```json
"name": "petbase",
```

> RECOMMENDATION: While in package.json, also set:
> ```json
> "version": "0.4.0"
> ```
> to reflect that Phases 1-3.5 of the roadmap are complete. Use semver: 0.x.y for
> pre-release, 1.0.0 when Phase 4 (shareable cards + service discovery) is fully
> shipped and stable.

---

### 3-B: Delete Stale Worktree

```bash
rm -rf .claude/worktrees/agent-a743ceaa/
```

This was a temporary isolated workspace from a previous agent session. It contains
no code changes (the agent made no commits to it, based on the worktree metadata).

---

### 3-C: Clean Remaining Bash Permissions

**Edit:** `.claude/settings.local.json` — Remove:
- `"Bash(python3:*)"` — jcodemunch is launched via MCP server config, not manual Bash
- `"Bash(printf AIzaSyC-W8jfdYFqHlEJ6jVWm6zSH6lGt95D7_Q:*)"` — Firebase key in permission, not needed

> RECOMMENDATION: Review the full permissions list periodically. Permissions
> accumulate over time as new commands are one-off approved. A quarterly audit
> of `settings.local.json` would keep the surface minimal.

---

### 3-D: Fix the jcodemunch PROJECT_ROOT Path

**Current (incorrect):**
```json
"PROJECT_ROOT": "C:\\Admin\\Projects\\PetBase\\PetBase"
```

**Should be:**
```json
"PROJECT_ROOT": "C:\\Admin\\Projects\\PetBase"
```

The current path has a double `PetBase\PetBase` which is likely a misconfiguration.
This may cause the MCP server to scope its index to a nonexistent subdirectory.
Verify the correct path and fix before the Phase 2 re-index.

---

### 3-E: Archive Completed Dev-Log History (Optional)

If `planning/dev-log.md` is getting long, archive entries older than 30 days to
`docs/legacy/dev-log-archive.md`. Keep only the most recent 20 entries in the
active file. This keeps session-start context reads fast (§9 of SYSTEM_RULES).

---

### Phase 3 Verification
- `app/package.json` name is `"petbase"`.
- `.claude/worktrees/` is empty or does not exist.
- `.claude/settings.local.json` has no `python3` or `printf` Bash permissions.
- jcodemunch `PROJECT_ROOT` points to `C:\Admin\Projects\PetBase` (no double segment).
- Dev-log entry: `## [DATE] Phase 3: Housekeeping Complete [COMPLETE]`

---

## Inline Recommendations Summary
> These are flagged throughout the plan for future action. Collected here for reference.

### Code Quality
- [ ] Add `app/src/components/common/` with shared primitives: Modal, BottomSheet, MaskedField, AvatarImage
- [ ] Fix `app/package.json` name from `"react-example"` to `"petbase"` (Phase 3)
- [ ] Add unit tests: at minimum `crypto.ts` (encryption round-trips) and `tokenService.ts` (token resolution)
- [ ] Add TypeScript strict mode if not already enabled — run `npx tsc --noEmit` clean

### UI/UX
- [ ] Audit Lucide React icon imports — import only used icons (tree-shaking usually handles this but explicit named imports are cleaner)
- [ ] Add PWA manifest + service worker via `vite-plugin-pwa` for home screen install and offline card access
- [ ] Add Lighthouse performance budget target: FCP < 1.5s, TTI < 3.5s on mobile
- [ ] Lazy-load the `/search` route — H3 library is not trivial in size
- [ ] Add loading skeleton states to pages that fetch from Firestore (currently shows blank until data loads)
- [ ] Add toast/snackbar notification system for success/error feedback (currently uses browser alert or silent failure)
- [ ] Improve the Getting Started Guide completion state — after all steps done, show a dashboard summary card instead of the guide disappearing

### Performance
- [ ] Add jcodemunch ignore patterns: `node_modules/`, `dist/`, `lib/`, `.firebase/`
- [ ] Consider React Query / TanStack Query to replace manual Context async state management
- [ ] Enable Firestore offline persistence (`enableIndexedDbPersistence`) for offline pet card access
- [ ] Lazy-load modals (MedicalRecordsModal, PetFormModal, etc.) using `React.lazy` + Suspense

### Features
- [ ] Wire Firebase Storage photo upload in PetFormModal (current URL input is a placeholder)
- [ ] Build Service Discovery Firestore backend — `Search.tsx` is a UI shell with no real data
- [ ] Wire Community groups/discussions to Firestore — `Community.tsx` and `GroupHub.tsx` are UI shells
- [ ] Implement Lost Pet Alert push notifications (SafetyAlertsContext exists, no backend)
- [ ] Persist expense data to Firestore (ExpenseContext exists in memory only)
- [ ] Repurpose the `feature_flags` Firestore collection for real feature flag rollout controls
- [ ] Add vaccine reminder push notifications (data exists in medical records; surfacing it is the gap)
- [ ] Add `app/package.json` version field and track version in UI settings page for support reference

### Security & Ops
- [ ] Add `.claude/settings.local.json` to `.gitignore` (when git is initialized)
- [ ] Add Firestore rules dry-run before live deploy (`firebase firestore:rules --check`)
- [ ] Quarterly audit of `settings.local.json` permissions list
- [ ] Consider Firebase App Check for Cloud Function protection against abuse
- [ ] Rotate Firebase API key (`AIzaSyC-W8j...`) if it was ever committed to version control

---

## Execution Order Summary

| Phase | Steps | Estimated File Changes |
|---|---|---|
| 0 — Agent & Skill Creation | 0-A through 0-C | ~12 new files, 3 edited |
| 1 — High Priority | 1-A through 1-C | 2 deleted, 3 edited |
| 2 — Medium Priority | 2-A through 2-E | ~8 deleted, ~8 edited, 1 re-index |
| 3 — Low Priority | 3-A through 3-E | 3 edited, 1 deleted |

**Total scope:** ~22 file operations across ~4 working sessions.
Each phase should be a single dev-log entry set (Start → Complete → Verified).
