---
title: "fix: Phase 34.1 — Public Profile Privacy: Remove UID Arrays & Isolate GamificationPrefs"
type: fix
status: completed
date: 2026-03-20
tasks: [TASK-222, TASK-223]
---

# fix: Phase 34.1 — Public Profile Privacy

Two related security hardening tasks identified in the 2026-03-20 audit.

## Overview

`users/{uid}/profile/data` is world-readable by all authenticated users (by design, for the
People/directory page). Two categories of data that should NOT be in this public document are
currently exposed there:

1. **TASK-222**: `friends: string[]` — raw UID list of all the user's friends
2. **TASK-223**: `gamificationPrefs: GamificationPrefs` — full gamification preferences object
   (only 3 fields from this object need to be public)

## Problem Statement

### TASK-222: `friends` UID Array

`searchPublicProfiles` and `fetchPublicProfileById` in `firestoreService.ts` return a
`friends: string[]` field containing the user's full friend UID list. Any authenticated user
reading the People directory can enumerate another user's social graph.

- PYMK (People You May Know) widget computes `mutualFriends * 3 + sharedGroups * 2` scoring
  using these UID arrays — mutual-friends computation requires the full UID list client-side
- Two PYMK scoring paths exist: inline in `PeopleYouMayKnowWidget` and exported `pymkScore`
  function — both must be updated
- **Fix**: Replace `friends: string[]` with `friendCount: number` in the public profile shape.
  Compute PYMK server-side in a Cloud Function, or drop mutual-friends signal entirely.

### TASK-223: `gamificationPrefs` in Public Doc

`updateGamificationPrefs` writes the full `GamificationPrefs` object to
`users/{uid}/profile/data`. Only 3 fields need to be public:
- `publicCrestEnabled: boolean`
- `publicSpiritIcon: string`
- `publicTierColor: string`

The rest (badges, streak settings, tier progression, notification prefs, etc.) are private
user config that should live in `users/{uid}/config/gamification`.

The Firestore catch-all owner rule (`match /users/{userId}/{document=**}`) already covers
`config/` subcollection reads/writes for the owner, so no new rules are needed.

## Proposed Solution

### TASK-222: Replace `friends[]` with `friendCount`

1. Update `PublicProfileInfo` and `PublicProfileDetails` interfaces — replace `friends: string[]`
   with `friendCount: number`
2. Update `searchPublicProfiles` — select `friendCount` (or compute from `friends.length` server-
   side via projection, or store denormalized); stop returning `friends` array
3. Update `fetchPublicProfileById` — same projection change
4. Update `SocialContext` — remove `friends: p.friends ?? []` from public profile mapping;
   replace with `friendCount: p.friendCount ?? 0`
5. Update `PeopleYouMayKnowWidget` — remove mutual-friends signal from PYMK scoring; score
   by `sharedGroups * 2` only (or drop PYMK entirely as a simplification)
6. Remove/update exported `pymkScore` function — remove `friendIds` from `PymkCandidate` type;
   recompute score without mutual-friends term
7. Update Firestore profile writes — when updating friends list, also maintain
   `friendCount` denorm field in `profile/data`

> **Scope note**: The mutual-friends PYMK signal requires the UID list to be available
> client-side. Since we're removing `friends[]` from the public doc, the signal must either
> move server-side (Cloud Function) or be dropped. For this task, **drop the mutual-friends
> signal** — the `sharedGroups` signal remains valid and does not require private data.

### TASK-223: Move `GamificationPrefs` to Private Subcollection

1. Add `loadGamificationPrefs(uid)` to `firestoreService.ts`:
   - Reads `users/{uid}/config/gamification`
   - If absent, falls back to `profile/data.gamificationPrefs` (read-time migration)
   - Returns `GamificationPrefs` with defaults for missing fields
2. Update `updateGamificationPrefs(uid, prefs)` to use `writeBatch`:
   - Batch write 1: full `GamificationPrefs` → `users/{uid}/config/gamification`
   - Batch write 2: `{ publicCrestEnabled, publicSpiritIcon, publicTierColor }` → `users/{uid}/profile/data` (merge)
   - Remove old full `gamificationPrefs` field from `profile/data` in the same batch
3. Add `defaultGamificationPrefs(): GamificationPrefs` utility function
4. Update `AuthContext`:
   - After loading `profile/data`, call `loadGamificationPrefs(uid)` as second read
   - Store result in `gamificationPrefs` state (currently sourced from `profile/data`)
   - Remove `gamificationPrefs` from the `profile/data` onSnapshot mapping
5. Update `ProfileSettings` read path — source gamif prefs from the new private location
6. Verify Firestore rules — no changes needed (catch-all owner rule covers `config/` already)

## Technical Considerations

### Firestore Rule Coverage

The existing catch-all `match /users/{userId}/{document=**}` rule in `firestore.rules:52-54`
already grants full read/write to the owner for `config/gamification`. No rule changes needed.

The 3 denormalized public fields (`publicCrestEnabled`, `publicSpiritIcon`, `publicTierColor`)
remain in `profile/data` which is world-readable — this is intentional and correct.

### Atomic Write Safety (TASK-223)

`updateGamificationPrefs` MUST use `writeBatch` (not two separate writes) to avoid the window
where `config/gamification` is updated but `profile/data` still has stale denorm values (or
vice versa). Partial failure should leave both paths unchanged.

### Read-Time Migration (TASK-223)

Existing users have `gamificationPrefs` in `profile/data` but no `config/gamification` doc.
`loadGamificationPrefs` must handle the absent doc gracefully:

```
config/gamification exists → return it (already migrated or newly written)
config/gamification absent → read profile/data.gamificationPrefs → write-through to config/gamification
config/gamification absent AND profile/data.gamificationPrefs absent → return defaultGamificationPrefs()
```

Write-through migration only runs once per user (first sign-in after deploy).

### AuthContext Second Read (TASK-223)

`loadGamificationPrefs` can be called in parallel with the existing `getDoc(profileRef)` call
using `Promise.all`. This keeps the single loading state and avoids a second loading spinner.

The `onSnapshot` listener on `profile/data` should no longer map `gamificationPrefs`. A
separate listener on `config/gamification` is optional for real-time gamif updates; a
one-time `getDoc` on login is sufficient for this phase.

### PYMK Scoring Change (TASK-222)

`pymkScore` currently returns `mutualFriends * 3 + sharedGroups * 2`. After removing
`friends[]` from public profiles, `mutualFriends` will always be 0. Rather than leaving dead
code, remove the `mutualFriends` term and simplify to `sharedGroups * 2`. Update `PymkCandidate`
to remove the `friendIds` field.

### `friendCount` Denormalization (TASK-222)

`friends` is stored as an array in `profile/data` today (used for array-contains queries in
friend request acceptance). The public projection should expose `friendCount: number` rather
than the raw array. Two options:

- **Option A (preferred)**: Store a separate `friendCount` field in `profile/data`, maintained
  via the existing friend accept/remove logic. Clean and cheap.
- **Option B**: Compute `friendCount = friends.length` in `searchPublicProfiles` and
  `fetchPublicProfileById` via a Cloud Function or client-side after filtering. More complex.

Use Option A — add `friendCount` denorm writes alongside existing friend list mutations.

## Acceptance Criteria

- [x] TASK-222: `searchPublicProfiles` returns `friendCount: number`, not `friends: string[]`
- [x] TASK-222: `fetchPublicProfileById` returns `friendCount: number`, not `friends: string[]`
- [x] TASK-222: `PublicProfileInfo`, `PublicProfileDetails`, `PublicProfile` types updated
- [x] TASK-222: `PymkCandidate.friendIds` field removed; `pymkScore` simplified to groups-only
- [x] TASK-222: `PeopleYouMayKnowWidget` no longer reads friend UID arrays from public profiles
- [x] TASK-222: Friend accept/remove logic maintains `friendCount` denorm in `profile/data`
- [x] TASK-223: `updateGamificationPrefs` uses `writeBatch` (atomic dual-path write)
- [x] TASK-223: Full `GamificationPrefs` is written to `users/{uid}/config/gamification`
- [x] TASK-223: Only `publicCrestEnabled`, `publicSpiritIcon`, `publicTierColor` written to `profile/data`
- [x] TASK-223: `gamificationPrefs` blob removed from `profile/data` after migration (set to null on write)
- [x] TASK-223: `loadGamificationPrefs` handles absent doc with read-time migration + write-through
- [x] TASK-223: `ProfileSettings` reads gamif prefs from `config/gamification` via `loadGamificationPrefs`
- [x] TASK-223: `DEFAULT_GAMIFICATION_PREFS` used as fallback (replaces `defaultGamificationPrefs()`)
- [x] All TypeScript types updated — no `any` casts introduced
- [x] TypeScript build clean (2 pre-existing unrelated errors remain: GlobalSearchModal.bio, exportImage.canDownloadFile)
- [ ] No regression in People page, PYMK widget, Profile settings, or gamification display

## System-Wide Impact

### Interaction Graph
- `updateGamificationPrefs` → triggers `writeBatch` → writes `config/gamification` + `profile/data`
- `AuthContext.loadUserProfile` → now calls `loadGamificationPrefs` in parallel → populates
  separate state slice → consumed by Layout + ProfileSettings
- `friendAccept` / `friendRemove` → must now also update `friendCount` in `profile/data`
- `SocialContext` directory → maps `friendCount` instead of `friends[]` → `PeopleYouMayKnowWidget`
  receives `friendCount` → no longer passes `friendIds` to `pymkScore`

### State Lifecycle Risks
- **Gamif migration window**: Between deploy and first write, `config/gamification` is absent.
  `loadGamificationPrefs` must not throw on missing doc — use `getDoc` with null check.
- **Partial batch failure**: If `writeBatch.commit()` fails, both paths stay at pre-write state.
  No orphaned state risk.
- **friendCount drift**: If any code path adds/removes friends without updating `friendCount`,
  the count drifts. Audit all friend mutation paths before shipping.

### API Surface Parity
- `searchPublicProfiles` and `fetchPublicProfileById` both return `PublicProfileInfo` —
  both must be updated together or types diverge.
- `ProfileSettings` and `AuthContext` both consume gamif prefs — both must switch to new source.

## Dependencies & Risks

- **Low risk**: Changes are isolated to specific service functions and the AuthContext loader
- **Migration risk**: `loadGamificationPrefs` fallback path must be tested for users with no
  `config/gamification` doc and no `gamificationPrefs` in `profile/data`
- **Friend count accuracy**: Existing users' `friendCount` fields will be absent until a
  friend operation occurs after deploy, or until a backfill runs. Treat absent as 0.
- **No Firestore rule changes required** — confirms no security regression from rule changes

## Files to Modify

- `app/src/lib/firestoreService.ts` — `searchPublicProfiles`, `fetchPublicProfileById`,
  `updateGamificationPrefs` (→ batch), add `loadGamificationPrefs`, add `defaultGamificationPrefs`
- `app/src/types/` — `PublicProfileInfo`, `PublicProfileDetails`, `PublicProfile`,
  `PymkCandidate` (remove `friendIds`); gamification types
- `app/src/contexts/SocialContext.tsx` — remove `friends[]` mapping, add `friendCount`
- `app/src/contexts/AuthContext.tsx` — parallel load of `config/gamification`, remove
  `gamificationPrefs` from `profile/data` snapshot mapping
- `app/src/components/PeopleYouMayKnowWidget.tsx` — remove mutual-friends PYMK signal
- `app/src/pages/ProfileSettings.tsx` (or wherever gamif prefs are read) — update read path
- Any friend accept/remove functions — add `friendCount` increment/decrement

## Sources & References

### Internal References
- `app/src/lib/firestoreService.ts:260-296` — `searchPublicProfiles`, `PublicProfileInfo`
- `app/src/contexts/SocialContext.tsx:88` — `friends: p.friends ?? []` mapping
- `app/src/contexts/AuthContext.tsx` — `loadUserProfile`, `gamificationPrefs` state
- `firestore.rules:52-54` — catch-all owner rule covering `config/` subcollection
- `firestore.rules:74-86` — `profile/data` write validation (publicSpiritIcon, publicTierColor)
- Security audit finding: 2026-03-20, `security-sentinel` review of PR #3

### Related Tasks
- TASK-222, TASK-223 in `planning/TODO.md`
- TASK-108 (household permissions), TASK-109 (parental controls) — prior security hardening phases
