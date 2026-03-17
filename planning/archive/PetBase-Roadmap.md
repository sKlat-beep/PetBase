# PetBase Roadmap: 2026 Strategic Vision

## Phase 0: AI Workspace & Context Compaction
- [ ] **Limit Tool Noise**: Minimize unnecessary filesystem exploratory commands.
- [ ] **Semantic Context (`jcodemunch`)**: Utilize `jcodemunch` MCP tools for token-efficient codebase exploration instead of blindly reading large files.
- [ ] **Strict Logging**: Write completed iterations and the next inline step to `dev-log.md`.
- [ ] **Continuous Compaction**: Issue `/clear` immediately after safely logging progress.
- [ ] **Read-On-Demand**: Recover context in a new session by reading *only* the last 10-20 lines of `dev-log.md`.

## Phase 1: Foundation & UI Shell (Completed)
- [x] Initial project setup (React, Vite, Tailwind CSS)
- [x] Responsive application layout (Sidebar, Mobile Menu)
- [x] Dashboard UI (Upcoming events, Quick stats)
- [x] My Pets UI (Pet profiles, stats, medical overview)
- [x] Community UI (Groups, Discussions, Meetups)
- [x] Find Services UI (Search, Filters, Provider cards)

## Phase 2: Authentication & "Zero-Trust" Security (Completed)
- [x] Firebase integration setup
- [x] Authentication Context & Protected Routes
- [x] **Fix Firebase Domain Authorization**: Whitelist local and production domain configurations (Step 1).
- [x] **UI Layout Refactor**: Ergonomic move of Profile icon to the bottom-left navigation (Step 2).
- [x] **Dark Mode Foundation**: System-wide theme toggle for accessibility and modern UX (Step 2).
- [x] **Profile & Privacy Hub**: Edit PII, 2FA. Enforce "Private by Default" for all new accounts (Step 2).

## Phase 3: Privacy-First Data Modeling (Completed)
- [x] **Zero-Knowledge Field-Level Encryption (FLE)**: Implement client-side AES-256-GCM encryption for PII (Address, Medical Notes) before Firestore sync, ensuring strict data sovereignty (Step 5).
- [x] **Pet Management Modals**: Contextual Card-based UI for Add/Edit Pet with 5,000-character encrypted notes validator (Step 3).
- [x] **Progressive Onboarding**: Dynamic "Getting Started" checklist with gamified milestones to funnel users into app ecosystem; replaced by recommendation banners upon completion (Step 4).

---

## Phase 3.5: Pet Profile Completeness (Audit-Driven — High Priority)

> Items below were identified as missing or non-functional during the [2026-03-04] Feature Audit. These must be resolved before Phase 4 work begins.

### Pet Form — Expanded Fields
- [x] **Likes & Dislikes Editing**: Comma-separated Likes and Dislikes inputs added to `PetFormModal.tsx` (Personality & Play tab).
- [x] **Measurements**: Height, length, BCS fields added to `Pet` type and form. "Update Measurements" button wired to open Edit modal (Health & Diet tab).
- [x] **Diet & Feeding Schedule**: `dietSchedule` array added to `Pet` type; Primary Diet / Food field in form. `dietSchedule` preserved on save.
- [x] **Activity Level**: Dropdown (Low / Moderate / High / Very High) added to `PetFormModal` Personality & Play tab.
- [x] **Favorite Activities & Type of Play**: Both added to `Pet` type and `PetFormModal`. Displayed on pet card in Pets.tsx.
- [ ] **Profile Photo Upload**: URL input field added to form. Full Firebase Storage upload deferred to future sprint.

### Pet Form — Medical Records
- [x] **"View Full Records" Modal**: `MedicalRecordsModal` created. Tabbed UI with fully editable vaccine list and vet visit history. Wired to "View Full Records" button in `Pets.tsx`.
- [x] **Vaccine Status Tracking**: Auto-calculated status badges (✅ Up to Date / ⚠️ Due Soon / ❌ Overdue) based on next due date. Editable last admin and next due date per vaccine.
- [x] **Medical Overview Notifications**: Modal header shows overall vaccine status summary (overdue/due-soon/up to date).
- [x] **Medical Visit History**: Editable vet visit log (date, clinic, reason, notes) added to Vet Visits tab of `MedicalRecordsModal`.

### "Getting Started" Guide — Step Navigation
- [x] **Navigate on Click**: Each step in `GettingStartedGuide.tsx` routes the user when clicked:
  - "Add your first pet" → `/pets` + open Add Pet modal
  - "Share a pet card" → `/cards`
  - "Join a community" → `/community`
  - "Find nearby services" → `/search`
  - Remove the `disabled` attribute and `cursor-default` from the "add-pet" step to allow navigation.

### My Pets — Pet Card Shortcut
- [x] **"View Card" Button per Pet**: "View Card" link added to each pet's hero image in `Pets.tsx`, passing `state: { petId }` to `/cards`.

---

## Phase 4 (Revised): Contextual Sharing & QR Ecosystem

> Full rebuild of `Cards.tsx` required. Page is currently 100% static/hardcoded with no PetContext integration.

### Core Architecture
- [x] **Connect Cards to PetContext**: Dynamically render cards from PetContext/Firestore. Remove all hardcoded "Max"/"Bella" placeholder content.
- [x] **Card Summary Tiles**: Each card tile must show: pet photo, pet name (clickable → `/pets`), card type, expiration date, and status (Active / Expired / Revoked).

### Sharing & Access Control
- [ ] **QR Code Generation**: Generate a unique scannable QR code for each card linking to a public read-only URL. The QR must reflect contextual sharing selections.
  > QR infrastructure (publicCards, SharedCardPage, share URLs) is complete. QR display widget not yet implemented — see TASK-39.
- [x] **Contextual Sharing Toggles**: Per-field share toggle controls before generating a card link: Basic Info, Medical Overview, Vaccine Records, Diet, Emergency Contact, Vet Info. Maps to Vet / Sitter / Emergency templates.
- [x] **Card Expiration System**: Default 48-hour expiration with a configurable picker (24h / 48h / 1 week / 1 month / 3 months / 6 months / 1 year). Show expiration date in card summary. Auto-expire and deny access after the timer.
- [x] **Revoke Card**: Add per-card "Revoke" button that immediately invalidates the link/JWT regardless of expiration.

### Export & Print
- [x] **Real PDF Download**: Implement `html2pdf.js` or server-side PDF rendering. "Save PDF" button is currently static and non-functional.
- [x] **Print**: Wire "Print" button to `window.print()` on a print-optimized card layout.

### UX & Navigation Fixes
- [x] **Remove "Edit Info" Button**: Remove the "Edit Info" button from `Cards.tsx`. Cards must not be editable from this menu—only from My Pets.
- [x] **Pet Name Navigation**: Make the pet name on each card a clickable link to `/pets`.
- [x] **Remove Hardcoded "Other Cards" Section**: Replace the static "Other Cards" panel with a dynamic list of the user's real card records.

---

## Phase 4.5: Polish, UX & Bug Fixes
- [x] **UI Text & Encoding**: Fixed all instances of corrupted characters (`ΓÇó`, `ΓÇª`) across source files.
- [x] **Dashboard Refinement**:
  - Make Getting Started guide steps mark as complete only upon actual action.
  - Make minimization of the Getting Started guide persistent via `localStorage`.
  - Fix "View all" link in Your Pets to navigate to My Pets.
  - Implement a 90-day Calendar View modal for upcoming events mapping to dates.
  - Quick Actions hookup: Add Meds, Add Vet visit, Create shareable card.
  - Remove "Add Event" button from Dashboard.
- [x] **Pet Cards Optimization**:
  - Add 5-minute undo timer for Card Revocation. If timer expires, consolidate into a lightweight access log entry.
  - Complete customizable duration generator (input days/hours with 8 hr minimum).
  - Print & PDF Fixes (print stylesheet scoping, solve html2pdf hanging).
  - Condense Card Actions into the card preview area.
  - Performance improvements for initial page renders (lazy load PDF engine).
- [x] **Pet Cards Full Overhaul (2026-03-09)**:
  - Field ordering: Household Information at top, rest alphabetical; "Basic Info" → "Pet Description"
  - Vet card 365-day default; Sitter card 8hr default with correct field defaults
  - "Emergency Card" → "Custom Card" with singleton template (localStorage) + one-active enforcement
  - Snapshot-based cards: preview and shared URL render from same petSnapshot data source
  - Revoke = immediate URL invalidation; Firestore doc permanently deleted after 5-min undo window
  - Revoked/Expired list capped at 10 entries
  - SharedCardPage: dislikes, actual microchip ID, Household Information section — matches CardPreview exactly
- [x] **Medical Records Enrichment**:
  - Add "More information" tooltips for common core vaccines (brands, dosages, frequency).
  - Inject mandatory "consult your vet" disclaimers.
  - Deep-link "Due soon" status tags dynamically to scroll to specific modal entries.

### Phase 4.5 Additions (Approved 2026-03-06)
- [x] **Unify UserProfile schemas**: Merge `UserProfile` (AuthContext) and `UserProfileData` (firestoreService) into one canonical `src/types/user.ts` type; fix mismatched visibility enum strings.
- [x] **Block seed pet Firestore leakage**: Prevent `savePet` from writing pets with hardcoded seed IDs `'1'`/`'2'`; seed pets are display-only until user explicitly creates their own.
- [x] **Remove all seed/mock data**: Remove `SEED_PETS` from PetContext, mock results from `serviceApi.ts`, `storeApi.ts`, `lostPetsApi.ts`; replace with proper empty states.
- [x] **Fix hardcoded upcoming events**: Remove hardcoded Max/Bella events from Dashboard; show empty state if no real events exist.
- [x] **ProtectedRoute loading spinner**: Replace blank `null` return during auth loading with a centered spinner.
- [x] **Replace `alert()` in Cards.tsx**: Implement an inline toast/success badge instead of browser `alert()` for clipboard copy confirmation.
- [x] **Time-aware Dashboard greeting**: Derive "Good morning / afternoon / evening" from `new Date().getHours()`.
- [x] **Persist Getting Started guide collapsed state**: Write collapsed/expanded state to localStorage on toggle.
- [x] **Persist card state to localStorage**: Serialize `cards[]` to localStorage as interim storage before Phase 7 Firestore migration; show a dismissible session-local note to users.
- [x] **Fix `searchServices` dependency array**: Remove `pets` from the Dashboard `useEffect` deps for the service search — only trigger on `profile?.zipCode` change.
- [x] **Remove `handleSavePet` wrapper**: Pass `addPet` directly to `PetFormModal.onSave` in Dashboard.
- [x] **Fix `key` prop spread anti-pattern**: Replace `{...{ key: c.id }}` pattern with `key={c.id}` directly in Cards.tsx.
- [x] **Remove `DEFAULT_SHARING` dead code**: Remove unused constant from Cards.tsx.
- [x] **Remove unnecessary `import React`**: Clean up App.tsx for React 19 JSX transform.
- [x] **Fix mojibake in source file comments**: Fix corrupted separator characters in `firestoreService.ts` and `crypto.ts`.
- [x] **Vaccine sorting — overdue/due-soon pinned to top**: Auto-sort MedicalRecordsModal vaccine list by urgency.

---

## Phase 4.6: Encryption Upgrade & Data Portability (Approved 2026-03-06)
- [x] **PBKDF2 key derivation**: Replace `getOrCreateUserKey` (random key → localStorage) with PBKDF2 derived from user's password + per-user salt. Key is never stored — recomputed on each login. Solves device portability without cloud key storage.
- [x] **Cache derived CryptoKey in memory**: Module-level `Map<uid, CryptoKey>` to avoid re-importing the key on every Firestore call; cleared on sign-out.
- [x] **In-app encryption warning**: Show a dismissible banner in ProfileSettings and on first visit after sign-in on a new device when data cannot be decrypted. Message: _"This device doesn't have access to your encrypted data. Re-enter your password to restore access, or import a backup."_
- [x] **Encrypted data export**: Add "Export Encrypted Backup" to ProfileSettings — serializes all localStorage PII (pets, medical records, expenses) as a single JSON file encrypted with the user's derived key.
- [x] **Encrypted data import**: "Import Backup" in ProfileSettings accepts the exported file, attempts decryption with the derived key, and restores data to localStorage.
- [x] **Encrypt expense labels in localStorage**: Expense notes can contain PII; encrypt via `encryptField` before localStorage write, decrypt on read.
- [x] **Encrypt medical records in localStorage**: Vaccine records and vet visit history currently stored unencrypted in localStorage; encrypt before write, decrypt on read.

---

## Phase 4.7: Pet-Aware Search (Approved 2026-03-06)
- [x] **Pet-aware result scoring**: `searchServices` and `storeApi` receive the user's pet list (types, breeds, sizes); results that explicitly match (e.g., groomer listing "accepts large dogs") receive a **Verified for your pet** badge.
- [x] **Unverified results still displayed**: Results with no matchable pet metadata are shown without the badge and labeled _"Call to verify compatibility"_.
- [x] **Pet filter chips in Search UI**: Visible active filter chips showing which pet types/breeds are active in the search context; allow toggling per-pet for multi-pet households.

---

## Phase 5: Performance & Community

### Route-Level Performance (Approved 2026-03-06)
- [x] **Route lazy loading**: Add `React.lazy()` + `Suspense` for `Cards`, `Community`, `GroupHub`, `Search`, and `ProfileSettings` to reduce the initial auth-page bundle size.

### Community & Nearby Services

### Community Groups & Roles (Local Prototype)
- [x] **User Group Limits**: Max 3 owned groups, unlimited joins/moderation.
- [x] **Role Permissions System**:
  - **Owner**: Edit group, assign roles, ban users, delete posts.
  - **Moderator**: Approve joins, ban users, manage events.
  - **Event Coordinator**: Manage events only.
  - **User**: Read/write/RSVP.
- [x] **Community Page UI**:
  - Compact group icons ("Your Groups") limited to 4 viewable, expandable via dropdown.
  - "Manage Groups" modal for favorite toggling, leaving groups, showing new comments/events ping.
- [x] **Group Feed View**:
  - Open full discussion/event view upon clicking a group tile.
  - 60-day auto-pruning.
  - Pinned posts (Max 3, managed by Mod/Owner).
- [x] **Dashboard Sync**: RSVP'd community events rendered under "Community Events" section in Dashboard.

### Find Services & APIs (Local Prototype)
- [x] **Public API Wrapper**: Create the scaffolding to connect to Google Places and Yelp for local service directory lookups (using ZIP or GPS coordinates).
- [x] **Smart Filtering**: Toggles for dog size, breed, and specific requirements.
- [x] **Uncertainty UI Tag**: Visually warn users to "call to verify" if an API result isn't explicitly tagged pet-friendly.
- [x] **API Configuration Admin Step**: Build out documentation/settings flow for the app owner to generate and input their own Google Places / Yelp production API keys later.

---

## Phase 6: Search, Location & Polish

### Global Search & Messaging
- [x] **Global Search**: Integrated search bar for finding users and communities.
  - [x] Profile Visibility Options: Public, Friends Only, Private — `ProfileVisibility` type + `SocialContext.searchUsers` enforces rules.
  - [x] Private profiles cannot be found in search. Public profiles display Username, Avatar, and Pet Info.
  - [x] **Friends System**: `SocialContext` — `sendFriendRequest`, `acceptFriendRequest`, `removeFriend` implemented.
  - [x] Messaging interface: `SocialContext` — `sendMessage`, `markMessagesRead`, `messages[]` state.
  - [x] Blocking mechanism: `blockUser`, `unblockUser` in `SocialContext`; blocked users excluded from `searchUsers`.
  - [x] **People Page (`/people`)**: Full social directory UI — search users, send/accept friend requests, message, block. Lazy-loaded route in App.tsx. Nav link in Layout sidebar.
- [x] **Location & Zipcode Core**: `LocationPromptModal.tsx` auto-shows on first login when profile has no zipCode; saves to profile via `updateProfile`. Wired in `Layout.tsx`.
- [x] **Search Location Override**: Inline session-override zipcode input in Search.tsx. "Make Permanent" button calls `updateProfile({ zipCode })` to persist the override.
- [x] **Recommended Groups**: Tabbed UI in `ManageGroupsModal.tsx` — "Your Groups" + "Recommended" tab. Sorts by pet type match and zipcode proximity.

### UI & UX Refinements
- [x] **Modal Drag-Select Bug**: Fixed in Phase 6.6 — `onMouseDown` backdrop pattern across all modals.
- [x] **Dashboard Local Services**: Mini service widget in Dashboard.tsx — category quick-links (Vets/Groomers/Sitters/Walkers/Trainers) + top-rated service card; "Find more" links to Search.
- [x] **Dashboard Emergency Action Bar**: "Nearest 24/7 ER Vet" (→ /search with Emergency+24/7 filters) and "Animal Poison Control" tel: link — both in Dashboard.tsx.
- [x] **Group Feed Privacy**: "Recent Discussions" section only renders when `userGroups.length > 0` in Community.tsx.
- [x] **Group Membership & Roles**: Member count in GroupHub header. Member list restricted to Leadership Team only. Owner implicitly a member. Owner-only "Assign Roles" panel with user search + role select in GroupHub sidebar.
- [x] **Theme Persistence**: Dark/light toggle in GettingStartedGuide.tsx with `localStorage.setItem('petbase-theme', newTheme)` persistence.

### Hyper-Local & Social Enhancements
- [x] **Lost Pet Alerts**: Feature triggered from a "Mark as Lost" button inside a specific Pet's Modal, rather than a generic profile flag.
  - [x] Warns the user of how it works when clicked (confirm dialog in Pets.tsx).
  - [x] **Grace Period**: 15-minute grace period in `lostPetsApi.ts` — alerts inside grace are filtered from community view.
  - [x] **Auto-Expiration**: 3-day auto-expiration in `lostPetsApi.ts`.
  - [x] **Dashboard View**: Dashboard shows most recent local alert via `getActiveLostPets`.
  - [x] Opt-out toggle (`lostPetOptOut`) in `UserProfile` type and ProfileSettings.
  - [x] **Fixed**: `toggleLostStatus` in Pets.tsx writes to `petbase-lost-pets` localStorage. lostPetsApi reads from this key correctly.
- [x] **Public Profile Statuses**: `PublicStatus` type in `user.ts`; `publicStatus` field editable in `ProfileSettings.tsx` (dropdown); displayed in `SocialContext.searchUsers`.
- [x] **Community-Sourced Place Reviews**: Users can add timestamped Tips to service cards in Search.tsx. Up to 5 tips per service shown in a "Community Tips" section on each result card.

### Medical Records Enhancements
- [x] **Vaccine Sorting**: Auto-pin "Due Soon" / "Overdue" vaccines to the top via `sortedVaccines` useMemo in `MedicalRecordsModal.tsx`.
- [x] **Custom Ordering**: Drag-to-reorder vaccine list in MedicalRecordsModal.tsx with localStorage persistence per pet.

---

## Phase 6.5: Store Discovery & Deep Customization

### Store & Web Discovery
- [x] **Search Tabs Expansion**: Add "Stores/Supplies" to find nearby pet stores.
- [x] **Popular Pet Websites**: Horizontal scroller/expanding section showing local sites with logos and URLs.
- [x] **Recent & Favorited**: Track recently clicked sites/stores and allow favoriting to pin them to the top of lists.

### Profile Customization & Privacy
- [x] **Privacy Update**: Ensure public user profiles exclusively show the Display Name, not emails or real names.
- [x] **Avatar Upload & Cropping**: Add a profile picture uploader with square cropping and a shape selector (e.g., Circle, Squircle, Hexagon).

### Pet Profile Expansion
- [x] **Pet Avatars**: Upload, crop, and shape-mask custom pet avatars.
- [x] **Card Layout Variants**: Toggle pet cards between a full-background photo or a solid background with a smaller styled profile photo.

---

## Phase 6.6: Polish & Group Enhancements

### UI & Modal Resiliency
- [x] **Modal Drag-Select Fix**: Change modal close behaviors to prevent accidental closure when dragging text out of a modal.
- [x] **UTF-8 Enforcement**: Ensure `<meta charset="utf-8">` is strictly defined in `index.html`.

### Search & Services Integrations
- [x] **Dashboard Emergency Action**: Wire "Nearest 24/7 ER/vet" to navigate to Search with `Emergency` and `24/7` filters applied.
- [x] **Smart Filters Expansion**: Add 20 of the most common filters to the Find Services UI.

### Pet State & Social
- [x] **Mark Lost Button Fix**: Debug and fix the `toggleLostStatus` state dispatch in `Pets.tsx`.
- [x] **Group Hub About Section**: In `GroupHub.tsx`, move the "About" section to the top, make it minimizable, and persist its collapsed/expanded state.

---

## Phase 6.7: Bonus Features
- [x] **Data Export**: Add utility to download all pet data as JSON from settings.
- [x] **Photo Galleries**: Add gallery tab to pet profile (max 10 photos) with visual preview and delete buttons.
- [x] **Calendar Integration**: Add button to download `.ics` calendar file for vaccines in Medical Records.
- [x] **Expense Tracking**: Add a new dashboard module to log and track pet-related expenses.

---

## Phase 7: Persistence Migration & Mobile Readiness
- [x] **Firebase Migration**: Community Groups, Roles, Posts, Events, and Members migrated to Firestore subcollections (`groups/{groupId}/members|posts|events`). API keys migrated to `users/{uid}/config/apiKeys`. `CommunityContext` uses `onSnapshot` + optimistic mutations. Full Firestore Security Rules defined in `firestoreService.ts` JSDoc.
- [x] **React Native / Capacitor Compatibility Review**: `src/utils/platform.ts` created with `isNative()`, `canPrint()`, `canShare()`, `canDownloadFile()`. `Cards.tsx` platform-guarded. localStorage confirmed Capacitor-safe. CSS `oklch()` fallback noted for Phase 8.

## Phase 8: Hyper-Local, AI & Identity
- [x] **Predictive Wellness Engine**: `WellnessEngine.ts` — deterministic on-device rules engine. Analyzes age, weight, BCS, activity, lastVet, vaccines, and notes keywords. Generates `WellnessInsight[]` sorted by severity. "Smart Insights" collapsible panel added per pet in Pets.tsx. Zero external API calls.
- [x] **H3 Geo-Indexing**: `h3Service.ts` using `h3-js`. `resolveUserH3()` tries browser geolocation then zip code lookup table (47 US metros). Privacy-preserving: only H3 cell index (~5 km²) stored in Firestore, never exact coordinates.
- [x] **Community Safety Alerts**: `SafetyAlertsContext.tsx` + Firestore `safetyAlerts` collection. H3 k-ring query (7 cells, ~35 km²) with zip fallback. Dashboard widget. 3-day TTL. 6 categories. Firestore Security Rules defined.
- [x] **Auto-Delete Routines**: Cards.tsx purges expired/revoked cards > 30 days on load. `lostPetsApi.ts` purges 3-day-old lost pet entries on each read cycle.
- [x] **Accessibility (WCAG 2.1 partial)**: `role="dialog"` + `aria-modal` + `aria-labelledby` on PetFormModal. `aria-live="polite"` for Cards toast. `aria-label="Main navigation"` on sidebar nav. Global `:focus-visible` ring in index.css.
- [x] **oklch CSS fallback**: `@supports not (color: oklch(...))` block in index.css with sRGB fallbacks for Android WebView < Chromium 111.
- [x] **Performance optimization**: Lighthouse 95+ — PWA manifest, service worker, skip-nav, manual Rollup chunk splitting, preconnect hints, full meta/OG tags, security headers (HSTS, Permissions-Policy), favicon SVG, robots.txt.
- [ ] **Verifiable Credentials**: For Pet Health Records.

---

## Phase 8.5: UX, Data Flexibility & Family Sharing
- [x] **Card Engine & Sharing**
  - [x] Generate one unified "All Pets" card (composite card showing all non-private pets, with QR, share, PDF, and revoke).
  - [x] Multi-pet Card: top-level "Multi-pet Card" button; select 2+ pets; per-pet data toggles (collapsible); scrollable preview at single-card detail level; full Share/PDF/Print/Revoke ecosystem.
  - [x] Family Sharing: `Household` model; create/join (6-char invite code)/leave/kick/regenerate; `HouseholdContext`; `inSameHousehold()` pet co-management Firestore rule; Family section in ProfileSettings.
  - [x] Revoked Cards UI section (shrunk by default, max 50 cards or 1 year).
  - [x] PDF/Print export fix: Export only the card modal (hide Share, PDF, Print, Revoke buttons).
- [x] **Dashboard & Navigation UX**
  - [x] Dashboard module rearrangement ("Arrange Dashboard" toggle — hide/show Safety Alerts, Lost Pet, Your Pets, Services, Upcoming, Expenses, Quick Actions; persisted to localStorage).
  - [x] Animal Poison Control updates (ASPCA 888-426-4435 + PPH 855-764-7661 — both added as separate action buttons).
  - [x] Petbase logo always routes back to dashboard.
  - [x] Notifications Dropdown (upcoming vaccines/meds/visits, unread messages, group invites).
- [x] **Pet Creation & Medical**
  - [x] Pet Type dropdown (50 common pets) at creation.
  - [x] Dynamic vaccine defaults based on Pet Type (Dog, Cat, Rabbit, Ferret, Horse, Bird specific defaults).
  - [x] Vaccine customizable recurring administration + "Administered today" quick button (auto-calculates next due from interval).
  - [x] Medication section — new Medications tab in MedicalRecordsModal (name, dosage, frequency, start/end date, notes).
  - [x] Mobile Pet Edit UI: Replace horizontal scrollbar with Left/Right navigation arrows.
  - [x] Photo gallery native file upload (max 5MB, image/* only, grid preview with delete; replaces URL inputs).
  - [x] Smart Insights liability disclaimer tooltip (discuss with licensed vet).
- [x] **Community & Profiles**
  - [x] Profile Jump-Navigate Toolbar (pill-style section anchors: Profile Info, Privacy, Appearance, Data & API, Danger Zone).
  - [x] Group creation automatically asserts "Owner" role; owners cannot join as "Members".
  - [x] Group creation Search Tags (max 10) — added as filters to Community and Recommendation logic.

## Phase 8.6: Deep UX Polish (Completed)
- [x] **Dashboard & Quick Actions**
  - [x] Emergency Assistance button (consolidates Nearest 24/7 ER Vet, ASPCA Poison Control, Pet Poison Helpline into one modal).
  - [x] Rename "Arrange" → "Modify Dashboard".
  - [x] "My Groups" widget — shows up to 3 joined groups (name, member count, tag); "View All" → `/community`.
  - [x] "Friends" widget — shows up to 3 friends (avatar/initials, name, pets); "View All" → `/people`.
- [x] **Pet Form Standardization**
  - [x] Top-10 pet type categories (Dog, Cat, Rabbit, Bird, Fish, Reptile, Small Animal, Horse / Large Animal, Ferret, Other).
  - [x] "Other" pet type: shows custom text input; backward-compatible with old granular types.
- [x] **Medical & Event Logic**
  - [x] "Due Soon" threshold: 30 days → 14 days.
  - [x] Medication frequency default: "Once daily".
  - [x] Medication & Vaccine Frequencies: predefined dropdown + "Other" expands to custom text input.
  - [x] Vaccine "Custom interval": text input with smart parsing (e.g., "2 weeks", "3 months") → auto-calculates `nextDueDate`.
  - [x] Vet visit clinic autofill: "Use last: {clinic}" quick-fill link when current clinic is blank.
  - [x] Medical Overview counter: "Vaccines" → "Vaccines/Medications" with combined count by status (overdue/due-soon/up-to-date + active meds).
  - [x] Calendar "Today" shortcut on all date inputs (vaccine lastDate/nextDueDate, vet visit date, medication startDate/endDate).

## Phase 8.7: Critical Bugs & Family Hierarchy (Completed)
- [x] **Bug 1+2 — Card Checkboxes & Live Data**: Added vaccine records render block in `CardPreview` and `MultiPetCardPreview`; pet data reads live from PetContext so card reflects latest pet changes.
- [x] **Bug 2 — Notification Dropdown Positioning**: Added `side` prop to `NotificationsDropdown`; desktop sidebar uses `side="left"` (opens rightward); `max-w-[calc(100vw-1rem)]` prevents overflow.
- [x] **Bug 3 — True Dashboard Reordering**: `moduleOrder` state + `reorderModule()` with localStorage persistence; `CustomizeModal` shows ↑↓ arrow buttons per module; flat `moduleOrder.map` switch renderer replaces static 2-column layout.
- [x] **Family Hierarchy — Roles**: `HouseholdRole` (`Family Leader | Extended Family | Child | Member`), `MemberPermissions`, `ParentalControls`, `AuditEntry` types in `household.ts`.
- [x] **Family Hierarchy — Firestore**: `updateMemberRole`, `updateMemberPermissions`, `updateParentalControls`, `addAuditEntry`, `getAuditLog`, `ensureHouseholdForFamily` in `firestoreService.ts`. Audit log at `households/{id}/auditLog`.
- [x] **Family Hierarchy — Context**: `HouseholdContext` exposes `auditLog`, `updateMemberRole`, `updateMemberPermissions`, `updateParentalControls`, `addAuditEntry`, `promoteToFamily`.
- [x] **"Promote to Family" action in People**: Violet "Family" button on friend cards; creates household if needed; shows invite code modal for sharing.
- [x] **Family Role Management in Settings**: Expandable member rows (Family Leader only) with role selector, permission toggles, Child-specific parental controls; collapsible Audit Log accordion.

## Phase 8.8: Onboarding, Organization, Activity Logs & Help (Completed)
- [x] **Objective 1 — Onboarding Enhancements**: "Create a pet card" step (replaces "Share a card"); "Create a family" step with skip; `skippedSteps` set in localStorage; skip X button on each non-complete step; `isDone = isComplete || skipped`; centralized trigger helpers (`markCardCreated`, `markServicesFound`, `markFamilyCreated`) wired to actual events in Cards, Search, HouseholdContext
- [x] **Objective 2 — Dashboard Organize Mode**: "Organize Dashboard" button in Modify Dashboard modal closes modal and enters organize mode; drag-and-drop HTML5 reordering of all 7 modules; emerald grip-handle overlay + ring highlight per module in organize mode; "Done" exit banner
- [x] **Objective 3 — Pet Profile Upgrades**: Body Condition Score dropdown (Underweight / Healthy weight / Overweight) in PetFormModal; Medications field in SharingToggles + render block in CardPreview
- [x] **Objective 4 — Activity Logs & Financials**: `activityLog.ts` utility (60-day rolling, max 200, localStorage); `logActivity` wired into PetContext (addPet/deletePet), Cards (create/revoke), CommunityContext (join/leave); Recurring Expenses with frequency selector and "Stop" button; "Personal Activity Log" section in ProfileSettings (personal log + Family Audit Log for Leaders)
- [x] **Objective 5 — Global Help System**: `HelpModal.tsx` with 6-section FAQ (18 Q&As, two-level accordion); "Need Help?" link at sidebar bottom in Layout.tsx; GitHub issues link in footer

## Phase 8.9: Final Pre-Release Polish & Telemetry (Completed)
- [x] **Mobile Bottom Nav Bar**: Sticky 5-tab bottom nav (Home, Pets, Community, Search, Cards) for mobile; `pb-20 md:pb-8` content padding to prevent overlap
- [x] **Pets Page Responsive Fixes**: Pet name truncation + `break-words`; button label shortening + `text-xs sm:text-sm` scaling
- [x] **Dashboard Local Services Arrow Nav**: Prev/next arrow buttons replace horizontal scroll pill bar for service category navigation
- [x] **Spayed/Neutered + Microchip Fields**: New fields on `Pet` type; dropdown (Yes/No/Unknown) and text input in PetFormModal Health tab; sharing toggle + CardPreview render block in Cards.tsx
- [x] **Medication Card Display Fixes**: "As Needed" frequency bug fixed; medication notes shown on cards; General Information household-level notes block with per-card include toggle
- [x] **Client-Side Telemetry**: `src/utils/telemetry.ts` — 7-day rolling log, `logTelemetry`/`getTelemetryLog`/`serialiseTelemetryLog`
- [x] **React Error Boundary**: `src/components/ErrorBoundary.tsx` — class component; auto-dispatches crash reports via Firebase Functions callable; user-facing fallback UI with error ref ID
- [x] **Feedback / Report Issue Modal**: `src/components/FeedbackModal.tsx` — Feedback + Bug Report types; wired to "Feedback / Report Issue" button in ProfileSettings header
- [x] **Firebase Cloud Function — `sendReport`**: `functions/src/index.ts` — v2 `onCall`; routes crash/bug/feedback emails via nodemailer + Gmail SMTP; all destination addresses stored exclusively in Firebase Secret Manager

## Phase 9: Launch Polish & Critical Fixes (COMPLETE)
- [x] **Emergency Assistance Links**: ASPCA + Pet Poison Helpline changed from `tel:` to website links (`aspca.org`, `petpoisonhelpline.com`) opening in new tab
- [x] **Help/FAQ Feedback Button**: GitHub issues link replaced with "Report an Issue or Provide Feedback" button triggering FeedbackModal (wired in Layout.tsx)
- [x] **Print Button Removed**: Discrete Print button removed from all pet card action panels; grid updated to `grid-cols-2`
- [x] **Profile: API Configuration Removed**: Entire API Configuration section removed from ProfileSettings; `Plug` icon, state, and `saveApiKeys`/`loadApiKeys` calls removed
- [x] **Profile: Floating Save Button**: "Save Changes" converted to animated floating sticky button (bottom-right, `fixed`), visible only when form is dirty (`isDirty` state tracking)
- [x] **Profile: OAuth Password Hide**: "Change Password" button hidden for OAuth-only users (Google, etc.) — detected via `user.providerData`
- [x] **Location Modal Auto-fill**: "Allow Location" button added to LocationPromptModal; reverse-geocodes via Nominatim API to extract zip code, auto-fills the zip field
- [x] **Firebase Functions: Node 22**: `functions/package.json` engine updated from Node 20 → 22
- [x] **PDF Export Freeze Fixed**: All 3 pdf handlers clone the DOM node before passing to html2pdf — prevents html2canvas from mutating the live React tree and corrupting context state
- [x] **Blank Shared Cards Fixed**: `publicCards/{cardId}` Firestore collection stores non-PII pet snapshot on card creation; `SharedCardPage.tsx` renders it publicly at `/cards/view/:cardId` (no auth required); Firestore rules updated for public read
- [x] **People Search Fixed**: Replaced MOCK_DIRECTORY with real Firestore data in SocialContext; added `match /{path=**}/profile/{docId}` collectionGroup rule to firestore.rules
- [x] **PDF Export Final Fix**: Replaced html2pdf.js entirely with `printCard()` using `window.print()` + print CSS isolation; browser shows native preview/Save as PDF; 985 kB vendor-pdf chunk eliminated
- [x] **Group Name Uniqueness (Obj 2.3)**: Firestore query on `name` field before creation; inline error shown in CreateGroupModal
- [x] **Group Lifecycle Rules (Obj 2.4)**: Last member leaving triggers hard-delete of group + all subcollections; last owner intercepted with LAST_OWNER error and disband/transfer guidance
- [x] **Family Audit Log (Obj 2.2)**: Verified already writing to Firestore `households/{id}/auditLog`; added missing `auditLog` security rule to firestore.rules
- [x] **Household Naming (Obj 2.1)**: Verified — no uniqueness constraint exists; uses Firestore doc UUID as ID
- [x] **Group Events Management (Obj 2.5)**: `deleteEvent` added to CommunityContext; GroupHub Events sidebar panel with upcoming events list, RSVP button, delete (Owner/Mod only), and inline Create Event form (title, date/time, location, description, recurring toggle) restricted to Owner/Moderator/Event Coordinator
- [x] **Dashboard Organize Mode Upgrade (Obj 3.1)**: Replaced HTML5 DnD with `Reorder.Group`/`Reorder.Item` from `motion/react` in Modify Dashboard modal; drag handles via `useDragControls`; `layout` animations on all module wrappers; removed `organizeMode` state/banner
- [x] **Dashboard Quick-Links (Phase 10 Obj 3)**: Groups widget now deep-links to `/community/groups/:id` (GroupHub); Pets already links with `state.editPetId`
- [x] **Find Services Cloud Function (Obj 3.7)**: `findServices` Firebase onCall function proxies Google Places Text Search; `GOOGLE_PLACES_KEY` secret; `serviceApi.ts` wired via `httpsCallable`; graceful empty fallback

## Phase 10: Data Integrity & UX Refinements (COMPLETE)
- [x] **Pet Form Navigation**: Dynamic bottom buttons (Cancel/Next, Back/Finish) separate from a full-width "Save Changes" button that is green only when dirty.
- [x] **Measurement Inputs**: Strict number validation; Weight (lbs/kg), height/length (inches/cm); "Age" replaced with "Birthday" calendar date selector.
- [x] **Diet Fields**: Split into "Food Brand/Type" (string), "Amount" (number), and "Measurement" (dropdown for cups/half cups).
- [x] **Tags System**: Comma-separated inputs dynamically convert to Tags on comma or Enter.
- [x] **Avatar & Backgrounds**: Removed "full photo background" option layout (always solid-color).
- [x] **Dashboard Links**: Pet cards in "Your Pets" widget navigate to `/pets` + open edit modal via `state: { editPetId }`. Groups/Friends links already wired to `/community` and `/people`.

## Deployment
- [x] `firestore.rules` — Production Firestore security rules (household co-management via `inSameHousehold()`, community groups, users)
- [x] `storage.rules` — Firebase Storage rules (5 MB limit, `image/*` only, auth required to write, public read)
- [x] `firebase.json` — Hosting: `dist/` → SPA rewrite; added caching headers (assets: 1yr immutable, images: 1d, index.html: no-cache); `functions` block for Cloud Functions
- [x] `firestore.indexes.json` — Single-field index on `households.inviteCode`
- [x] `.firebaserc` — Project alias `petbase-ddfd7`
- [x] **Set Firebase Secrets** (once): `firebase functions:secrets:set SMTP_USER SMTP_PASS EMAIL_CRASH EMAIL_BUG EMAIL_FEEDBACK GOOGLE_PLACES_KEY`
- [x] **Run to deploy**: `cd functions && npm run build && cd .. && npm run build && firebase deploy`

---

## Phase 11: Optimization & Simplification (COMPLETE)
- [x] **Codebase Cleanup & Simplification**: Uninstalled html2pdf.js, removed unused exports from firestoreService/platform/telemetry, consolidated Context Providers into AppProviders.tsx.
- [x] **Performance & Bundle Optimization**: Verified tree-shaking for lucide-react and framer-motion; applied React.memo to ModuleRow in Dashboard.tsx.
- [x] **Architecture Audit**: Security rules verified (firestore.rules + storage.rules); TypeScript strict mode deferred (3,700+ errors discovered — incremental task for future phase).

## Phase 12: Architecture & Identity (COMPLETE)
- [x] **Search & Identity**: `@username#1234` unique identifiers generated in AuthContext on first login; displayed in ProfileSettings with copy button; People.tsx renders the `@name#tag` format; firestoreService searchPublicProfiles searches by both displayName and username; SocialContext.searchUsers filters out the current user.
- [x] **Card Parity & Sharing**: SharedCardPage.tsx handles multi-pet cards via `isMulti` flag; savePublicCard stores multiPetConfig to Firestore; card snapshots are complete (includes vaccines, medications, emergency contacts).
- [x] **Emergency Contacts on UserProfile**: New "Emergency & Vet Contacts" section in ProfileSettings (section-emergency anchor); stores Vet Clinic/Name/Phone/Address, Owner Phone, and 2 Additional Contacts in localStorage (`petbase-profile-emergency-{uid}`); Cards.tsx uses profile emergency contacts as fallback when pet has none set.

## Phase 13: E2EE Vault Sync + Data Structure Optimization (COMPLETE)
- [x] **Multi-device E2EE Sync**: `wrapKeyForVault`/`unwrapVaultKey` in crypto.ts; `saveVaultKey`/`loadVaultKey` in firestoreService; `VaultUnlockModal` shown on new device; "Cross-Device Sync" section in ProfileSettings; `ProtectedRoute` in App.tsx detects new-device state automatically.
- [x] **Data Structure Optimization**: Medical records write-through to `users/{uid}/vault/medical_{petId}` (Firestore) alongside localStorage; expenses write-through to `users/{uid}/vault/expenses`; both contexts fall back to Firestore vault on empty localStorage (cross-device load).

## Phase 14: PII Audit Compliance — task-20 [REVIEW]
- [x] **FLAG-4 (searchPublicProfiles)**: `PublicProfileInfo` interface carries no `avatarUrl`; search results never expose raw Storage URLs. (Remediated in task-10; verified clean in task-20.)
- [x] **FLAG-5 (resolveAvatarToken)**: Cloud Function upgraded to return signed Firebase Storage URL with 1-hour TTL (`expires: Date.now() + 3600000`) instead of permanent raw URL. Base64 data URLs and external auth photo URLs pass through unchanged.
- [ ] **Task-22**: UI Fix: Correct Default Vet Card Template Initialization.

## [2026-03-09] Task-22: UI Fix — Correct Default Vet Card Template Initialization [INTAKE — pending implementation]

**Task:** task-22.
**Objective:** Fix initialization bug where Vet Card defaults aren't applied on first modal load.

---

## [2026-03-09] Task-21: UI Fix — Remove Duplicate Medical Notes on Multi-Card [DONE]

**Task:** task-21.
**Objective:** Consolidate 'Diet or Medical Notes' into 'Health & Diet' and remove redundant 'Medical Notes' section on multi-cards.
**Objective:** Consolidate 'Diet or Medical Notes' into 'Health & Diet' and remove redundant 'Medical Notes' section on multi-cards.

---

## [2026-03-09] Task-20: PII Fix FLAG-4/5 — Signed Avatar URL Tokenization [IN-PROGRESS]
Cloud Function upgraded to return signed Firebase Storage URL with 1-hour TTL (`expires: Date.now() + 3600000`) instead of permanent raw URL. Base64 data URLs and external auth photo URLs pass through unchanged.
- [x] **Task-21**: UI Fix: Remove Duplicate Medical Notes on Multi-Card.

## Future Considerations (Post-Production Targets)
*These items are prioritized for post-release development and should not block the initial production launch.*
- **Multi-card Pet Templates**: Allow users to create reusable templates encompassing all their pets and specific contextual sharing options, eliminating the need to manually re-select data points when repeatedly issuing identical multi-pet cards.
- **Business/Sitter Profile Types**: Introduce a separate profile architecture for pet businesses and professional sitters. This feature will provide a unified, specialized dashboard allowing businesses to track all customer pet information, manage calendars, and view consolidated health records across their entire clientele.
```

