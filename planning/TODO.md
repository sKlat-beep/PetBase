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

### [TASK-87] Upgrade vulnerable dependencies

**Description:**
`app/`: serialize-javascript (high) via vite-plugin-pwa >=0.20.0 (breaking); `functions/`: nodemailer <=7.0.10 (high, address parsing DoS + domain confusion). Both require `npm audit fix --force` with breaking changes — test thoroughly.

**Acceptance Criteria:**
- [ ] `npm audit` reports 0 high/critical vulnerabilities in both `app/` and `functions/`
- [ ] `cd app && npm run build` exits 0
- [ ] `cd functions && npm run build` exits 0
- [ ] PWA functionality still works after vite-plugin-pwa upgrade

---

### [TASK-88] Un-export `buildErrorBlock` from `slackService.ts`

**Description:**
Only consumed internally by `logger.ts`; reduce public API surface. Tiny change but verify no dynamic imports reference it.

**Acceptance Criteria:**
- [ ] `buildErrorBlock` is not exported from `slackService.ts`
- [ ] `cd functions && npm run build` exits 0
- [ ] No other files import `buildErrorBlock`

---

### [TASK-89] Add guard to `getNearbyStores()` in `app/src/utils/storeApi.ts`

**Description:**
Permanent no-op returning `[]` with no Phase 5 ticket yet; silent failure risk. Add `throw new Error('Not implemented')` or dev-mode guard.

**Acceptance Criteria:**
- [ ] `getNearbyStores()` throws or logs a warning in development mode
- [ ] `cd app && npm run build` exits 0

---

### [TASK-90] Remove `functions/node_modules/` from git tracking

**Description:**
`functions/node_modules/` is currently tracked in git. The root `.gitignore` has `node_modules/` which only matches at the root level. Update `.gitignore` to use `**/node_modules/` and remove `functions/node_modules/` from the git index.

**Acceptance Criteria:**
- [ ] `.gitignore` uses a pattern that covers all `node_modules/` directories
- [ ] `functions/node_modules/` is no longer tracked by git
- [ ] `git status` shows clean after the change
