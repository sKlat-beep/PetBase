# Development Log (Archive: Task Logs — 2026-03-09 & 2026-03-14)

> Task-1 through Task-36, TypeScript strict mode, Pet Cards overhaul, Brainfile removal, agent/skill layer, mobile + profile fixes, dashboard/pets redesign.

# Development Log (Archive)

## [2026-03-14] TASK-36: My Pets Page Redesign Phase 2 [DEPLOYED]
Deploy: `firebase deploy --only hosting` — exit 0. 31 files uploaded. Hosting URL: https://petbase-ddfd7.web.app
Task moved to `done`.

## [2026-03-14] TASK-36: My Pets Page Redesign Phase 2 [VERIFIED]
Fields checked: none (UI-only, no new Firestore writes).
Build: PASS. UI Review: PASS (violations found and resolved, 2 review passes).

## [2026-03-14] TASK-36: My Pets Page Redesign Phase 2 [COMPLETE]
Build: npm run build exit 0 (4.71s). TypeScript: 0 errors in new files.
UI Review: PASS — 11 components reviewed, all violations resolved.
New: 10 components in `app/src/components/pets/`, `Pets.tsx` gutted to 295 lines.
Features: compact card grid, PetDetailModal hub, PetFAB, PetLostConfirmModal,
skeleton loading, live age from birthday, vaccine dots, gallery lightbox,
section state localStorage persistence, full a11y (dialog role, focus trap, Escape).

## [2026-03-14] TASK-35: Dashboard Redesign Phase 1 — Redeployed [DEPLOYED]
firebase deploy --only hosting — EXIT 0. 30 files uploaded. https://petbase-ddfd7.web.app
Build: npm run build exit 0 (2206 modules, 26 assets). Redeployed in current session to confirm dist is current.
Backup: backups/phase-7-2026-03-14.zip (Dashboard.tsx, Layout.tsx, index.css).

## [2026-03-14] TASK-35: Dashboard Redesign Phase 1 [VERIFIED]
Fields checked: none (UI-only, no new Firestore writes).
Changes: glass surfaces on all widgets, inline Edit Layout mode (Reorder.Group), DraggableWidget
component, Quick Actions widget, Hidden Widgets row, EmergencyModal glass + a11y pass,
expense form label fix, motion-safe guards, useReducedMotion on all animations.
Build: PASS. UI Review: PASS (20 violations found and resolved across 2 review passes).

## [2026-03-14] TASK-35: Dashboard Redesign Phase 1 — Deployed [DONE]
firebase deploy --only hosting — EXIT 0. 27 files uploaded. https://petbase-ddfd7.web.app
Changes: glass surfaces on all widget cards, inline Edit Layout mode with Reorder drag-and-drop, DraggableWidget component (replaces CustomizeModal), Quick Actions widget, Hidden Widgets re-show row, EmergencyModal glass surface + full a11y pass, expense form label fix, motion-safe guards, useReducedMotion on all animations.

## [2026-03-14] TASK-22/27/28/29: Mobile + Profile Fixes — Deployed [DONE]
firebase deploy --only hosting — EXIT 0. 27 files uploaded. https://petbase-ddfd7.web.app
Changes: Vet Card key-prop init fix (TASK-22), profile picture save + avatar tokenization fix (TASK-27), pb-16 md:pb-0 mobile sidebar overlap fix (TASK-28), Services added to mobile bottom nav / 7-item parity / aria-label / motion-safe (TASK-29).

## [2026-03-14] TASK-22: Vet Card Template Initialization [VERIFIED]
Fields checked: none (UI-only fix, no Firestore writes). Build: PASS. UI Review: PASS.

## [2026-03-14] TASK-28: Mobile Sidebar Overlap Fix [VERIFIED]
Fix: pb-16 md:pb-0 on aside element. Added motion-safe: prefix to transition-transform.
Added aria-label="Open menu" to hamburger button. Build: PASS. UI Review: PASS.

## [2026-03-14] TASK-29: Mobile Bottom Nav Feature Parity [VERIFIED]
Services (Find Services) re-added to mobile bottom nav after TASK-33 displaced it.
7 items: Dashboard, Pets, Community, People, Messages, Services, Cards — full desktop parity.
Build: PASS. UI Review: PASS.

## [2026-03-14] TASK-34: Community Platform (Groups) — Deployed [DONE]
Deploy sequence completed. All targets succeeded.
- firebase deploy --only hosting: EXIT 0 — 27 files, https://petbase-ddfd7.web.app
  - GroupRetentionModal component, GroupHub updates, CommunityContext updates included
- firebase deploy --only functions: EXIT 0
  - deleteExpiredGroupPosts(us-central1): created (scheduled function, configurable group retention)
  - sendReport(us-central1): updated
  - findServices(us-central1): updated
  - resolveAvatarToken(us-central1): updated
  - deleteExpiredMessages(us-central1): updated
  - Note: firebase-functions package version warning (non-blocking, same as prior session)
Task status set to done in planning/TODO.md.

## [2026-03-14] TASK-33: Messaging Platform (DMs) — Deployed [DONE]
Deploy sequence completed. All targets succeeded.
- firebase deploy --only firestore:indexes: EXIT 0 — 2 composite indexes deployed (messages/participants+createdAt, messages/threadId+createdAt)
- firebase deploy --only functions: EXIT 0
  - deleteExpiredMessages(us-central1): created (scheduled function, 365-day retention)
  - sendReport(us-central1): updated
  - findServices(us-central1): updated
  - resolveAvatarToken(us-central1): updated
  - Note: firebase-functions package version warning (non-blocking); cloudscheduler API auto-enabled for scheduled function
- Hosting and firestore:rules were deployed in prior session (EXIT 0)
- Hosting URL: https://petbase-ddfd7.web.app
Task status set to done in planning/TODO.md.

## [2026-03-14] TASK-33: Partial Deploy — BLOCKED [FAIL]
Deploy sequence halted at step 3 (firestore:indexes). Steps 1 and 2 succeeded.
- firebase deploy --only hosting: EXIT 0 (26 files, https://petbase-ddfd7.web.app)
- firebase deploy --only firestore:rules: EXIT 0 (compiled clean)
- firebase deploy --only firestore:indexes: EXIT 1 — HTTP 400 from Firebase API
  Rejected index: messages/expiresAt ASCENDING (single-field only).
  Firebase reports single-field indexes must be managed via fieldOverrides, not the indexes array.
  Fix required: remove the single-field expiresAt entry from firestore.indexes.json indexes array
  and add it to fieldOverrides instead (or remove it if default single-field index suffices).
- firebase deploy --only functions: NOT RUN (halted per hard rules)
Task status remains `review`. Requires PM-approved fix before re-deploy.

## [2026-03-14] TASK-33: Privacy Check — PASS [VERIFIED]
Fields checked: messageContent, messageFromUid, messageToUid, messageThreadId, messageParticipants, messageCreatedAt, messageExpiresAt, messageRead, messageDeletedBySender, messageDeletedByRecipient
9 fields added to UNRESTRICTED_DATA dictionary (structural routing keys and state flags — no PII).
Both builds: PASS. UI review: PASS. Privacy check: PASS.

## [2026-03-14] TASK-31: Household System and Management — Deployed [DONE]
Deployed: firebase deploy --only hosting — exit 0.
Targets: hosting (25 files, HouseholdPetsPanel lazy-loaded chunk included).
Hosting URL: https://petbase-ddfd7.web.app
Task status set to done in planning/TODO.md.

## [2026-03-14] TASK-32: Public User Profile View — Deployed [DONE]
Deployed: firebase deploy --only hosting,firestore:rules — exit 0.
Targets: hosting (24 files, PublicProfilePanel-C3SV1JcB.js included), firestore:rules (compiled clean).
Hosting URL: https://petbase-ddfd7.web.app
Task status set to done in planning/TODO.md.

## [2026-03-14] TASK-31: Household System and Management [VERIFIED]
Fields checked: petName, petBreed, petSpecies, petVisibility, displayName (member), householdName, inviteCode, householdOwnerId
3 fields added to UNRESTRICTED_DATA dictionary: householdName, inviteCode, householdOwnerId.
Both builds: PASS. UI review: PASS. Privacy check: PASS.

## [2026-03-14] TASK-32: Public User Profile View [VERIFIED]
Fields checked: username, petName, petBreed, petSpecies, avatarShape, petVisibility, avatarUrl, publicStatus, displayName
username added to UNRESTRICTED_DATA dictionary (previously unclassified, already in production path).
Build: PASS (exit 0). UI review: PASS. Privacy check: PASS.

## [2026-03-14] TASK-30: Deployed to Firebase Hosting [DEPLOYED]
hosting: firebase deploy --only hosting — 23 files, release complete.
Hosting URL: https://petbase-ddfd7.web.app

## [2026-03-14] TASK-30: Remove Location Popup Modal [VERIFIED]
LocationPromptModal.tsx deleted. No dead imports in Layout.tsx or any other file.
Build: PASS (exit 0). Modal does not appear on dashboard load or profile save.

## [2026-03-14] TASK-27: Privacy Check — PASS [VERIFIED]
Fields checked: displayName, address, avatarUrl, avatarShape, profileVisibility, publicStatus
Dictionary updated: avatarShape, profileVisibility, publicStatus added to UNRESTRICTED_DATA.
tokenService fallback scoped to data: and lh OAuth URLs only — Storage URLs never bypassed.

## [2026-03-14] TASK-27: Profile Picture Save + Search Visibility [COMPLETE]

AuthContext.tsx: Added optimistic setProfile in updateProfile before Firestore write.
ProfileSettings.tsx: Replaced saveUserProfile direct call with updateContextProfile from AuthContext.
SocialContext.tsx: searchUsers falls back to p.avatarUrl when getAvatarUrl returns ''.
Build: PASS. UI Review: PASS.

## [2026-03-14] TASK-22: Vet Card Template Initialization [COMPLETE]

Added key={cardToEdit?.id ?? 'new'} to CreateCardModal in Cards.tsx.
Forces clean remount on every open, eliminating stale state from AnimatePresence
exit-animation races where cardToEdit could remain from a prior edit session.
Build: PASS. UI Review: PASS.

## [2026-03-14] TASK-28 + TASK-29: Mobile Layout Fixes [COMPLETE]

TASK-28: Added `pb-16 md:pb-0` to aside in Layout.tsx — sidebar no longer overlaps bottom nav.
TASK-29: Mobile bottom nav updated to 6 items: Dashboard, Pets, Community, People, Services, Cards.
Build: PASS. UI Review: PASS.

## [2026-03-14] Phase 3: Housekeeping Complete [COMPLETE]

app/package.json: name → "petbase", version → "0.4.0".
functions/package.json: node engine left at "22" (Firebase runtime target, not local node).
Deleted .claude/worktrees/agent-a743ceaa/ stale worktree.
Fixed 6 stale "Brainfile task-10" comment references in source files (tokenService.ts,
crypto.ts, implementation_plan.md, jcodemunch-contract.md x2, PetBase-Roadmap.md).
Both builds: PASS. Final brainfile sweep: 5 files, all intentional (dev-log, legacy-migration,
TODO header, cleanup-plan, legacy doc). jcodemunch: 45 files, 263 symbols — clean.

NOTE (flagged for follow-up): app/package.json contains two suspicious dependencies:
  - "in": "^0.19.0" — unknown package, likely a transient or erroneous entry
  - "petbase-functions": "file:../functions" — local file dep on the Cloud Functions
    package. Frontend should not import functions code; review and remove if unused.

---

## [2026-03-14] Phase 2: Brainfile Fully Removed [COMPLETE]

Deleted .brainfile/ directory. Migrated 8 open tasks (TASK-27 through TASK-34) to
planning/TODO.md; corrected TASK-21 to done status. Deleted contracts/brainfile-contract.md,
skills/local/brainfile-intake/, skills/local/privacy-audit/, skills/local/ui-consistency/.
Rewrote docs/WORKFLOW.md (plain workflow, no YAML). Updated docs/INDEX.md, docs/SYSTEM_RULES.md,
docs/LEGACY_MIGRATION.md, agents/claude-code.md, planning/implementation_plan.md,
contracts/jcodemunch-contract.md. Deleted stale functions/lib/brainfileSync.js.
Rebuilt functions: PASS. Full brainfile sweep: clean.

---

## [2026-03-14] Phase 1: Brainfile Core Removed [COMPLETE]

Deleted functions/src/brainfileSync.ts. Removed export from index.ts. Uninstalled
@brainfile/core (3 packages removed). Deleted scripts/ directory (4 Brainfile Python
tools). functions build: PASS (clean tsc exit).

Note: functions/package.json specifies node 22, running node 24. Non-blocking — update
engine field in a future housekeeping pass.

---

## [2026-03-14] Phase 0: Agent & Skill Layer Created [COMPLETE]

Created 4 new skills (intake, privacy-check, ui-review, handoff) and 4 new agent
instruction files (ui-builder, firebase-deployer, privacy-auditor, test-validator).
Updated AGENTS.md, SKILL_MAP.yaml, REGISTRY.md. Created planning/TODO.md with
open tasks TASK-21 and TASK-22 migrated from Brainfile. Updated settings.local.json:
removed hardcoded API key (now uses ANTHROPIC_API_KEY env var), removed brainfile
MCP permissions, removed noise permissions. jcodemunch PROJECT_ROOT corrected.

## [2026-03-09] Task-22: UI Fix — Correct Default Vet Card Template Initialization [OPEN]

**Brainfile task:** task-22.
**Objective:** Fix state initialization so that when 'Create Card' is clicked, the 'Vet Card' default expiration and fields are correctly applied without needing a second click.

---

## [2026-03-09] Task-21: UI Fix — Remove Duplicate Medical Notes on Multi-Card [OPEN]

**Brainfile task:** task-21.
**Objective:** Consolidate 'Diet or Medical Notes' into 'Health & Diet' and remove redundant 'Medical Notes' section on multi-cards.

---

## [2026-03-09] Task-20: PII Fix FLAG-4/5 — Signed Avatar URL Tokenization [REVIEW]

**Brainfile contract:** task-20 (FLAG-4 / FLAG-5 from privacy audit).

**Files modified:**
- `functions/src/index.ts` — `resolveAvatarToken` upgraded to return signed Storage URL with 1-hour TTL

**What changed:**
- **FLAG-4 (`searchPublicProfiles`)**: Already remediated in task-10. `PublicProfileInfo` interface has no `avatarUrl` field; `searchPublicProfiles` never pushes `avatarUrl` in results. No code change needed.
- **FLAG-5 (`resolveAvatarToken`)**: Function previously returned the raw permanent Storage URL directly. Upgraded: if `avatarUrl` in Firestore is a Firebase Storage HTTPS URL, the function now extracts the storage object path, calls `admin.storage().bucket().file(path).getSignedUrl({ action: 'read', expires: Date.now() + 3600000 })`, and returns the signed URL. Base64 data URLs, Google auth photo URLs, and empty values are returned as-is (signing not applicable).

**Validation:**
- `npx tsc --noEmit` — zero errors (root)
- `npm run build` — clean (root)
- `cd functions && npm run build` — clean

**jCodeMunch Savings:** ~24 kB raw file reads avoided via `get_symbol` + `get_file_outline` calls.

---

## [2026-03-09] Task-10: Privacy Data Classification Contract — PII Enforcement [COMPLETE]

**Privacy contract reference:** Brainfile task-10. All RESTRICTED_PII fields encrypted before Firestore writes. No PII values logged below.

**Files modified:**
- `src/lib/firestoreService.ts` — zipCode encrypted/decrypted; avatarUrl stripped from PublicProfileInfo and searchPublicProfiles results
- `src/contexts/SocialContext.tsx` — both avatarUrl map sites changed to `''` (lazy resolution)
- `src/lib/crypto.ts` — data classification comment block added (task-10 field dictionaries)
- `src/lib/tokenService.ts` — NEW: `getAvatarUrl(uid)` Cloud Function callable helper
- `functions/src/index.ts` — `resolveAvatarToken` Cloud Function added; `firebase-admin` initialized

**What changed:**
1. **zipCode encryption** (`firestoreService.ts:saveUserProfile`): `encryptField(profile.zipCode ?? '', key)` now called before Firestore write. `loadUserProfile` correspondingly calls `decryptField(data.zipCode ?? '', key)` on read.
2. **avatarUrl tokenization** (`PublicProfileInfo`): `avatarUrl` field removed from the interface and from `searchPublicProfiles` results — raw Storage URLs no longer flow through any search/directory path.
3. **SocialContext callers**: Both `.map()` sites that read `p.avatarUrl` now emit `avatarUrl: ''` with comment noting lazy resolution via `tokenService.getAvatarUrl(uid)`.
4. **`resolveAvatarToken` Cloud Function**: Authenticated callable using Admin SDK to load the raw avatarUrl server-side. MVP returns stored URL; future phase will issue signed Storage URLs with 1-hour TTL.
5. **`src/lib/tokenService.ts`** (new file): Wraps the callable function; graceful fallback returns `''` on error.
6. **`crypto.ts` classification header**: Added RESTRICTED_PII and Tokenized field dictionaries above `encryptField`.

**Deferred:** `petCardShareUrl` tokenization — deferred to future phase (current sharing controlled by `status + expiresAt`).
**Validation:** `npx tsc --noEmit` → 0 errors (client + functions). `npm run build` → ✓.
**jCodeMunch Savings:** Index stale — used targeted Grep + offset reads. Estimated ~1,800 tokens saved vs full-file reads.

---

## [2026-03-09] Task-3: Lost Pet Alerts — Full Mark-as-Lost Trigger & Community Broadcast [COMPLETE]

**Files modified:** `src/pages/Pets.tsx`

**What changed:**
- Verified `toggleLostStatus` (Pets.tsx:91) and "Mark as Lost" / "Mark as Found" buttons were already wired on both `full-background` and `solid-color` pet card layouts.
- Imported `LostPetBanner` from `../components/LostPetBanner`.
- Added banner rendering above the pet card list: filters pets by `lostStatus?.isLost`, constructs a `LostPetAlert` from pet + profile data, renders a `<LostPetBanner>` per lost pet.
- Community broadcast infrastructure (`lostPetsApi.ts`, 15-min grace period, 3-day auto-expiration) is preserved — `updatePet` → `lostStatus` write → localStorage sync triggers existing flow.

**Validation:** `npx tsc --noEmit` → 0 errors. `npm run build` → ✓.

---

## [2026-03-09] Task-2: Global Search UI — Integrated User & Community Search Bar [COMPLETE]

**Files modified:** `src/components/Layout.tsx`

**What changed:**
- Added `searchQuery`, `searchResults`, `searchOpen`, `mobileSearchOpen` state to `Layout` component.
- Imported `useRef`, `useCallback` and `type PublicProfile` from SocialContext; `X` icon from lucide-react.
- Added `searchUsers` to `useSocial()` destructure.
- Debounced effect (300ms) calls `searchUsers()` on `searchQuery` change; filters out `visibility === 'Private'` profiles.
- Outside-click + Escape key effect closes search dropdown and clears query.
- **Desktop**: Search input bar rendered in sidebar (between logo and nav), with results dropdown showing avatar, display name, @username; max 6 results. Clicking navigates to `/people?uid={uid}`.
- **Mobile**: Search icon in header toggles `mobileSearchOpen`; sticky panel below header with autoFocus input + inline results list.
- Zero TypeScript errors; build passes.

---

## [2026-03-09] Task-1: TypeScript Strict Mode — Incremental Enablement [COMPLETE]

**Files modified:** `tsconfig.json`, `package.json`, `src/types/pet.ts`, `src/components/CalendarModal.tsx`, `src/components/ImageCropperModal.tsx`, `src/components/PetFormModal.tsx`, `src/pages/Dashboard.tsx`, `src/pages/Cards.tsx`, `src/pages/SharedCardPage.tsx`, `src/pages/GroupHub.tsx`, `src/pages/Pets.tsx`, `src/lib/firestoreService.ts`

**What changed:**
1. **Installed `@types/react@^19` + `@types/react-dom@^19`** — root cause of ~3,800 errors (TS7016/TS7026 missing JSX intrinsics). React 19 ships no bundled types.
2. **`tsconfig.json`** — Added `"strictNullChecks": true` and `"noImplicitAny": true` globally (incrementally enabled once errors reached zero).
3. **`src/types/pet.ts`** — Added `'hexagon'` to `avatarShape` union (was missing from type, used in code).
4. **`src/components/CalendarModal.tsx`** — `EventProps.id` changed to `string | number` (Dashboard passes string event IDs).
5. **`src/components/ImageCropperModal.tsx`** — Added `'hexagon'` to `shape` prop union.
6. **`src/pages/Dashboard.tsx`** — Fixed `localeCompare` on `number | ""` with `String()` coercion.
7. **`src/pages/Cards.tsx`** — Fixed 4 dead-code `editCard?.template` references post-guard (type narrowed to `never`); replaced with direct `savedCustomTemplate` reads.
8. **`src/pages/SharedCardPage.tsx`** — Removed redundant `card !== 'loading'` check (TS2367, dead after early-return); added `null` guard; `isRevoked` set to `false` since revoked cards caught above.
9. **`src/pages/GroupHub.tsx`** — `searchUsers()` is async; was called inline in JSX causing `.filter()` on `Promise`. Added `roleSearchResults` state + `useEffect` to resolve and store results.
10. **`src/pages/Pets.tsx`** — `petType: p.type ?? ''` (was `string | undefined`, `LostPetAlert` requires `string`).
11. **`src/lib/firestoreService.ts`** — `updateDoc` payload cast to `any` (strict `Record<string, unknown>` not assignable to Firestore's update type).

**Validation:** `npx tsc --noEmit` → 0 errors. `npx tsc --noEmit --strict` → 0 errors.
**jCodeMunch Savings:** Index was stale (not re-indexed per rule). Fell back to targeted line reads (~8 reads vs full-file reads saved ~2,400 tokens).

---

## [2026-03-09] Pet Cards — Personality & Play, Sortable Fields, Health & Diet Notes, UX Polish [COMPLETE]

**Files modified:** `src/pages/Cards.tsx`, `src/pages/SharedCardPage.tsx`, `src/components/PetFormModal.tsx`, `src/lib/firestoreService.ts`

**Issues fixed:**
1. **Remove subtitle under pet name**: Removed breed/age/weight `<p>` from CardPreview — already present in Pet Description grid.
2. **"Personality & Play" section**: New `personalityPlay` toggle in SharingToggles (default: true for vet/sitter, false for custom). Captures likes, dislikes, favoriteActivities, typeOfPlay, activity into snapshot. Renders as violet card. `dislikes` removed from basicInfo and moved here. Appears in both CardPreview and SharedCardPage.
3. **Sortable Shared Fields**: `fieldOrder?: string[]` added to PetCard and PublicCardDoc. CreateCardModal uses `Reorder.Group`/`Reorder.Item` from motion/react with GripVertical drag handles. Order is stored in card + Firestore. CardPreview and SharedCardPage both map over `card.fieldOrder ?? DEFAULT_ORDER` using a `sections` record lookup pattern. Preserved on Update/Update All.
4. **"Diet or Medical Notes" in PetFormModal**: Renamed Health & Diet tab's "Medical Notes" label. "Health & Diet" (diet) toggle now also shows notes alongside food info on the card. `medicalOverview` toggle renamed "Medical Notes" and remains for showing notes independently.
5. **PublicCardPetSnapshot**: Added `favoriteActivities?: string[]` and `typeOfPlay?: string` fields. PublicCardDoc: added `fieldOrder?: string[]`.
6. Build verified + deployed to https://petbase-ddfd7.web.app

---

## [2026-03-09] Pet Cards — Microchip Display, Update Card Flow, Preview/URL Parity [COMPLETE]

**Files modified:** `src/pages/Cards.tsx`, `src/pages/SharedCardPage.tsx`

**Issues fixed:**
1. **Microchip "Not Microchipped" state**: When microchip toggle is ON but the pet has no microchip ID, both the in-app `CardPreview` and the shared `SharedCardPage` now render a `ShieldOff` icon with "Not Microchipped" text instead of silently showing nothing or always saying "Microchipped".

2. **Update Card / Update All**: Added `isPetDataStale(card, pet)` helper that compares key snapshot fields (name, breed, type, image, weight, birthday, age, food, dislikes, spayedNeutered, microchipId) to current pet data. When stale: per-card amber "Update" button appears on the `CardTile`; "Update All" button appears in active cards section header. `handleUpdateCard(cardId)` rebuilds the snapshot via `buildPetSnapshot` and re-syncs to Firestore. `handleUpdateAllCards()` applies to all stale active single-pet cards.

3. **Preview/shared URL parity**: `CardPreview` avatar was using live `pet.image`, `pet.avatarShape`, `pet.backgroundColor`, `pet.name` from PetContext. Changed to use `data.image`, `(data as any).avatarShape`, `(data as any).backgroundColor`, `data.name` — where `data = card.petSnapshot ?? pet`. Now the preview matches the Firestore snapshot the shared URL renders from.

4. **SharedCardPage fixes**:
   - `dislikes` correctly rendered as `string[]` array (bullet list) instead of raw string coercion
   - Household Information check changed from `sharing.householdInfo` (didn't exist as a toggle) to `pet.householdInfo` (populated from snapshot only when `includeGeneralInfo` was true)
   - Microchip: "Not Microchipped" state added matching CardPreview

5. Build verified + deployed to https://petbase-ddfd7.web.app

---

## [2026-03-09] Pet Cards Page — Full Overhaul [COMPLETE]

**Files modified:** `src/pages/Cards.tsx`, `src/pages/SharedCardPage.tsx`

**Issues addressed:**
1. Field ordering: Household Information at top, rest alphabetical; "Basic Info" → "Pet Description"
2. Vet card: 365-day default, all fields enabled except Emergency Contact, Vet Info, General Info
3. Sitter card: 8-hour default, only Diet, Emergency Contact, General Info, Microchip ID, Medications, Vet Info enabled
4. "Emergency Card" → "Custom Card": all fields disabled default 8hr; "Save Card Template" flow (singleton template in localStorage); one active custom card enforced
5. Preview vs. shared card mismatch: both now render from same `petSnapshot` stored locally at card creation
6. Revoke → Firestore doc permanently deleted after 5-min undo window (URL goes dead); revoked URL immediately shows "This card is no longer valid."
7. Revoked/Expired list: max 10 entries (MAX_INACTIVE_CARDS), backend cleanup on purge
8. "General Information" → "Household Information" everywhere (Cards page, preview, shared card)
9. SharedCardPage (`renderPetSnapshot`):
   - "Pet Description" section header added to basicInfo
   - Dislikes ("Important Needs / Dislikes") added below the grid in amber callout
   - Household Information section renders `pet.householdInfo` when `sharing.householdInfo` is enabled
   - Microchip now shows actual `pet.microchipId` value beneath "Microchipped" label
   - Added `custom` template to `TEMPLATE_LABELS` / `TEMPLATE_COLORS` for backward compat
10. Build verified: `npm run build` — no TypeScript errors
11. Deployed to production: `firebase deploy --only hosting` — https://petbase-ddfd7.web.app

---

