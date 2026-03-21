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

## Plan File Sources
> Tasks below were extracted from 34 plan files in `~/.claude/plans/`.
> Source plan file(s) noted in parentheses after each task for traceability.

---

---

## Phase 34.1 — Security Hardening (Follow-up from PR #3 review)

- TASK-222: `intake` — Security: `friends` UID array exposed to all auth users via `searchPublicProfiles`. Should return `friendCount: number` only, or compute PYMK server-side in a Cloud Function. Pre-existing issue; do not return full UID list from public profile queries. (security-sentinel finding, 2026-03-20)
- TASK-223: `intake` — Architecture: Move `gamificationPrefs` full object from world-readable `users/{uid}/profile/data` to private `users/{uid}/config/gamification`. Only the 3 denormalized public fields (`publicCrestEnabled`, `publicSpiritIcon`, `publicTierColor`) need to be in the public doc. Requires updating AuthContext, Layout, ProfileSettings read paths. (security-sentinel finding, 2026-03-20)

---

## Phase 35 — Monetization (Future)

- TASK-221: `intake` — Monetization strategy: Stripe integration + Firebase entitlements + plan state (zesty-hatching-shamir)

---

