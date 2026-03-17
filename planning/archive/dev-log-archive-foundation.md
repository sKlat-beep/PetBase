# Development Log (Archive: Foundation — 2026-03-04/05)

> Initial setup, auth, PII encryption, Phase 4 Cards, Phase 4.5/5/6.5 planning.


## [2026-03-04] Initial Setup & UI Foundation
- Initialized the project with React, Vite, and Tailwind CSS.
- Added `react-router`, `lucide-react`, and `motion` for routing, icons, and animations.
- Created the core layout (`Layout.tsx`) with a responsive sidebar and mobile header.
- Implemented static UI for all main pages:
  - `Dashboard.tsx`: Overview of pets, upcoming events, and sponsored local services.
  - `Pets.tsx`: Detailed pet profiles with stats, likes/dislikes, and medical summaries.
  - `Community.tsx`: Groups, discussions, and upcoming meetups.
  - `Search.tsx`: Directory of local services (vets, groomers, etc.) with filtering.
  - `Cards.tsx`: Shareable pet profiles for sitters and emergencies.

## [2026-03-04] Authentication Setup
- Installed `firebase` package.
- Created `src/lib/firebase.ts` to initialize Firebase Auth.
- Created `AuthContext.tsx` to provide global authentication state.
- Built `Auth.tsx` for Email/Password and Google OAuth login/signup.
- Updated `App.tsx` to protect routes using a `<ProtectedRoute>` wrapper.
- **Issue encountered**: Users getting stuck on "Processing..." with a `Firebase: Error (auth/network-request-failed)` error when attempting to sign up without providing Firebase environment variables. The dummy configuration was causing Firebase to make invalid network requests that hung or failed cryptically.

## [2026-03-04] Bug Fix: Auth Network Error
- **Action**: Updating `Auth.tsx` and `firebase.ts` to explicitly check for missing configuration *before* attempting to make any Firebase authentication calls. This will display a clear UI error message to the user instead of attempting a broken network request.

## [2026-03-04] Firebase Configuration Added
- **Action**: Added the real Firebase configuration variables to `src/lib/firebase.ts` as fallback values. This resolves the `network-request-failed` error and allows users to successfully sign up and log in using the provided Firebase project.

## [2026-03-04] Step 5: Strict PII Encryption Implementation
- **Created** `src/types/pet.ts`: Extracted `Pet` interface to a shared types file to eliminate circular dependency between `PetContext` and `firestoreService`.
- **Created** `src/lib/crypto.ts`: Web Crypto API AES-256-GCM encryption utility. Key points:
  - `getOrCreateUserKey(uid)` — generates and persists a 256-bit CryptoKey in localStorage per user UID; device-bound.
  - `encryptField(plaintext, key)` — AES-256-GCM encrypt; outputs `ENC:{base64(iv)}.{base64(ciphertext)}`. Empty strings pass through unchanged.
  - `decryptField(value, key)` — Checks for `ENC:` prefix; non-prefixed values returned unchanged (legacy compatibility). Decryption failures return '' with a console error.
  - IV: 96-bit random per encryption (NIST recommendation for AES-GCM).
- **Created** `src/lib/firestoreService.ts`: Firestore CRUD layer with encryption/decryption at the boundary. PII fields encrypted BEFORE `setDoc`, decrypted IMMEDIATELY AFTER `getDoc`/`getDocs` — plaintext never persists from cloud to React state as ciphertext. Includes Firestore Security Rules in JSDoc comments (`allow read, write` only for matching `auth.uid`).
  - `saveUserProfile` / `loadUserProfile` — encrypts/decrypts `address`
  - `savePet` / `loadPets` / `deletePetDoc` — encrypts/decrypts `notes`
- **Updated** `src/lib/firebase.ts`: Added `getFirestore` import and `db` export.
- **Updated** `src/contexts/PetContext.tsx`: Now loads pets from Firestore on auth mount. Optimistic local state updates with async Firestore writes in background. Falls back to seed data (Max & Bella) for new users with no Firestore data.
- **Updated** `src/pages/ProfileSettings.tsx`: Loads profile from Firestore on mount (address arrives decrypted). Saves to Firestore (address encrypted inside `saveUserProfile`). Removed all localStorage usage for address/visibility. Shows spinner during initial profile load.
- **Architecture note**: Encryption key is device-bound (localStorage). Clearing localStorage requires account data reset. Future enhancement: key escrow or PBKDF2-derived key from password.

## [2026-03-04] Step 4: Getting Started Guide & Recommendation Banner
- **Created** `src/components/GettingStartedGuide.tsx`: Collapsible onboarding checklist with 4 steps. "Add your first pet" is auto-derived from `PetContext` (checks when `pets.length > 0`); the other 3 steps are manually toggled and persisted in `localStorage`. A circular SVG progress ring tracks completion. Once all 4 steps complete, waits 1.4s then sets `petbase-guide-completed = true` in localStorage and calls `onComplete()` — permanently removing the guide from the UI. Documented per `petbase-system-instructions.md` rule: future core features must add a checklist item here.
- **Created** `src/components/RecommendationBanner.tsx`: Renders **only after** the guide is gone. Shows the first un-dismissed recommendation from a static list of 4 (Pet Cards, Community, Find Services, Profile Setup). Each can be individually dismissed — stored in `petbase-dismissed-recommendations` localStorage array. Uses `AnimatePresence` with `mode="wait"` for smooth transitions between recommendations. When all dismissed, renders nothing.
- **Updated** `src/pages/Dashboard.tsx`: Reads `petbase-guide-completed` from localStorage to initialize `guideCompleted` state. Conditionally renders `<GettingStartedGuide>` or `<RecommendationBanner>` between the page header and the pet/events grid. `onComplete` callback uses `useCallback` to avoid re-render churn.
- **Rule reference**: Per `petbase-system-instructions.md` — advanced features should use `RecommendationBanner` instead of blocking the initial checklist. Both components include code comments referencing this rule.

## [2026-03-04] Step 3: Pet Management Card Modals
- **Created** `src/contexts/PetContext.tsx`: Shared pet state (`Pet[]`) with `addPet`, `updatePet`, `deletePet`. Seeded with Max and Bella demo data. Step 5 will replace local state with Firestore reads/writes.
- **Created** `src/components/PetFormModal.tsx`: Reusable modal handling both Add Pet and Edit Pet modes. Fields: Name (required), Breed, Age, Weight, Notes. Notes textarea has a strict **5,000-character hard limit** with live countdown that changes color as the limit is approached (green → amber → rose). Notes field labelled "Encrypted" per `petbase-system-instructions.md` — Step 5 implements the AES encryption before Firestore writes.
- **Updated** `src/App.tsx`: Wrapped app in `<PetProvider>`.
- **Updated** `src/pages/Dashboard.tsx`: "Add Pet" dashed button opens `PetFormModal`. Pets sourced from `usePets()` context; preview shows first 2.
- **Updated** `src/pages/Pets.tsx`: "Add Pet" header button and per-card "Edit" overlay button both open `PetFormModal` in the appropriate mode. Empty state shown when no pets exist. Notes preview shown inline with "Encrypted" badge when present.
- **Decision**: `PetContext` uses `crypto.randomUUID()` for new pet IDs. Image defaults to picsum.photos seed derived from pet name for new adds; preserved on edit.

## [2026-03-04] Step 2: User Profile, Settings & Dark Mode
- **Created** `src/contexts/ThemeContext.tsx`: React context that persists theme preference (`light`/`dark`) in `localStorage` and toggles the `dark` class on `<html>` for Tailwind v4 class-based dark mode.
- **Created** `src/pages/ProfileSettings.tsx`: Full settings page at `/settings` route including:
  - Profile form: display name, read-only email, physical address (temporary localStorage — Step 5 migrates to AES-encrypted Firestore per system instructions)
  - Visibility toggle: defaults to **Private** as required by `petbase-system-instructions.md`
  - Security section: Change Password and Manage 2FA (placeholder UI, Coming Soon badge)
  - Appearance section: **Dark Mode toggle is exclusively here** (no toggle elsewhere in the UI)
  - Danger Zone: Delete Account with email-confirmation modal; handles `auth/requires-recent-login` error gracefully
- **Updated** `src/index.css`: Added `@custom-variant dark (&:where(.dark, .dark *))` for Tailwind v4 class-based dark mode support.
- **Updated** `src/App.tsx`: Wrapped app in `<ThemeProvider>`, added `/settings` route nested under `Layout`.
- **Updated** `src/components/Layout.tsx`: User profile section at bottom-left now links to `/settings` via `<Link>`. Applied `dark:` classes to sidebar, mobile header, nav items, and profile area. Fixed `end` prop on Dashboard `NavLink` to prevent it matching all routes.
- **Updated all pages** (`Dashboard`, `Pets`, `Community`, `Search`, `Cards`, `Auth`): Applied `dark:` Tailwind classes to all major surfaces — backgrounds, borders, headings, body text, and interactive elements. Pet card preview in `Cards.tsx` intentionally kept light for print/share fidelity.
- **Decision**: Address field stored in `localStorage` as a stepping stone; final encrypted Firestore storage deferred to Step 5 per `petbase-system-instructions.md` PII encryption mandate.

## [2026-03-04] Feature Audit — Navigation, Pet Form, & Pet Cards

Conducted a comprehensive live browser audit and source code review of three feature areas per user request. No code changes were made. All findings are logged below; corresponding roadmap items have been added to `PetBase-Roadmap.md`.

### Audit Results

**1. Getting Started Guide — Step Navigation**
- **Status: ❌ Not Implemented**
- Clicking any step in the "Getting Started" checklist does NOT navigate the user to the relevant app section. The "Add your first pet" step is `disabled` (cursor-default, auto-tracked via PetContext), so it registers no click at all. The three manual steps ("Share a pet card," "Join a community," "Find nearby services") are clickable but only toggle their local completion state — no routing occurs.
- **Expected:** Each step should navigate to the relevant page (My Pets, Pet Cards, Community, Find Services) and trigger the appropriate action (e.g., open the Add Pet modal).

**2. Pet Add/Edit Form — Missing Fields**
- **Status: ❌ Partially Implemented**
- `PetFormModal.tsx` only exposes 5 fields: Name, Breed, Age, Weight, Notes.
- The `Pet` type in `src/types/pet.ts` has `activity`, `food`, `lastVet`, `likes[]`, `dislikes[]` as optional fields but these are **not editable via the form**. They are **read-only display** on the `Pets.tsx` page, populated only from seed data.
- Completely absent from both the form and the `Pet` type: Measurements (length/height/body score), Favorite Activities, Type of Play, Diet/Feeding Schedule (structured schedule vs. a single `food` string field), Medical Visit history, and Profile Photo Upload.

**3. Medical Overview — "View Full Records" Button**
- **Status: ❌ Not Implemented**
- The "View Full Records" button in `Pets.tsx` is a static `<button>` element with no `onClick` handler. Clicking it does nothing. No vaccine list, vaccination history modal, or health record viewer exists. The "Vaccines: Up to date" badge is also hardcoded static text.
- The "Update Measurements" button is similarly a static non-functional button.

**4. Pet Cards — Cannot Be Opened from My Pets**
- **Status: ❌ Not Implemented**
- There is no button, link, or trigger on the `Pets.tsx` page to open or navigate to a pet's card. Users must navigate to the Pet Cards page via the sidebar manually.

**5. Pet Cards Page — Missing Features**
- **Status: ❌ Largely Static / Non-Functional**
- The entire `Cards.tsx` page is hardcoded static UI displaying "Max" and "Bella" demo cards. It has no connection to `PetContext` or Firestore.
- **❌ No QR code generation** — "Share Link" button is a static non-functional `<button>`
- **❌ No card expiration control** — No 48-hour default, no 1-year customizable expiration, no expiration date in the summary
- **❌ No revoke functionality** — No revoke button exists
- **❌ No contextual sharing controls** — No per-field visibility toggles (e.g., Vet vs. Sitter vs. Emergency card templates)
- **❌ No PDF download** — "Save PDF" button is a static non-functional `<button>`
- **❌ No print functionality** — "Print" button is a static non-functional `<button>`
- **❌ Edit Info button is present and should not be** — `Cards.tsx` includes an "Edit Info" action button; per product requirements, cards must not be editable from this menu
- **❌ Pet name is not clickable/navigable** — The pet name "Max" on the card is plain text; clicking it does not navigate to My Pets
- **❌ No real multi-card management** — "Other Cards" section is static; "Bella's Sitter Card" and "Max's Emergency Card" are hardcoded buttons with Edit icons (which also violates the no-edit requirement)

## [2026-03-04] Strategies Audit & Roadmap Update
- **Action**: Conducted a comprehensive audit of the roadmap against state-of-the-art 2026 pet management app trends.
- **Action**: Created `petbase-system-instructions.md` to formalize rules around PII field-level encryption, onboarding checklists, and documentation maintenance.
- **Action**: Updated `PetBase-Roadmap.md` with explicit 2026 strategic objectives (Zero-Knowledge FLE, Contextual AI).
- **Action**: Formulated the Implementation Plan into clear, executable steps for Claude Code AI handoff.

## [2026-03-05] Phase 4: Cards.tsx Full Rebuild (Contextual Sharing & QR Ecosystem)

- **Installed** `qrcode.react` and `html2pdf.js` packages.
- **Rebuilt** `src/pages/Cards.tsx` from scratch — the entire file was static/hardcoded (Max & Bella demo cards). It now:
  - **Reads from PetContext** (`usePets()`) — all card data is dynamic; the page shows an empty state with a "Create Your First Card" CTA if the user has no cards yet, and a "Go to My Pets" redirect if the user has no pets at all.
  - **Create Card Modal**: Full wizard with pet selector dropdown, 3 card type templates (Vet / Sitter / Emergency) that auto-populate sensible sharing toggle defaults, a 7-option expiration picker (24h → 48h → 1 week → 1 month → 3 months → 6 months → 1 year; default 48h), and per-field contextual sharing toggles (Basic Info, Medical Overview, Vaccine Records, Diet, Emergency Contact, Vet Info).
  - **Card Preview** (`CardPreview`): Intentionally kept light for print/share fidelity. Shows REVOKED/EXPIRED status banner when relevant. Pet name is a `<Link to="/pets">` — clicking it navigates to My Pets. QR code generated via `QRCodeCanvas` from `qrcode.react`, encoding `/cards/view/{cardId}` and hidden when card is expired/revoked.
  - **Card Actions Panel** (`CardActionsPanel`): Active/Expired/Revoked badge, countdown timer ("2d 3h remaining · expires Mar 7..."), Share Link (uses `navigator.share` with clipboard fallback), Save PDF (dynamic import of `html2pdf.js`, targets card preview DOM node by ID), Print (`window.print()`), Revoke (immediately sets `status: 'revoked'` in state). Share Link is disabled when not active.
  - **Your Cards List** (`CardTile`): Dynamic tile per card showing pet avatar, pet name + card type, status indicator dot, and time remaining. Clicking a tile selects it for preview. "Add Another Card" shortcut at bottom.
  - **UX fixes**: Edit Info button removed. Hardcoded "Other Cards" section replaced by dynamic list. Pet name clickable. No hardcoded Max/Bella content.
- **Architecture note**: Card state is currently in-memory (component `useState`). Phase 5/6 future sprint: persist cards to Firestore with a `cards` subcollection under `users/{uid}/cards`. The `expiresAt` timestamp serves as the access control gate for both the UI and future server-side validation.
- **TypeScript**: All 3 compile errors resolved (qrcode.react named export `QRCodeCanvas`, `type ReactNode` import, key-prop spread pattern).

## [2026-03-05] Phase 4.5 & Phase 5 Planning

- **Action**: Finalized the `implementation_plan.md` for major new feature additions and UX refinement based on detailed user feedback.
- **Action**: Updated `PetBase-Roadmap.md` significantly to inject **Phase 4.5 (Polish & Bug Fixes)** and expanding **Phase 5 (Community & Service Directories)**.
- **Architecture Note**: Per user instruction, Phase 5 Community (Roles, Events, Feed) and Services features will be built purely as frontend/Local Storage prototypes to prioritize rapid UX iteration. The roadmap incorporates a specific subsequent milestone (Phase 6) to migrate these prototypes into Firebase Firestore structured collections.
- **API Note**: The Services component will build wrapper interfaces targeted at Google Places and Yelp. Step included in roadmap for the administrator to later configure production API keys from GCP/Yelp developer portals. Code will be architected with "mobile device end-state" in mind (cross-platform responsive fidelity).

## [2026-03-05] Phase 6.5 Planning
- **Action**: Added Store Discovery & Deep Customization phase to Roadmap and Implementation Plan.
- **Goal**: Expand location-based discovery to include Pet Stores and Web properties. Add deep customization to User privacy (removing emails) and Pet/User Avatars (cropping/shapes).
- **Dependencies**: Added `react-easy-crop` to `package.json` to facilitate client-side bounding box masking before uploading to Firebase Storage or encoding to base64.

## [2026-03-05] Phase 6.5 Implemented
- **Action**: Delivered full Deep Customization and Store Discovery features.
- **Store & Web Discovery**: Added a "Stores" tab to the Search page, complete with mock APIs (`storeApi.ts`) integrating Nearby Pet Stores and Popular Pet Websites with Recents and Favorites functionality.
- **Profile Customization**: Integrated `ImageCropperModal` using `react-easy-crop` into `ProfileSettings.tsx`. Users can upload avatars, crop them, and select from 4 border shapes (Circle, Square, Squircle, Hexagon). Ensure public profiles hide PII emails.
- **Pet Customization**: Upgraded the Pet interface and `PetFormModal.tsx` to include `avatarShape` and `pageLayout` options. Updated `Pets.tsx` and `Cards.tsx` to inherit these new visual identity markers.
