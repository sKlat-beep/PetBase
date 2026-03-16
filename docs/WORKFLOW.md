# PetBase Workflow

`planning/TODO.md` is the authoritative task board.

## Task Status Values
`intake` → `in-progress` → `review` → `done` | `blocked`

---

## Pickup
1. Set task Status to `in-progress` in `planning/TODO.md`.
2. Read the relevant contracts listed in the task entry.
3. Write a dev-log entry:
   ```
   ## [YYYY-MM-DD] TASK-ID: <title> [START]
   ```

## Delivery
1. Run `/ui-review` on all modified `.tsx` files (if any).
2. Run `/privacy-check` on all Firestore-touching files (if any).
3. Run test-validator:
   ```bash
   cd app && npm run build
   cd functions && npm run build
   ```
   Both must exit 0.
4. Set task Status to `review` in `planning/TODO.md`.
5. Write a dev-log entry:
   ```
   ## [YYYY-MM-DD] TASK-ID: <title> [COMPLETE]
   ```

## Verification & Deploy
1. PM reviews and approves task in `planning/TODO.md`.
2. `firebase-deployer` agent executes the scoped deploy.
3. Smoke test: confirm hosting URL loads and Auth works.
4. Set task Status to `done`.
5. Write a dev-log entry:
   ```
   ## [YYYY-MM-DD] TASK-ID: <title> [VERIFIED]
   ```

## Blocked
Set Status to `blocked` with a reason note inline. Do not attempt to proceed without
resolving the dependency. Flag to the user.

---

## Skill Reference
| Trigger | Skill |
|---|---|
| Creating a new task | `/intake` |
| Any `.tsx` file modified | `/ui-review` |
| Any Firestore read/write changed | `/privacy-check` |
| Handing off to another agent | `/handoff` |

## Agent Reference
| Task type | Agent |
|---|---|
| UI components, pages, modals | `agents/ui-builder.md` |
| Privacy compliance gate | `agents/privacy-auditor.md` |
| Build + type safety gate | `agents/test-validator.md` |
| Firebase deploy | `agents/firebase-deployer.md` |
