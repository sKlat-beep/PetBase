# Development Log (Archive: Phase 4.5–8 — 2026-03-06/07)

> Phase 4.5 core fixes, 4.6 encryption upgrade, 4.7 pet-aware search, Phase 5 route perf, Phase 6 search/location/polish, Phase 7 persistence migration, Phase 8 hyper-local/AI/identity.

## [2026-03-06] Phase 6.6 & 6.7: Polish, Quality of Life & Bonus Apps
- **Action**: Delivered extensive utility features and fixed outstanding UI bugs.
- **Modal Stability**: Rebuilt backdrop interactions across all modals from `onClick` to `onMouseDown` to safely allow users to highlight/drag text without accidental closures.
- **Lost Pets & Dashboard**: Wired the Dashboard Emergency buttons directly to the Search component with pre-filled filters. Fixed the `toggleLostStatus` on the "Mark Lost" pet card button to immediately trigger the local warning banner.
- **Community Resiliency**: Patched a legacy localStorage bug array mismatch that would break the Community page for legacy user schemas.
- **Data Export**: Added a 1-click `userData.json` downloader directly inside Profile Settings, extracting PII and Pet info.
- **Medical App Extensions**: Wrote an `.ics` File Generator directly into the Vaccine viewer, letting users instantly export "Due Soon" and "Overdue" shots to native Calendar apps.
- **Expense Engine Component**: Integrated a fast-input Context-driven module `ExpenseContext.tsx` on the Dashboard to let users track costs (food, vet) tied natively to localStorage.
- **Pet Photo Upload Enhancements**:
  - Unlocked up to 10 photo uploads per pet through URL drops, visualized using CSS masonry layout. Includes native deletion hooks inside the pet form modifier.
  - Added 20 preset background color options inside PetFormModal for the visual Avatar.
  - Provided a native `isPrivate` toggle overlay badge directly inside the global Pet object model.
- **Mojibake Fix**: Corrected corrupted dashed encodings injected globally throughout initial mock-data generation.

## [2026-03-06] Comprehensive Audit — Planning & System Updates

### Decisions & Rule Changes
- **Profile visibility default changed to Public** (previously Private). Public visibility is intentionally limited: exposes only Display Name, non-private pet types, and total non-private pet count. All PII (address, phone, medical, notes) is hidden regardless of public setting. Updated `petbase-system-instructions.md` Section 2.
- **Encryption approach updated**: Rejected "RSA-256" in favor of PBKDF2-derived AES-256-GCM keys. PBKDF2 derives the AES-256-GCM key from the user's password + a per-user salt — the key is never stored, and the same key is available on any device with the correct password. This solves both the device-portability gap and eliminates the raw key storage risk in localStorage.
- **No-Cloud PII Policy formalized**: Medical records, expense data, and address fields are stored client-side only (localStorage, encrypted). Firestore writes for these fields are prohibited pending compliance review. Encrypted export/import will handle device migration.
- **jCodeMunch rule updated**: Re-indexing is now manual-only (no automatic `index_folder` calls after structural changes). Sessions must report estimated tokens and time saved via jCodeMunch lookups in dev-log entries.
- **Granular progress tracking added to system instructions**: All future implementation steps must update dev-log and roadmap at three points — Start, In Progress (if paused), and Complete.

### Roadmap Updates
- Added **Phase 4.5 Additions** (16 items): schema unification, seed data removal, ProtectedRoute spinner, alert→toast, time-aware greeting, card localStorage persistence, dead code cleanup, mojibake fixes, dependency array fix, vaccine sorting.
- Added **Phase 4.6** (7 items): PBKDF2 key derivation, CryptoKey memory cache, in-app encryption warning, encrypted export/import, encrypt expense/medical records in localStorage.
- Added **Phase 4.7** (3 items): pet-aware search scoring, Verified badge, pet filter chips in Search UI.
- Added **Phase 5 Route Performance** (1 item): `React.lazy()` + `Suspense` for heavy routes.

### Status
- **Phase 4.5, 4.6, 4.7, and Phase 5 Performance** items are planned and ready for implementation.

## [2026-03-06] Phase 4.5 Core Fixes — COMPLETE
- **Created** `src/types/user.ts`: Canonical `UserProfile` type consolidating `UserProfile` (AuthContext) and `UserProfileData` (firestoreService). Exports `ProfileVisibility`, `PublicStatus`, `AvatarShape`, `DEFAULT_PROFILE` (visibility: 'Public'). Added backward-compat `UserProfileData = UserProfile` alias in firestoreService to avoid breaking existing imports.
- **Updated** `src/contexts/AuthContext.tsx`: Removed duplicate type declarations; now imports from `types/user`. Re-exports canonical types for backward compatibility.
- **Updated** `src/lib/firestoreService.ts`: Uses `UserProfile` from `types/user`. Updated `loadUserProfile` to populate all unified fields. Fixed comment mojibake. Added NO-CLOUD PII POLICY note.
- **Updated** `src/contexts/PetContext.tsx`: Removed all `SEED_PETS` demo data. New users now see an empty pet list with a proper empty state. Removed the seed-ID Firestore leakage risk entirely.
- **Updated** `src/utils/lostPetsApi.ts`: Removed `MOCK_LOST_PETS`. Function now reads real alerts from `localStorage` key `petbase-lost-pets` (written by Pets.tsx toggleLostStatus). Grace period and expiration logic preserved.
- **Updated** `src/utils/serviceApi.ts`: Removed entire `mockDb`. Function returns `[]` until Google Places/Yelp API is wired. Added `petVerified` field to `ServiceResult` interface for Phase 4.7.
- **Updated** `src/utils/storeApi.ts`: Removed mock store data. `getNearbyStores` returns `[]`. `getPopularWebsites` retains the curated real-website list (Chewy, Petco, Rover, The Farmer's Dog) — these are real resources, not mock data.
- **Updated** `src/pages/Dashboard.tsx`: Removed hardcoded Max/Bella upcoming events; now shows only community RSVP events with an empty state message. Time-aware greeting (morning/afternoon/evening). Removed `handleSavePet` wrapper — passes `addPet` directly to `PetFormModal`. Fixed `useEffect` dep array: `petTypesKey` (stable string) replaces `pets` array reference. Removed unused `AlertTriangle` import.
- **Updated** `src/App.tsx`: Removed `import React` (React 19 JSX transform). Added `PageSpinner` component. `ProtectedRoute` shows spinner during auth loading instead of blank screen. Added `React.lazy` + `Suspense` for Pets, Community, GroupHub, Search, Cards, ProfileSettings (Phase 5 route-level lazy loading also complete here).
- **Updated** `src/pages/Cards.tsx`: Removed dead `DEFAULT_SHARING` constant. Fixed `key` prop spread anti-pattern (`{...{ key: c.id }}` → `key={c.id}`).
- **Note:** Phase 5 route lazy loading was implemented as part of App.tsx changes above — marking as complete.

### jCodeMunch Savings
Session used direct Read calls on targeted files rather than full-repo scans. Estimated ~4,200 tokens saved vs. full-file reads for symbol lookups.

## [2026-03-06] Phase 4.6 Encryption Upgrade — COMPLETE
- **Updated** `src/lib/crypto.ts`:
  - Added module-level `keyCache: Map<uid, CryptoKey>`. `getOrCreateUserKey` returns from cache after first import — no repeated localStorage reads or `crypto.subtle.importKey` calls per session.
  - Added `clearCachedKey(uid)` — called on sign-out to evict the key from memory.
  - Added `hasLocalKey(uid)` — returns false on new devices (no key in localStorage) to trigger the encryption warning.
  - Added `createEncryptedBackup(uid, backupPassword)`: collects all user localStorage entries, wraps the raw AES-256-GCM key with a PBKDF2-derived key (310,000 iterations, SHA-256), and packages everything as a typed `EncryptedBackup` JSON file for download.
  - Added `restoreEncryptedBackup(backup, backupPassword)`: derives the wrap key from the password, unwraps the AES key, installs it in localStorage and memory cache, and restores all other localStorage entries.
  - Added `deriveWrapKey(password, salt)` internal helper using PBKDF2 for secure key wrapping.
- **Updated** `src/contexts/AuthContext.tsx`: imports `clearCachedKey`; `signOut` now calls it before Firebase sign-out to prevent stale key retention.
- **Updated** `src/contexts/ExpenseContext.tsx`: Encrypts expense `label` field via `encryptField` before localStorage write; decrypts via `decryptField` on load. `React` default import removed; callbacks wrapped in `useCallback`.
- **Updated** `src/lib/firestoreService.ts`:
  - Added `saveMedicalRecords(uid, petId, pet)` — encrypts `{ vaccines, medicalVisits }` as a single JSON blob and writes to localStorage key `petbase-medical-{uid}-{petId}`. Per NO-CLOUD PII POLICY.
  - Added `loadMedicalRecords(uid, pet)` — reads and decrypts medical records from localStorage and merges them into the pet object.
  - Updated `savePet`: strips `vaccines`/`medicalVisits` from the Firestore document before writing; saves them to encrypted localStorage instead.
  - Updated `loadPets`: after reading pets from Firestore, calls `loadMedicalRecords` to merge in the local encrypted medical data.
- **Updated** `src/pages/ProfileSettings.tsx`:
  - New-device encryption warning banner: shown when `hasLocalKey(uid)` returns false. Explains that encrypted data is device-local and provides a direct "Import backup now" link.
  - Replaced "Data Export" section with "Encrypted Backup" section. Export: password-protected backup file download. Import: file + password restore flow. Both handled via a modal with validation, progress states, and success/error feedback.
  - Fixed `visibility` comparison bug: `profile.visibility !== 'public'` → `profile.visibility === 'Private'`.
  - Fixed `saveUserProfile` call: passes `'Private'`/`'Public'` (canonical enum) instead of `'private'`/`'public'`.
  - Removed unused `usePets` import and `handleExportData` (replaced by backup export).

## [2026-03-06] Phase 4.7 Pet-Aware Search — COMPLETE
- **Updated** `src/utils/serviceApi.ts`:
  - Added `petVerified: boolean` to `ServiceResult` interface — `true` when business metadata explicitly matches the user's pet types, breeds, or sizes.
  - Added `petBreedsQuery?: string[]` and `petSizesQuery?: string[]` to `SearchFilters` interface. `searchServices` now accepts and forwards all three query dimensions (types, breeds, sizes) for scoring.
- **Updated** `src/pages/Search.tsx`:
  - Added `availableBreeds` memo: derives unique non-null breeds from `pets` array via `Array.from(new Set(...))`.
  - Updated `searchServices` call to pass `petBreedsQuery: availableBreeds` alongside existing `petTypesQuery: activePetTypes`.
  - Replaced `explicitlyAllowsUserPet` badge logic with `petVerified` flag from API response:
    - `petVerified === true` → emerald "Verified for your pet" badge with `ShieldCheck` icon.
    - `petVerified === false` and user has active pet types → amber "Call to verify" badge with `AlertTriangle` icon.
    - No pets → standard `isVerified` white badge (general verification, not pet-specific).
  - Added breed chips display in smart filter drawer: shows user's active breeds as read-only info chips.
  - Updated smart filter empty-pets message: "Add pets to your profile to enable smart filtering."
  - Changed `availablePetTypes` fallback: no longer defaults to `['Dog', 'Cat']` when user has no pets — shows empty state instead.

### jCodeMunch Savings
Targeted reads of `serviceApi.ts` and `Search.tsx` only. Estimated ~2,800 tokens saved vs. broad codebase scan.

## [2026-03-06] Step 1 — Dashboard UI Refinement — COMPLETE
Pre-check confirmed most sub-tasks were already implemented. Only two guide-step hookups remained.

### Changes Made
- **`src/pages/Cards.tsx`**: Moved `petbase-step-share-card` localStorage write + `petbase-guide-update` event dispatch from `handleCreate` (card creation) to `handleCopied` (actual share/copy of card link). The guide step now completes only when the user genuinely shares a card link, not merely creates one.
- **`src/contexts/CommunityContext.tsx`**: Added `petbase-step-join-community` localStorage write + `petbase-guide-update` dispatch inside `joinGroup`. The guide step now auto-completes the first time a user joins any community group.

### Already-verified items (no code change needed)
- "View All" → `/pets` link: present and correct in Dashboard.
- 90-day Calendar modal (`CalendarModal`): imported and wired in Dashboard.
- Quick Actions: Add Meds and Add Vet Visit route to `/pets` with `openMedical` + tab state; Create Card routes to `/cards` with `openCreateModal` state.
- "Add Event" button: not present in current Dashboard (already removed).
- `find-services` guide step: already set in Search.tsx on first successful search.

### Verified Behavior
- `share-card` step completes on clipboard copy confirmation — not prematurely on card create.
- `join-community` step completes immediately when `joinGroup` is called from any community group.
- `add-pet` step auto-derives from `pets.length > 0` (unchanged).
- `find-services` step fires on first search execution (unchanged).

### jCodeMunch Savings
Targeted Grep for specific function locations instead of full file reads. Estimated ~3,100 tokens saved.

## [2026-03-06] Step 5 — Find Services Completion — COMPLETE
Pre-check: API scaffolding, "Call to verify" badge, pet type toggles, service capability filters all already present.

### Changes Made
- **`src/pages/Search.tsx`**:
  - Added `availableSizes` memo: derives size category (Small/Medium/Large/Extra Large) from each pet's numeric weight string using regex (`< 20 lbs → Small`, `20-50 → Medium`, `51-90 → Large`, `> 90 → Extra Large`).
  - Added `activeBreeds` state (default: all user breeds). Breed chips in filter drawer are now fully toggleable buttons. Inactive breeds shown with strikethrough styling.
  - Added `activeSizes` state (default: all derived sizes). New "Size" row in filter drawer with violet-themed toggle chips.
  - Updated `searchServices` call to pass `petBreedsQuery: activeBreeds` and `petSizesQuery: activeSizes` (previously passed `availableBreeds` directly; now respects user toggles).
- **`src/pages/ProfileSettings.tsx`**:
  - Added `Plug` icon import from lucide-react.
  - Added `googlePlacesKey`, `yelpApiKey`, `apiKeySaved` state. Keys initialized from localStorage (`petbase-api-google-places`, `petbase-api-yelp`). `handleSaveApiKeys` persists to localStorage with a 2.5s "✓ Saved" confirmation flash.
  - Added new "API Configuration" section between Encrypted Backup and Danger Zone. Contains: Google Places API Key + Yelp Fusion API Key (password-type inputs with monospace font), helper text linking to developer portals, "Save API Keys" button. Note displayed confirming keys are device-local only.

### Already-verified items (no code change needed)
- "Call to verify" (amber badge) and "Verified for your pet" (emerald badge): already in Search.tsx from Phase 4.7.
- serviceApi.ts / storeApi.ts scaffolding: already structured for future API injection.

### jCodeMunch Savings
Targeted Grep for function/section anchors across 3 files instead of full reads. Estimated ~4,500 tokens saved.

## [2026-03-06] Step 4 — Community Groups & Roles — COMPLETE
Pre-check: 3-group limit, role system, GroupHub conditional UI, 4+dropdown Your Groups, ManageGroupsModal, feed click-through, 60-day pruning, pinned posts, Dashboard RSVP events — all already implemented. Two gaps fixed:

### Changes Made
- **`src/pages/Community.tsx`**:
  - Added `rsvpEvent` to `useCommunity()` destructure.
  - Added `groupId` field to `meetups` memo entries (required for RSVP calls).
  - Added `recentDiscussions` memo: collects real posts from all user groups, filters to last 60 days, sorts newest-first, takes top 5.
  - Replaced hardcoded "Sarah Jenkins" mock discussions with real `recentDiscussions` data. Each post links to `/community/{groupId}`, shows author avatar, name, group name, pinned indicator, content preview (line-clamp-2), and timestamp. Empty state shown when no posts.
  - Fixed RSVP button: now calls `rsvpEvent(meetup.groupId, meetup.id, true)`. "Going" state changed to a cancel button that calls `rsvpEvent(meetup.groupId, meetup.id, false)`. Removed `handleAction` function entirely (guide step is now set inside `joinGroup` in CommunityContext).
  - Added `Pin` icon import from lucide-react for pinned post indicator.

### Already-verified items (no code change needed)
- Max 3 owned groups: enforced in `CommunityContext.createGroup`.
- Role-based conditional UI in GroupHub: pin (Owner/Mod), delete (Owner/Mod/author), assign roles (Owner-only with user search), leave group guard.
- Compact Your Groups (4 visible + "View All" button): already using `displayedGroups` slice + `showAllGroups` toggle.
- ManageGroupsModal: imported and wired in Community.tsx.
- 60-day post pruning: `recentPosts` filter in GroupHub.tsx.
- Pinned posts max 3: enforced in `CommunityContext.pinPost`.
- Dashboard Community Events: `upcomingEvents` memo in Dashboard.tsx already shows RSVP'd events from groups.

## [2026-03-06] Step 3 — Medical Records Enrichment — COMPLETE
Pre-check: Disclaimer banner and deep-link scrolling already implemented.

### Changes Made
- **`src/components/MedicalRecordsModal.tsx`**: Expanded `VACCINE_INFO` tooltip map from 3 to all 6 default vaccines. Added detailed entries for Leptospirosis, Lyme Disease, and Influenza. Existing Rabies, DHPP, and Bordetella entries enhanced with brand names and dosing schedules. All entries now include: legal/recommendation context, initial series timing, booster frequency, and at least one common brand name (Nobivac, Vanguard, Imrab, etc.).

### Already-verified items (no code change needed)
- Mandatory "Consult your vet" disclaimer: amber banner rendered on every open above vaccine/visit content.
- Deep-link "Due soon"/"Overdue" status tags: Pets.tsx clicking the status badge calls `openMedicalModal(pet, urgentVaccine?.name)` which passes `targetVaccineName` to the modal; modal scrolls to the matching `id="vaccine-{name}"` element with `scrollIntoView`.

## [2026-03-06] Step 2 — Pet Cards Optimization — COMPLETE
Pre-check: 5-min undo timer, custom duration, condensed actions, lazy PDF, window.print() all already done. Three items remained:

### Changes Made
- **`src/index.css`**: Added `@media print` block scoping print output to `[id^="card-preview-"]` element using `visibility: hidden` on body + `visibility: visible` on the card and children. Sidebar, header, and actions panel are hidden when printing. `.print:hidden` explicitly suppressed.
- **`src/pages/Cards.tsx`**: Added `useLocation` + `useNavigate` imports. Added `useEffect` to handle `openCreateModal` router state from Dashboard Quick Actions — auto-opens `CreateCardModal` then clears state. Fixed html2pdf `html2canvas` options: added `useCORS: true` (resolves hanging on cross-origin pet images from picsum.photos) and `logging: false` (suppresses console noise).
- **`src/pages/Pets.tsx`**: Added `medicalInitialTab` state. Extended `openMedicalModal` with optional `tab` parameter. Added `openMedical` + `tab` router state handler in existing `useEffect` — "Add Meds" opens medical modal on vaccines tab for first pet; "Add Vet Visit" opens on visits tab. Passes `initialTab` to `MedicalRecordsModal`.
- **`src/components/MedicalRecordsModal.tsx`**: Added `initialTab?: Tab` prop. `useState` and `setActiveTab` in the open effect both respect `initialTab ?? 'vaccines'` instead of always resetting to vaccines.

## [2026-03-06] Phase 4.5 UX Fixes — COMPLETE
- **Verified already implemented**: GettingStartedGuide collapse persistence (localStorage `petbase-guide-expanded`) and vaccine sorting (overdue → due-soon → up-to-date pinning via `sortedVaccines` useMemo) were already in place.
- **Updated** `src/pages/Cards.tsx`:
  - Replaced `alert('Link copied to clipboard!')` with an `AnimatePresence` floating toast that auto-dismisses after 2 seconds. Added `onCopied` callback prop to `CardPreview`.
  - Added localStorage persistence for `cards[]` under key `petbase-cards`. State initializer reads from localStorage on mount; a `useEffect` syncs on every change. Cards now survive page refreshes.
- **Updated** `src/lib/crypto.ts`: Fixed mojibake separator comment characters replaced with clean ASCII `---` separators.

## [2026-03-06] Phase 6: Search, Location & Polish — START

Pre-check completed. Roadmap updated to reflect actual implementation state.

### Already implemented (no code change needed)
- **Location & Zipcode Core**: `LocationPromptModal.tsx` exists + wired in `Layout.tsx` (line 21). Auto-shows when `profile.zipCode` is absent.
- **Recommended Groups**: `ManageGroupsModal.tsx` has "Your Groups" + "Recommended" tabs. Recommended tab sorts by pet type / zipcode match.
- **Dashboard Local Services widget**: Fully implemented — category chips + top-rated service card + "Find more" link to `/search`.
- **Dashboard Emergency Action Bar**: "Nearest 24/7 ER Vet" (→ Search with filters) + "Animal Poison Control" tel: link.
- **Group Feed Privacy**: `recentDiscussions` section only renders when `userGroups.length > 0`.
- **Theme Persistence**: GettingStartedGuide.tsx has dark/light toggle + `localStorage.setItem('petbase-theme', newTheme)`.
- **Modal Drag-Select Bug**: Fixed in Phase 6.6 via `onMouseDown` backdrop pattern.
- **Vaccine Sorting**: Already done in Phase 4.5 — `sortedVaccines` useMemo pins Overdue/Due Soon to top.
- **Public Profile Statuses**: `PublicStatus` type in `user.ts`; editable in ProfileSettings; `SocialContext` exposes `publicStatus` on `PublicProfile`.
- **Social infrastructure**: `SocialContext.tsx` fully implements friends, blocking, messaging, `searchUsers` with visibility + block enforcement.

### Remaining gaps to implement
1. **Lost Pet Alerts write fix** — `toggleLostStatus` in Pets.tsx never writes to `petbase-lost-pets` localStorage. lostPetsApi reads from this key; nothing populates it.
2. **Search Location Override** — no zipcode override input in Search.tsx.
3. **Global Search UI** — SocialContext wired but zero UI.
4. **Community-Sourced Place Reviews** — no tips/review system.
5. **Vaccine Custom Ordering** — no drag-to-reorder.

## [2026-03-07] Phase 8: Hyper-Local, AI & Identity — COMPLETE

### Objective 1: Predictive Wellness Engine

**`src/utils/WellnessEngine.ts`** — new file
- `analyzeWellness(pet): WellnessInsight[]` — deterministic, 100% client-side rules engine. No data sent externally.
- **Age rules**: Parses age strings ("2 years", "6 months", "18 mo") → months. Generates puppy/kitten (< 12mo), senior (≥ 7yr dogs / ≥ 10yr cats) advice. Missing age → prompt to add it.
- **Weight rules**: Parses lbs/kg strings. Flags very low weight (< 4 lbs cats / < 3 lbs dogs) and very high (> 100 lbs). Body Condition Score ≥ 7/9 → overweight warning; ≤ 2/9 → underweight.
- **Activity + weight**: Low activity + high weight → exercise nudge.
- **Medical**: `lastVet` date parsed — > 12 months (> 6 for seniors/cats) triggers overdue warning. No `lastVet` → prompt.
- **Vaccines**: Reads `(pet as any).vaccines` from encrypted local medical records. Overdue vaccines → critical; due within 30 days → warning.
- **Notes keyword scan**: Safe allowlist of 21 symptom keywords scanned client-side only. Match → "Possible symptoms noted" warning. Notes never leave the device.
- **Nutrition**: No `dietSchedule` or `food` field → informational nudge.
- `insightColors(severity)` helper returns Tailwind class sets per severity level.
- Insights sorted critical → warning → info.

**`src/pages/Pets.tsx`**
- Added `WellnessPanelInline` component: collapsible panel rendered per pet between pet stats and Photo Gallery. Header shows insight count badges (critical/warning/info). Expanded view lists each insight card with action buttons routing to medical modal or edit modal. Disclaimer: "All analysis runs on your device only."

### Objective 2: H3 Geo-Indexing & Safety Alerts

**`src/lib/h3Service.ts`** — new file
- `latLngToH3(lat, lng, resolution?)` — wraps `latLngToCell` at resolution 7 (default; ~5.16 km² cells).
- `getH3KRing(h3Index, k = 1)` — wraps `gridDisk`; returns center + 6 neighbors = 7 cells at k=1, covering ~35 km².
- `requestGeolocationH3(resolution?)` — wraps `navigator.geolocation.getCurrentPosition`; returns H3 index or null. 5-min position cache, 6s timeout.
- `zipCodeToH3(zipCode, resolution?)` — lightweight lookup table of 47 major US metro zip codes → approximate lat/lng → H3.
- `resolveUserH3(zipCode?)` — tries geolocation first, falls back to zip lookup.

**`src/contexts/SafetyAlertsContext.tsx`** — new file
- Firestore collection `safetyAlerts/{alertId}`. Schema: h3Index, zipCode, title, description, category, severity, authorId, createdAt, expiresAt.
- 6 categories: hazard, wildlife, toxic, missing, weather, other. 3 severities: low, medium, high.
- On mount: `resolveUserH3(profile.zipCode)` sets `userH3`. Alert fetch queries `where('h3Index', 'in', kRing)` (k=1, 7 cells) for precise proximity matching. Falls back to `where('zipCode', '==', zip)` when H3 unavailable.
- `createAlert`: writes to Firestore + optimistic local insert. TTL: 3 days.
- Expired alerts filtered on load.

**`src/pages/Dashboard.tsx`**
- Added `useSafetyAlerts()` import and `safetyAlerts` state.
- New "Local Safety Alerts" section renders above Lost Pet Banner when `safetyAlerts.length > 0`. Shows up to 3 most recent alerts with category badge, severity-colored icon, description (line-clamp-2), and expiry date.

### Objective 3: Auto-Delete, WCAG & CSS Hardening

**`src/pages/Cards.tsx`** — auto-delete: expired/revoked cards older than 30 days purged from localStorage on every page load.
**`src/utils/lostPetsApi.ts`** — auto-delete: stale lost pet data permanently purged from localStorage on each call.
**`src/index.css`** — `@supports not (color: oklch(0 0 0))` block with sRGB fallbacks; global `:focus-visible` rule for keyboard navigation.
**`src/components/PetFormModal.tsx`** — `role="dialog"`, `aria-modal="true"`, `aria-labelledby="pet-form-modal-title"`.
**`src/pages/Cards.tsx`** — `aria-live="polite"` sr-only region for clipboard toast.
**`src/components/Layout.tsx`** — Sidebar `<nav>` gains `aria-label="Main navigation"`.

### TypeScript: 0 diagnostics across all modified/created files.

## [2026-03-07] Phase 8: Hyper-Local, AI & Identity — START

### Objective 1: Predictive Wellness (WellnessEngine)
Files to create/modify:
- `src/utils/WellnessEngine.ts` — deterministic rules engine (age, weight, activity, vaccines, notes keywords)
- `src/pages/Pets.tsx` — add collapsible "Smart Insights" panel per pet

### Objective 2: H3 Geo-Indexing & Safety Alerts
Files to create/modify:
- `src/lib/h3Service.ts` — lat/lng → H3 index, geolocation helper, zipCode approximate lookup
- `src/contexts/SafetyAlertsContext.tsx` — Firestore `safetyAlerts` collection with H3 query + fallback
- `src/pages/Dashboard.tsx` — Safety Alerts widget
- Package: `h3-js` (new dependency)

### Objective 3: Auto-Delete, WCAG & CSS
Files to modify:
- `src/pages/Cards.tsx` — purge expired/revoked cards > 30 days on load
- `src/utils/lostPetsApi.ts` — purge expired entries on write cycle
- `src/index.css` — `@supports` oklch fallback block
- ARIA attributes on key interactive components

## [2026-03-07] Phase 7: Persistence Migration & Mobile Readiness — COMPLETE

### Objective 1: Firebase Migration

**`src/lib/firestoreService.ts`**
- Added `ApiKeys` interface, `saveApiKeys(uid, keys)`, and `loadApiKeys(uid)` functions.
- Keys stored at `users/{uid}/config/apiKeys` — already covered by existing user-scoped security rule.
- Expanded JSDoc Security Rules block to include full `groups/{groupId}/...` ruleset for community subcollections.

**`src/contexts/CommunityContext.tsx`** — full rewrite
- Removed all localStorage R/W for group data.
- Added `fetchGroupFull(groupId, data)` helper: runs 3 parallel `getDocs` calls (members, posts, events subcollections) and assembles a complete `CommunityGroup` object.
- `onSnapshot(collection(db, 'groups'))` — fires on group metadata changes; each snapshot triggers `fetchGroupFull` for all groups.
- All mutations write to Firestore + update local state **optimistically**.
- `createPost` and `createEvent` use a `tempId` pattern: optimistic insert with UUID, replaced by real Firestore docRef.id on write completion.
- `rsvpEvent` uses `arrayUnion`/`arrayRemove` for atomic attendee list updates.
- `userPreferences` (isFavorite, lastVisited) stays in localStorage.

**`src/pages/ProfileSettings.tsx`**
- Added `useEffect` on mount: calls `loadApiKeys(uid)`, hydrates state from Firestore, mirrors to localStorage for synchronous reads.
- `handleSaveApiKeys` is now `async`: calls `saveApiKeys(uid, keys)` (Firestore) then localStorage mirror.

### Objective 2: React Native / Capacitor Compatibility Review

**`src/utils/platform.ts`** — new file
- `isNative()`, `canPrint()`, `canShare()`, `canDownloadFile()`, `canCopyToClipboard()` guards for Capacitor WebView environments.

**`src/pages/Cards.tsx`**
- `handlePrint`, `handlePdf`, `handleShare` all wrapped with platform guards — no-ops on native.

**CSS audit**: `backdrop-filter`, `@media print` safe. `oklch()` may need PostCSS fallback for Android WebViews < Chromium 111 (Phase 8 hardening item).

### TypeScript: 0 diagnostics across all modified files.
