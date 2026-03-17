# Development Log

> [!NOTE]
> Use planning/TODO.md for task status tracking. Write dev-log entries only at Start, Complete, and Verified (no PII).

## [2026-03-15] TASK-39: Cards & QR Audit — COMPLETE

Read-only audit of entire cards/QR system. Key findings: QR renders only in `CardTile.tsx` sidebar (not main `CardPreview` pane); `qrcode.react` v4.2.0; URL pattern `/cards/view/{uuid}`; `publicCards` Firestore collection has correct security rules (unauthenticated read, owner-only write). 7 gaps identified with severity ratings. 6 recommended improvements prioritized (P1: QR in main preview; P2: print QR; P3: Firestore TTL; P4-P6: UX polish). No code changes made — report is the deliverable.

---

## [2026-03-15] TASK-41: TypeScript Strict Mode — COMPLETE

All 53 strict errors resolved to 0. Key changes across 9 files:
- **Dashboard.tsx**: `react-grid-layout` v2 API migration — flat props (`cols`, `rowHeight`, `margin`, `containerPadding`, `isDraggable`, `isResizable`, `resizeHandles`, `draggableHandle`) moved into `gridConfig`/`dragConfig`/`resizeConfig` objects; `Layout`→`LayoutItem` for single-item types; `onResizeStop` updated to v2 `EventCallback` signature
- **firestoreService.ts**: `DashboardLayoutItem` exported; `updatePetAlbum`/`updateUserAlbum` spread-fix for Firestore UpdateData compat
- **GroupHub.tsx**: `'Member'` → `'User'` (not in `CommunityRole` union)
- **Messages.tsx**: `.map((uid: string) => {` explicit type annotation
- **Search.tsx**: Removed dead narrowed-out `activeTab !== 'Stores'` check
- **AlbumDetailModal.tsx**: `typeof entry === 'string'` guard before `addPhotosToAlbum`
- **CommunityContext.tsx**: `result.posts as unknown as GroupPost[]`

**Verification:** `tsc --strict` exits 0; build exits 0 (6.24s); `firebase deploy --only hosting` ✓

---

## [2026-03-07] Phase 6: Search, Location & Polish — COMPLETE

All 5 remaining gaps confirmed implemented (session termination recovery). One residual mojibake fixed.

### Confirmed Implemented (pre-existing, not logged)
- **Lost Pet Alerts write fix**: `Pets.tsx:40` writes `petbase-lost-pets` localStorage on every `toggleLostStatus` call. `lostPetsApi` reads from this key correctly.
- **Search Location Override**: `Search.tsx` has inline session-override zipcode input with "Make Permanent" button that calls `updateProfile({ zipCode })`.
- **Global Search UI (`/people` page)**: `People.tsx` full social directory — search users, send friend requests, message, block. `Layout.tsx` has `/people` nav link with `UserSearch` icon. Route lazy-loaded in `App.tsx`.
- **Community-Sourced Place Reviews**: `Search.tsx` has `localTips` state, `addTip` function, and "Community Tips" section rendered per service result card. Up to 5 tips per service, persisted in component state.
- **Vaccine Custom Ordering (drag-to-reorder)**: `MedicalRecordsModal.tsx` has `draggedIndex` state + `draggable` attribute + `onDragStart`/`onDrop`/`onDragEnd` handlers. Reorder persisted to localStorage per pet.

### Group Membership & Roles — confirmed implemented (not logged)
- Member count: `{Object.keys(group.members).length} members` displayed in GroupHub header.
- Member list restricted: only "Leadership Team" (Owner/Mod) shown in sidebar — no full member roster exposed.
- Owner implicitly a member: added to `members` record on group creation.
- Role assignment User Search: Owner-only "Assign Roles" panel in GroupHub sidebar with `Search` input + `searchUsers()` filtered to current group members + `updateMemberRole` select dropdown.

- **`src/components/PetFormModal.tsx:608`**: `ΓÇª` → `...` in notes textarea placeholder. Last remaining corrupted character in the codebase.

## [2026-03-08] Deployment & Validation - COMPLETE
- Verified Vite frontend compiles without TypeScript errors.
- Verified Firebase Functions compile under tsc.
- Confirmed GOOGLE_PLACES_KEY is present and active in Firebase Secrets.
- Executed full irebase deploy containing Phase 9 and Phase 10 functionality. 
- Deployment completed successfully. 
- **Next Step:** Review roadmap for next priority features. Issue /clear command to wipe context memory before starting next objectives per Phase 0 Workspace Directives.

---

## [2026-03-14] TASK-33: Privacy Check — PASS [VERIFIED]
Fields checked: messageContent, messageFromUid, messageToUid, messageThreadId, messageParticipants, messageCreatedAt, messageExpiresAt, messageRead, messageDeletedBySender, messageDeletedByRecipient

---

## [2026-03-14] TASK-34: Privacy Check — PASS [VERIFIED]
Fields checked: groupRetentionDays
Both builds: PASS. UI review: PASS. Privacy check: PASS.

---

## [2026-03-11] Task 30: Remove Location Popup Modal — START
- Removed LocationPromptModal from layout and deleted the component implementation.

