# PetBase Task Board

Authoritative task list — open tasks only, organized by phase.
Use `/intake` skill to add new tasks (place under the appropriate phase header).

> **On task completion — follow this exact sequence:**
> 1. Log a COMPLETE entry in `planning/dev-log.md` (today's session journal)
> 2. Remove the task from this file
> 3. Archive to `planning/archive/dev-log-completed.md` happens during next-day rotation ONLY
> **Never skip step 1. Never archive directly.**

> **Token efficiency:** When referencing this file, read only the phase section
> relevant to your current work — do not read the entire file.

## Status Legend
- `intake` — captured, not yet started
- `in-progress` — actively being worked
- `review` — complete, awaiting verification or PM approval
- `blocked` — waiting on a dependency (note reason inline)

---

## Phase 22 — Maintenance & Type Safety

### TASK-91: Fix 9 pre-existing tsc --noEmit type errors `intake`
**Priority:** Medium | **Scope:** 3 files, no runtime impact (Vite build passes)

Errors found by `tsc --noEmit` strict check:

1. **`app/src/contexts/MessagingContext.tsx:188`** — `updateProfile` does not exist on `firestoreService` exports. Either the export was removed/renamed or the import needs updating.

2. **`app/src/pages/Search.tsx`** (5 errors):
   - Line 59: `user` not in scope (missing destructure or import)
   - Lines 638/641: `rating` property missing from review type `{ text, author, date }`
   - Line 651: `upvoters` property missing from review type
   - Line 651: `user` not in scope
   - Line 655: `upvotes` property missing from review type

3. **`app/src/utils/serviceApi.ts:139`** — `location` property missing from `ServiceResult` type

**Fix approach:** Update the type interfaces to include the missing fields, or fix the code that references non-existent properties. Check if fields were added at runtime but never typed.
