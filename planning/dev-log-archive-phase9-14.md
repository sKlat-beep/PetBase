# Development Log (Archive: Phase 9–14 — 2026-03-08)

> Phase 9 polish batches, Phase 10 data integrity, Phase 11 optimization, Phase 12 architecture, Phase 13 E2EE vault, Phase 14 PII audit, pet form/card/delete work.

## [2026-03-08] Phase 13 — E2EE Vault Sync + Data Structure Optimization [COMPLETE]

**Objectives Completed:**

**Option 1 — Multi-device E2EE Sync:**
- `src/lib/crypto.ts`: Added `VaultKeyDoc` interface, `wrapKeyForVault(key, syncPassword)` (PBKDF2-wraps AES key → safe for cloud), `unwrapVaultKey(vaultDoc, syncPassword, uid)` (unwraps → caches to localStorage + memory).
- `src/lib/firestoreService.ts`: Added `saveVaultKey(uid, vaultKeyDoc)` and `loadVaultKey(uid)` — stores/reads the wrapped key doc at `users/{uid}/vault/key`.
- `src/components/VaultUnlockModal.tsx` (NEW): Full-screen modal shown on new device when Firestore vault key exists but no local key. User enters sync password → AES key restored → all encrypted data becomes accessible.
- `src/App.tsx`: `ProtectedRoute` now detects missing local key + existing Firestore vault key → renders `VaultUnlockModal`. Closes on successful unlock.
- `src/pages/ProfileSettings.tsx`: New "Cross-Device Sync" section (`section-sync`) with status badge, password + confirm inputs, show/hide toggle, `handleSetupSync` handler. "Sync" nav anchor added. New-device warning banner updated to link to sync setup. Imports: `wrapKeyForVault`, `getOrCreateUserKey`, `saveVaultKey`, `loadVaultKey`.

**Option 2 — Data Structure Optimization (Firestore Vault Subcollection):**
- `src/lib/firestoreService.ts`: `saveMedicalRecords` now writes encrypted blob to `users/{uid}/vault/medical_{petId}` in Firestore (in addition to localStorage). `loadMedicalRecords` tries localStorage first; on miss, falls back to Firestore vault and populates local cache. Added `saveVaultExpenses(uid, encryptedBlob)` and `loadVaultExpenses(uid)` for `users/{uid}/vault/expenses`.
- `src/contexts/ExpenseContext.tsx`: Load path tries localStorage, then Firestore vault as fallback (populates cache). Save path writes to both localStorage and Firestore vault via `saveVaultExpenses`. Entire expense list is re-encrypted as a single blob for the vault write.

**Architecture:**
- Vault docs at `users/{uid}/vault/*` — already covered by the existing `match /users/{userId}/{document=**}` Firestore rule (no rule changes needed).
- Cloud stores only ciphertext. Raw AES key never leaves the client.
- Write-through cache: localStorage for fast offline reads; Firestore vault for cross-device durability.

**Files Modified/Created:**
- `src/lib/crypto.ts`
- `src/lib/firestoreService.ts`
- `src/contexts/ExpenseContext.tsx`
- `src/components/VaultUnlockModal.tsx` (new)
- `src/pages/ProfileSettings.tsx`
- `src/App.tsx`

**Deployment:** `firebase deploy` — hosting, Firestore rules, indexes all deployed. Functions unchanged (skipped).

**jCodeMunch Savings:** Used `get_file_outline` for ProfileSettings symbols instead of full file read; ~4,000 tokens saved.

---

## [2026-03-08] Pet Form UX — Emergency Tab, Next Crash Fix, No Stock Images [COMPLETE]

**Changes Made:**

- **Emergency Contacts → new tab** (`src/components/PetFormModal.tsx`): Added `'emergency'` to `Tab` type, `TAB_ORDER` (inserted after `'health'`), and `TAB_LABELS`. Tab icon uses the existing `Phone` import. Moved the Vet Info block, Owner/Primary Phone field, and Additional Contacts block out of Health & Diet and into the new tab. "Autofill from another pet" dropdown relocated to the Emergency Contacts tab header.

- **Next button crash fix** (`src/components/PetFormModal.tsx`): Root cause was the animated "Add Pet" `type="submit"` button rendering on all tabs in add-new-pet mode — any `isDirty` state triggered it and users could accidentally submit mid-flow. Fixed by gating the button render to `isEditMode || isLast`: in add mode it only appears on the final (Gallery) tab; in edit mode it appears on every tab as before.

- **Auto-generated/stock images removed**: All `picsum.photos` fallback URLs replaced across the codebase. When `pet.image` is empty, a styled `<div>` using the pet's `backgroundColor` and first-letter initial is shown instead.
  - `src/pages/Cards.tsx` — 5 picsum fallbacks replaced (avatar in `CardPreview`, All-Pets list, Multi-Pet modal list, card tile thumbnail, revoked card list)
  - `src/pages/Pets.tsx` — Pet avatar in the solid-color header replaced; now shows background color + initial when no photo uploaded

**Files Modified:**
- `src/components/PetFormModal.tsx`
- `src/pages/Cards.tsx`
- `src/pages/Pets.tsx`

---

## [2026-03-08] Delete Pet — Full Backend Cleanup [COMPLETE]

**Changes Made:**

- **Firestore `publicCards` cleanup** (`src/lib/firestoreService.ts`): Added `deletePublicCardsForPet(uid, petId)` — queries `publicCards` by `ownerId + petId` and batch-deletes all matching docs so shared card links go dead immediately on pet deletion.

- **Full localStorage cleanup** (`src/contexts/PetContext.tsx`): Updated `deletePet` to also remove (1) `petbase-medical-{uid}-{petId}` (encrypted medical records), (2) the pet's entry from `petbase-lost-pets`, and (3) cards for this pet from `petbase-cards`. Added import for `deletePublicCardsForPet`.

- **Delete UI** (`src/pages/Pets.tsx`): Added `deletePet` from `usePets()`; `petToDelete` state; red `Trash2` icon button on both card header variants (photo-background and solid-color); confirmation modal naming the pet with a warning that the action is permanent; "Cancel" and "Delete Permanently" actions.

**Files Modified:**
- `src/lib/firestoreService.ts`
- `src/contexts/PetContext.tsx`
- `src/pages/Pets.tsx`

---

## [2026-03-08] Phase 12 — Architecture & Identity [COMPLETE]

**Objectives Completed:**
- **Search & Identity**: `@username#1234` identifiers generated in `AuthContext.tsx` on first login (baseName + 4-digit random hash). Displayed in `ProfileSettings.tsx` with a Copy button. Rendered in `People.tsx` `UserCard` with faded `#tag`. `firestoreService.searchPublicProfiles` filters by both `displayName` and `username`. `SocialContext.searchUsers` excludes current user (`p.uid === user.uid`).
- **Card Parity**: `SharedCardPage.tsx` handles multi-pet cards via `isMulti` flag (checks `petId === 'multi-pet'` and `multiPetConfig.length > 0`). `savePublicCard` in `Cards.tsx` writes full `multiPetConfig` array with per-pet snapshots to Firestore `publicCards/{id}`.
- **Emergency Contacts on UserProfile**: New `section-emergency` section in `ProfileSettings.tsx` — Vet Clinic, Doctor Name, Vet Phone, Vet Address, Owner Phone, 2 Additional Contacts. Stored in `localStorage` under `petbase-profile-emergency-{uid}` (device-only, no Firestore write per PII policy). `Cards.tsx` reads this key as fallback when pet has no emergency contacts set on both single-pet and multi-pet card snapshots.

**Files Modified:**
- `src/pages/ProfileSettings.tsx` — Added `EmergencyContacts` import; added `profileEmergency`/`emergencySaved` state; localStorage load in `useEffect`; `handleSaveEmergencyContacts`; nav anchor `section-emergency`; full UI section with Vet Info, Owner Phone, 2 Additional Contacts
- `src/pages/Cards.tsx` — Both single-pet and multi-pet `savePublicCard` calls updated to fallback to `petbase-profile-emergency-{uid}` localStorage when pet has no emergency contacts
- `PetBase-Roadmap.md` — Phase 11 marked COMPLETE, Phase 12 added and marked COMPLETE

**jCodeMunch Savings:** Index was stale for Phase 11 files; used targeted Grep/Read tools instead; ~8 symbol lookups saved ~18,000 tokens vs full-file reads

## [2026-03-08] Phase 11 — Optimization & Simplification [COMPLETE]

**Objectives Completed:**
- **Codebase Cleanup & Simplification**: Uninstalled `html2pdf.js`, ran `knip` and `depcheck` to identify unused code. Removed unused exports and capabilities from `firestoreService.ts`, `platform.ts`, and `telemetry.ts`. Consolidated nested React Context Providers in `App.tsx` into a clean `AppProviders.tsx` wrapper.
- **Performance & Bundle Optimization**: Verified production build sizes and tree-shaking for `lucide-react` and `framer-motion`. Applied `React.memo` to `ModuleRow` in `Dashboard.tsx` to prevent unnecessary re-renders in heavy modules.
- **Best Practices Audit**: Security rules in `firestore.rules` and `storage.rules` were verified as fully secure (5MB limit, image-only validation for Storage; full household + role constraint for Firestore). Tested enabling TypeScript strict mode, which produced 3,700+ errors — reverted and deferred as a massive incremental task for a future phase to avoid systemic breakthrough.

**Files Created:**
- `src/providers/AppProviders.tsx`

**Files Modified:**
- `src/App.tsx`
- `src/pages/Dashboard.tsx`
- `src/lib/firestoreService.ts`
- `src/utils/platform.ts`
- `src/utils/telemetry.ts`
- `tsconfig.json` (tested, but reverted)
- `package.json`

**Next Steps:**
- Type strictness increments
- Proceeding to further optimizations or new features.
- Please use `/clear` to compact your conversation!

## [2026-03-08] Phase 9 Batch 4 — Events, Organize Mode Reorder, Cards Polish, Find Services [COMPLETE]

**Files Modified:**
- `src/contexts/CommunityContext.tsx` — added `deleteEvent` callback + `CommunityContextValue` type; wires to Firestore deleteDoc; optimistic local removal
- `src/pages/GroupHub.tsx` — Events panel: upcoming events list with RSVP/delete; inline Create Event form (title, date, location, description, recurring toggle); restricted to Owner/Moderator/Event Coordinator; `upcomingEvents` sorted by date
- `src/pages/Dashboard.tsx` — Upgraded organize mode: replaced HTML5 DnD with `Reorder.Group`/`Reorder.Item` from `motion/react`; `ModuleRow` component with `useDragControls`; `layout` animations on all module `motion.div` wrappers; removed `organizeMode` state + banner; simplified modal footer (removed "Organize Dashboard" button)
- `src/pages/Cards.tsx` — Removed all 3 Print/Save PDF buttons; removed `printCard()` helper; removed `handlePdf` callbacks; changed all action panels from `grid-cols-3` to `grid-cols-2`; removed `Download` icon import
- `src/utils/serviceApi.ts` — Replaced stub with real Firebase Functions callable; calls `findServices` Cloud Function; graceful fallback (empty array) if not yet deployed
- `functions/src/index.ts` — Added `findServices` onCall function: proxies Google Places Text Search API; requires `GOOGLE_PLACES_KEY` secret; maps results to `ServiceResult` shape

### Changes Made

**Group Events Management (Obj 2.5)**
- `deleteEvent(groupId, eventId)` added to CommunityContext; interface updated
- GroupHub Events sidebar panel: shows upcoming events (within next 7+ days), sorted by date
- Create Event inline form (toggled by "+ New Event" button): title, date/time picker, location, description, recurring checkbox
- RSVP button per event (toggles going/not going); delete button for Owner/Moderator/Event Coordinator
- `handleCreateEvent` calls `createEvent()` then resets form state

**Dashboard Organize Mode (Obj 3.1)**
- `Reorder.Group axis="y"` wraps the module list in CustomizeModal
- Each item is a `Reorder.Item` with `dragListener=false`; drag initiated only via `GripVertical` handle (`useDragControls`)
- `reorderModule` now accepts `(newOrder: ModuleKey[])` — set + persist in one call
- All module grid wrappers changed from `<div>` to `<motion.div layout>` for smooth layout transitions when order changes
- Removed HTML5 DnD (`draggable`, `onDragStart`, `onDrop`, `dragKey`, `handleDragStart`, `handleDrop`)
- Removed `organizeMode` state, its banner, and the "Organize Dashboard" button from the modal

**Cards Polish (Obj 3.6)**
- Removed all "Save PDF" / Print buttons from SinglePetCardPreview, MultiPetCardPreview, and the third card preview component
- Removed `printCard()` helper and `Download` icon; changed action grids to `cols-2`

**Find Services (Obj 3.7)**
- `findServices` Cloud Function: `GOOGLE_PLACES_KEY` secret; calls `textsearch` endpoint; maps Places API results to `ServiceResult`; returns max 10
- `serviceApi.ts`: Firebase `httpsCallable` wired to `findServices`; graceful empty-array fallback

**Next:** Phase 10 — Pet Form UI (Obj 1), Diet Tags (Obj 2), Storage Rules (Obj 4)

**jCodeMunch Savings:** ~12 symbol lookups + text searches saved ~48,000 tokens vs. direct reads

---

## [2026-03-08] Phase 9 Batch 3 — Group Logic, PDF Fix & Rules [COMPLETE]

**Files Modified:**
- `src/pages/Cards.tsx` — removed html2pdf.js entirely; replaced with `printCard()` using `window.print()` + print CSS isolation
- `src/contexts/CommunityContext.tsx` — group name uniqueness (Firestore query); group lifecycle rules (last-member delete, last-owner LAST_OWNER error)
- `src/components/CreateGroupModal.tsx` — async submit, nameError state, inline error display, submitting spinner
- `src/components/ManageGroupsModal.tsx` — catch LAST_OWNER error with confirm/guidance
- `src/pages/GroupHub.tsx` — catch LAST_OWNER error with actionable modal path
- `firestore.rules` — added `households/{id}/auditLog/{entryId}` read/create rules; added `/{path=**}/profile/{docId}` collectionGroup rule; added `publicCards` rule (from Batch 2)

### Changes Made

**PDF Export — Replaced html2pdf.js with native print (final fix)**
- Removed `html2pdf.js` dynamic import entirely from all 3 handlers
- Added `printCard(cardId)` helper: injects a `<style>` with `@media print` that hides all body content except `#card-preview-{id}`; calls `window.print()` (shows browser native preview + Save as PDF); removes the style tag after
- Result: zero main-thread blocking; browser PDF preview dialog shown; `vendor-pdf` chunk (985 kB) eliminated from bundle

**Group Name Uniqueness (Obj 2.3)**
- `createGroup` now runs `getDocs(query(collection(db,'groups'), where('name','==',trimmedName), limit(1)))` before creating
- If name exists, returns error string instead of creating
- `CreateGroupModal`: async submit, shows inline error in red below the name field; button shows "Checking..." during query

**Group Lifecycle Rules (Obj 2.4)**
- `leaveGroup`: checks `isLastOwner` (only owner remaining) and `isLastMember` (only member)
- Last owner with other members → throws `Error('LAST_OWNER')` for call sites to handle
- Last member → hard-deletes group: fetches all posts/events/members subcollection docs, batch-deletes them all + the group doc
- ManageGroupsModal and GroupHub catch `LAST_OWNER` and show actionable confirm dialogs

**Audit Log Rules (Obj 2.2 verification)**
- `addAuditEntry` already writes to `households/{id}/auditLog` in Firestore ✅ (verified from source)
- Added missing `match /auditLog/{entryId}` rule to firestore.rules so members can read/create entries

**Build verified:** zero TypeScript errors; `vendor-pdf` chunk gone from bundle

### jCodeMunch Savings
- `get_file_outline` + `get_symbol` on CommunityContext + HouseholdContext: ~1,860 tokens saved

## [2026-03-08] Phase 9 Batch 2 — Critical Bug Fixes & Social Connectivity [COMPLETE]

### Objective: Shared Cards, People Search, PDF Freeze

**Files Modified:**
- `src/lib/firestoreService.ts` — PublicCardDoc interface + savePublicCard/getPublicCard/updatePublicCardStatus
- `src/pages/Cards.tsx` — Firestore card sync on create/revoke/undo; PDF clone fix (3 handlers)
- `src/pages/SharedCardPage.tsx` — NEW standalone public card view page
- `src/App.tsx` — public route `/cards/view/:cardId` outside ProtectedRoute
- `src/contexts/SocialContext.tsx` — replaced MOCK_DIRECTORY with real Firestore-backed state
- `firestore.rules` — collectionGroup profile rule + publicCards public read rule

### Changes Made

**1. Blank Shared Pet Cards (Obj 1.2) — FIXED**
- Root cause: `/cards/view/:id` route was missing from App.tsx AND card data only lived in localStorage
- Added `publicCards/{cardId}` Firestore collection (PublicCardDoc interface in firestoreService.ts)
- `handleCreate` in Cards.tsx now calls `savePublicCard()` with non-PII pet snapshot fields
- `handleRevoke` / `handleUndoRevoke` call `updatePublicCardStatus()` to keep Firestore in sync
- Created `SharedCardPage.tsx` — standalone, no auth required; fetches card by ID, renders pet snapshot
- Added lazy route: `<Route path="/cards/view/:cardId" element={<SharedCardPage />} />` before ProtectedRoute
- `firestore.rules`: `match /publicCards/{cardId}` — `allow read: if true` (public), write only by ownerId

**2. People Search Connectivity (Obj 1.3) — FIXED**
- Root cause 1: `MOCK_DIRECTORY` hardcoded in SocialContext — no real user data was ever shown in the People/Friends directory
- Root cause 2: `match /{path=**}/profile/{docId}` rule missing from firestore.rules — collectionGroup('profile') queries silently returned nothing
- Removed MOCK_DIRECTORY entirely from SocialContext; replaced with `directory` state populated via `searchPublicProfiles('')` on auth
- Added collectionGroup wildcard rule to firestore.rules: `match /{path=**}/profile/{docId} { allow read: if isSignedIn(); }`

**3. PDF Export Memory Leak / Freeze (Obj 1.1) — FIXED**
- Root cause: html2pdf.js / html2canvas was running directly on the live React DOM element, causing React to detect DOM mutations and trigger context re-renders, corrupting localStorage-backed state
- Fix: All 3 pdf handlers now `cloneNode(true)` the card element, append it off-screen at y:-9999px, run html2pdf on the detached clone, then immediately remove it from DOM
- No React tree involvement during PDF render — state corruption eliminated

### Verified
- `npm run build` passes with zero TypeScript errors
- SharedCardPage compiled to its own 5.81 kB lazy chunk

### jCodeMunch Savings
- `search_text` for `shared/:id`, `searchUsers`, `MOCK_DIRECTORY`, `html2pdf` across all 47 files: ~3,200 tokens saved vs full-file reads
- `get_file_outline` on SocialContext: ~500 tokens saved

## [2026-03-08] Phase 10 — Data Integrity & UX Refinements [COMPLETE]

### Objective: Pet Form Overhaul + Dashboard Links + Hosting Polish

**Files Modified:**
- `src/components/PetFormModal.tsx` — full rewrite
- `src/types/pet.ts` — Phase 10 fields added
- `src/pages/Dashboard.tsx` — pet card `<Link>` with `editPetId` state
- `src/pages/Pets.tsx` — `editPetId` location state handler
- `firebase.json` — caching headers added
- `PetBase-Roadmap.md` — Phase 10 checked off

### Changes Made

**1. PetFormModal.tsx — Full Rewrite**
- Inline `TagInput` component: Enter/comma creates chip tag; Backspace on empty removes last tag
- Inline `UnitInput<U>` generic component: number `<input>` + unit `<select>` side-by-side
- `parseUnitStr()` helper for backward-compat loading of old "65 lbs" strings
- `calcAgeFromBirthday()` derives display age from ISO date
- "Age" field replaced with `<input type="date">` bound to `birthday`
- Weight/Height/Length → `UnitInput` (lbs/kg, inches/cm, inches/cm)
- Diet split: Food Brand/Type (text) + Amount (integer number input) + Measurement (cups/half cups/oz/grams/lbs dropdown)
- Likes/Dislikes/Favorite Activities → `TagInput` chips
- Removed `pageLayout` toggle; always uses solid-color (color picker shown)
- Dynamic footer: Row 1 = context-sensitive nav (Cancel+Next / Back+Next / Back+Finish); Row 2 = animated full-width green Save Changes only when `isDirty`
- `isDirty` tracking via `mark()` helper called on every field change; reset after successful save

**2. Dashboard Links (Obj 3.1)**
- `your_pets` widget: pet cards changed from `<div>` to `<Link to="/pets" state={{ editPetId: pet.id }}>` — clicking a pet card navigates to `/pets` and opens its edit modal
- Groups and Friends widgets already link to `/community` and `/people` respectively
- `Pets.tsx`: Added `editPetId` branch in location state `useEffect` — finds the pet by ID, sets `editingPet`, opens `isModalOpen`

**3. Firebase Hosting Caching (Phase 10 Obj 4.2)**
- Added `headers` array to `firebase.json`:
  - `/assets/**` → `Cache-Control: public, max-age=31536000, immutable` (Vite hashed bundles)
  - `**/*.@(jpg|jpeg|gif|png|webp|svg|ico)` → `Cache-Control: public, max-age=86400`
  - `/index.html` → `Cache-Control: no-cache` (always fetch latest entry point)

**4. Storage Rules (Phase 10 Obj 4.1) — Verified via Firebase MCP**
- Fetched live rules via `firebase_get_security_rules` (storage) — already production-ready:
  - `/avatars/{uid}/**` and `/pets/{uid}/**`: public read, auth write with 5MB + image/* enforcement
  - Default deny on all other paths

### Verified
- `npm run build` passes with zero TypeScript errors after all changes

### jCodeMunch Savings
- `get_file_outline` on Dashboard.tsx and Pets.tsx: ~760 tokens saved vs full file reads

## [2026-03-08] Phase 9 — Launch Polish & Critical Fixes (Batch 1) [COMPLETE]

### Objective: UI/UX, Navigation, & Quick Wins
Executed targeted fixes from the Phase 9 implementation plan. All changes verified via clean `npm run build` (zero TypeScript errors).

**Files Modified:**
- `src/pages/Dashboard.tsx`
- `src/components/HelpModal.tsx`
- `src/components/Layout.tsx`
- `src/pages/Cards.tsx`
- `src/pages/ProfileSettings.tsx`
- `src/components/LocationPromptModal.tsx`
- `functions/package.json`
- `PetBase-Roadmap.md` (this entry)

### Changes Made

**1. Emergency Assistance Routing (Dashboard.tsx)**
- Replaced `href="tel:8884264435"` (ASPCA) with `href="https://www.aspca.org/"` + `target="_blank"`
- Replaced `href="tel:8557647661"` (Pet Poison Helpline) with `href="https://www.petpoisonhelpline.com/"` + `target="_blank"`
- Swapped `Phone` icon → `ExternalLink` icon in both buttons; removed `Phone` from lucide import

**2. Help/FAQ Feedback Button (HelpModal.tsx + Layout.tsx)**
- Added `onFeedback: () => void` prop to `HelpModalProps`
- Replaced GitHub issues `<a>` link in modal footer with a `<button>` that calls `onFeedback()` (closes Help, opens Feedback modal)
- `Layout.tsx`: Added `feedbackOpen` state; imported `FeedbackModal`; wired `onFeedback` prop; renders `<FeedbackModal>` when `feedbackOpen` is true

**3. Pet Cards Print Button Removed (Cards.tsx)**
- Removed Print button from all 3 action panels (standard card, inline panel, multi-pet card panel)
- Updated all affected grid containers from `grid-cols-2` → `grid-cols-3` (Share, Save PDF, Revoke)
- Removed `handlePrint` useCallback; removed `Printer` and `canPrint` from imports

**4. ProfileSettings Cleanup (ProfileSettings.tsx)**
- **API Configuration removed**: Deleted entire JSX section + state vars (`googlePlacesKey`, `yelpApiKey`, `apiKeySaved`) + `useEffect` + `handleSaveApiKeys` + `Plug` icon import + `saveApiKeys`/`loadApiKeys` from firestoreService import. Jump-nav label updated from "Data & API" → "Data".
- **Floating Save Changes**: Removed inline form submit button; added `isDirty` state; all profile field `onChange` handlers now also call `setIsDirty(true)`; `handleSaveProfile` clears `isDirty` on success; animated floating sticky button (`fixed bottom-20 md:bottom-6 right-6`) renders only when `isDirty === true`. Added `CheckCircle2` icon. `handleSaveProfile` signature changed to accept optional `e?: React.FormEvent`.
- **Change Password hide for OAuth**: Added `isPasswordUser` derived from `user.providerData.some(p => p.providerId === 'password')`; Change Password button conditionally rendered only when `isPasswordUser === true`.

**5. Location Modal Auto-fill (LocationPromptModal.tsx)**
- Added `geoLoading` and `geoError` state; added `Navigation` icon import
- `handleAllowLocation()`: calls `navigator.geolocation.getCurrentPosition` → reverse-geocodes via `nominatim.openstreetmap.org/reverse` → extracts `address.postcode` → auto-fills zip code input field
- UI: "Allow Location to Auto-fill" button rendered above zip input; shows spinner during geocode; shows inline error on failure or denial

**6. Firebase Functions Node 22 (functions/package.json)**
- Updated `"engines": { "node": "20" }` → `"node": "22"` to prevent deprecation block

### Status: COMPLETE
- Build: ✓ (zero errors, zero warnings beyond pre-existing pdf chunk size)
- jCodeMunch savings: ~4.14M tokens saved / $62 cost avoided this session

### Remaining Phase 9 Items (Not Yet Implemented)
- PDF Export freeze bug fix (html2pdf.js investigation)
- Blank shared pet cards bug (`/cards/shared/:id` route)
- People Search Connectivity (Firestore `collectionGroup` query validation + default Public visibility)
- Household naming uniqueness constraint removal
- Family Audit Log Firestore cloud sync
- Group name uniqueness validation on creation
- Group lifecycle rules (last member delete, last owner transfer/disband)
- Group Events (Create Event with Date/Recurrence/Tags/Location for Owners/Mods)
- Dashboard Organize Mode upgrade (dnd-kit or framer-motion layout animations)
- Find Services → Firebase Cloud Function for Google Places API

## [2026-03-08] Phase 8.9 — Final Pre-Release Polish & Telemetry [COMPLETE]

### Objective 1 — Mobile/Tablet UI Refinements
- `src/pages/Pets.tsx`: Responsive text (`text-2xl sm:text-4xl`) and button label sizing (`text-xs sm:text-sm`, shortened labels "Lost/Found", "Card"); `break-words` + `max-w-[calc(100%-5rem)]` on pet name
- `src/components/Layout.tsx`: Mobile sticky bottom nav bar (`md:hidden fixed bottom-0 z-40`) with 5 tabs (Home, Pets, Community, Search, Cards); `pb-20 md:pb-8` on main content area to prevent nav overlap
- `src/pages/Dashboard.tsx`: `SERVICE_CATS` array + `serviceCatIdx` state; prev/next arrow buttons replace horizontal scroll pill bar for Local Services category navigation

### Objective 2 — Pet Form & Card Data Enhancements
- `src/types/pet.ts`: Added `spayedNeutered?: 'Yes' | 'No' | 'Unknown'` and `microchipId?: string` fields (microchip marked as PII)
- `src/components/PetFormModal.tsx`: Removed `lastVet` field entirely; added `spayedNeutered` dropdown (Yes/No/Unknown/Not set) and `microchipId` text input to Health tab
- `src/pages/Cards.tsx`:
  - `SharingToggles`: added `microchip: boolean`; TEMPLATE_DEFAULTS include microchip (vet: true, sitter: false, emergency: true)
  - `SHARING_FIELDS` + `sharingLabels`: microchip entry added
  - Medications bug fix: `m.frequency === '8 hours' ? 'As Needed'` guard + `m.customFrequency` priority; `m.notes` rendered
  - CardPreview: microchip + spayed/neutered block rendered; General Information block reads from localStorage
  - General Information panel UI (household-level notes); per-card `includeGeneralInfo` toggle in CreateCardModal
  - `handleCreate`/`handleRevoke` call `logActivity`; `GENERAL_INFO_KEY = 'petbase-cards-general-info'`

### Objective 3 — Client-Side Telemetry & Error Reporting
- `src/utils/telemetry.ts` (new): 7-day rolling log (max 500 entries, `petbase-telemetry` localStorage key); `logTelemetry`, `getTelemetryLog`, `serialiseTelemetryLog`
- `src/components/ErrorBoundary.tsx` (new): React class Error Boundary; `getDerivedStateFromError` sets `hasError + errorId`; `componentDidCatch` logs via telemetry then dynamically calls `sendReport` Firebase callable with `type: 'crash'`; fallback UI with error ref + Reload button
- `src/lib/firebase.ts`: Changed `const app` → `export const app` to support dynamic import in ErrorBoundary
- `src/App.tsx`: Entire app tree wrapped in `<ErrorBoundary>`
- `src/components/FeedbackModal.tsx` (new): "Feedback" | "Report Issue/Bug" type selector; textarea; calls `httpsCallable(functions, 'sendReport')`; success/error inline states
- `src/pages/ProfileSettings.tsx`: "Feedback / Report Issue" button in header; `FeedbackModal` with `AnimatePresence`; `showFeedback` state; Personal Activity Logs section with audit log
- `functions/src/index.ts` (new): Firebase Functions v2 `sendReport` onCall; routes by `type` to EMAIL_CRASH/BUG/FEEDBACK from Secret Manager; nodemailer Gmail SMTP; never exposes email addresses in source
- `functions/package.json` + `functions/tsconfig.json` (new): Node 20, firebase-functions v5, nodemailer
- `firebase.json`: Added `functions` block pointing to `functions/` codebase

### Deployment Prerequisites
Before deploying functions, set Firebase Secret Manager secrets:
```
firebase functions:secrets:set SMTP_USER     # Gmail sender address
firebase functions:secrets:set SMTP_PASS     # Gmail App Password
firebase functions:secrets:set EMAIL_CRASH   # sklatdevelopment+reportdump@gmail.com
firebase functions:secrets:set EMAIL_BUG     # sklatdevelopment+userreport@gmail.com
firebase functions:secrets:set EMAIL_FEEDBACK # sklatdevelopment+userfeedback@gmail.com
```
Then: `cd functions && npm run build && cd .. && npm run build && firebase deploy`

### TypeScript Status
0 errors across all modified/created files (verified via getDiagnostics).

### jCodeMunch Savings
Symbol-targeted lookups for PetFormModal, Cards, Dashboard, Layout — avoided 6+ full file reads. Estimated ~10,000 tokens saved.

---

