# PetBase Task Board

Authoritative task list. Migrated from Brainfile on 2026-03-14.
Use /intake skill to add new tasks.

## Status Legend
- `intake` — captured, not yet started
- `in-progress` — actively being worked
- `review` — complete, awaiting PM approval
- `done` — deployed and verified
- `blocked` — waiting on a dependency (note reason inline)

---

## Open Tasks

### [TASK-36] Redesign Phase 2 — My Pets Page
Tags: ui, ux, pets, redesign
Contracts: unified-ui-design
Skills: ui-review
Status: done

**Description:**
Full My Pets page redesign: compact card grid replaces inline pet wall, PetDetailModal
hub with 5 collapsible sections, progressive disclosure, PetFAB, PetLostConfirmModal
replaces window.confirm, skeleton loading state, birthday-derived live age,
vaccine status dots, gallery lightbox, section state persistence via localStorage.

**UI Review:** PASS (2026-03-14) — all 11 components reviewed, all violations resolved.
**Build:** PASS — exit 0, 4.71s, no TS errors in new files.

**New files:**
- `app/src/components/pets/PetCard.tsx`
- `app/src/components/pets/PetFAB.tsx`
- `app/src/components/pets/PetDetailSection.tsx`
- `app/src/components/pets/PetOverviewPanel.tsx`
- `app/src/components/pets/PetHealthPanel.tsx`
- `app/src/components/pets/PetDietPanel.tsx`
- `app/src/components/pets/PetActivitiesPanel.tsx`
- `app/src/components/pets/PetDocumentsPanel.tsx`
- `app/src/components/pets/PetDetailModal.tsx`
- `app/src/components/pets/PetLostConfirmModal.tsx`

**Modified:** `app/src/pages/Pets.tsx` (582 → 295 lines)

---

### [TASK-35] Redesign Phase 1 — Dashboard (Customizable Widgets)
Tags: ui, ux, dashboard, redesign
Contracts: unified-ui-design
Skills: ui-review
Status: done

**Description:**
Full Dashboard redesign: glass surfaces on all widget cards, inline Edit Layout mode
with Reorder drag-and-drop (replaces popup CustomizeModal), new Quick Actions widget,
Hidden Widgets re-show row, motion-safe animations, full accessibility pass.

**Acceptance Criteria:**
- [x] "Edit Layout" toggle enters inline drag mode — cards drop to single-column Reorder.Group
- [x] Each widget shows grip handle + hide button in edit mode (min 44×44px touch targets)
- [x] Hidden widgets row lets users re-show any hidden widget without a modal
- [x] All widget cards use glass surface (backdrop-blur-xl bg-white/75 dark:bg-neutral-900/75)
- [x] Quick Actions widget: Add Pet, Messages, Find Services, Emergency (2×2 grid)
- [x] EmergencyModal: role=dialog, aria-labelledby, glass surface, bottom-sheet on mobile
- [x] Expense form: proper label elements, invalid label-wraps-button fixed
- [x] motion-safe: on all animations, useReducedMotion guards on motion.div

**Verification:**
- cd app && npm run build ✓ (2026-03-14, exit 0)
- /ui-review: PASS (2026-03-14)

<!-- UI Review: PASS 2026-03-14. All 14+6 violations resolved. Glass surfaces, touch targets, accessibility, motion-safe compliance, focus traps, label associations all verified. -->
<!-- UI Review: PASS 2026-03-14 (violation batch 2). 10 violations resolved: overflow-hidden on GLASS_CARD, EmergencyModal focus trap with tab cycling, min-h-[44px]+focus-visible rings on all interactive elements, dark: variants for emerald links, aria-hidden on decorative icons, inline confirm for stop-recurring (replaces window.confirm), expense toast with role=status, lazy PetFormModal+CalendarModal in Suspense, avatarUrl/pet.image comments for privacy contract. Build: exit 0. -->

---

### [TASK-22] UI Fix — Correct Default Vet Card Template Initialization
Tags: ui, ux
Contracts: unified-ui-design
Skills: ui-review
Status: done

**Description:**
Fix state initialization so that when 'Create Card' is clicked, the 'Vet Card' default
expiration and field selections are correctly applied without requiring a second click.

**Acceptance Criteria:**
- [ ] Clicking 'Create Card' with 'Vet Card' template selected immediately shows correct fields
- [ ] No second-click required to apply defaults
- [ ] Default expiration value is set correctly on first render

**Verification:**
- cd app && npm run build
- Manual test: select Vet Card template, click Create Card, verify fields are pre-populated

---

### [TASK-27] Bug — Profile Picture Not Saving or Visible in Search
Tags: bug, ui, profile, security
Contracts: unified-ui-design, privacy-contract
Skills: ui-review, privacy-check
Status: done

**Description:**
Fix profile picture persistence and visibility. The avatar does not update on the
navigation bar after saving, and it is not visible in public profile searches.
Requires ensuring `profile.avatarUrl` is correctly updated and handled in
`PublicProfileInfo`. Token resolution must remain server-side only.

**Subtasks:**
- [ ] Debug ProfileSettings save logic for avatarUrl
- [ ] Verify Layout.tsx re-renders on profile update
- [ ] Fix PublicProfileInfo missing avatarUrl/token resolution in search

**Acceptance Criteria:**
- [ ] After saving profile picture, nav bar avatar updates without page reload
- [ ] Profile picture is visible in People/search results for the user
- [ ] Avatar still resolves via `tokenService.getAvatarUrl()` — no raw URLs exposed

**Verification:**
- cd app && npm run build
- Manual test: save profile photo, verify nav bar updates
- Manual test: search for user, verify avatar visible in result

---

### [TASK-28] UI Fix — Prevent Mobile Sidebar Overlap with Bottom Navigation
Tags: ui, bug, ux, mobile
Contracts: unified-ui-design
Skills: ui-review
Status: done

**Description:**
The "user profile" navigation item at the bottom of the mobile sidebar is hidden behind
the fixed bottom navigation bar. The sidebar must stop where the bottom nav begins so
all menu items are visible and clickable.

**File:** `app/src/components/Layout.tsx`
**Fix:** Add `pb-16` (or equivalent) bottom padding to the mobile sidebar scroll container
to account for the `h-16` bottom navigation bar.

**Acceptance Criteria:**
- [ ] All sidebar menu items are visible and tappable on mobile viewport (375px)
- [ ] Profile nav item is not obscured by the bottom navigation bar
- [ ] Sidebar scroll works correctly with the padding applied

**Verification:**
- cd app && npm run build
- Manual test at 375px viewport: open sidebar, scroll to bottom, verify Profile item is visible and tappable

---

### [TASK-29] UI/UX — Mobile Bottom Navigation Feature Parity Update
Tags: ui, ux, mobile, feature
Contracts: unified-ui-design
Skills: ui-review
Status: done

**Description:**
Align the mobile bottom navigation bar with the desktop sidebar for full feature parity
and consistent nomenclature.

**Requirements:**
1. Add "People" button to mobile bottom nav (`/people`, icon: `UserSearch`)
2. Rename "Search" → "Find Services" in mobile bottom nav
3. Change mobile "/" route label from "Home" → "Dashboard" to match desktop
4. Full mobile audit: verify all desktop features are accessible on mobile

**File:** `app/src/components/Layout.tsx`

**Acceptance Criteria:**
- [ ] "People" route accessible from mobile bottom nav
- [ ] "Find Services" label used in mobile bottom nav (not "Search")
- [ ] "/" route shows "Dashboard" label on mobile
- [ ] All desktop sidebar routes have a mobile equivalent

**Verification:**
- cd app && npm run build
- Visual check at 375px: confirm all 5 nav items match desktop feature set

---

### [TASK-30] UI Cleanup — Remove Location Popup Modal
Tags: ui, modal, dashboard, profile, cleanup
Contracts: unified-ui-design
Skills: ui-review
Status: done

**Description:**
Remove the location popup modal entirely. It currently appears for new users on first
dashboard load and when users save profile changes. Remove these triggers and all
related UI/state logic.

**Files:**
- `app/src/components/Layout.tsx` — remove modal render/import
- `app/src/components/LocationPromptModal.tsx` — delete file

**Acceptance Criteria:**
- [x] No location modal appears on first dashboard load
- [x] No location modal appears after saving profile changes
- [x] `LocationPromptModal.tsx` is deleted and no dead imports remain
- [x] No console errors related to location modal

**Verification:**
- cd app && npm run build ✓ (2026-03-14, exit 0)

---

### [TASK-31] Feature — Household System and Management
Tags: household, permissions, ui, modal, firebase, feature
Contracts: unified-ui-design, firebase-governance, privacy-contract
Skills: ui-review, privacy-check
Status: done

**Description:**
Build the household system: household creation/management flows, role and permissions
model (owner, member), and supporting UI modals/pages. Members share visibility of
pets within the household per the role model.

**Acceptance Criteria:**
- [x] User can create a household and invite members via invite code (ProfileSettings → Family Sharing)
- [x] Role model (Family Leader, Extended Family, Child, Member) enforced in Firestore rules
- [x] Household management inline section in ProfileSettings — responsive on mobile
- [x] householdName encrypted before Firestore write; displayName encrypted in member doc
- [x] Household members can view (not edit) pets via HouseholdPetsPanel on Pets page

**Verification:**
- cd app && npm run build ✓ (2026-03-14, exit 0)
- cd functions && npm run build ✓ (2026-03-14, exit 0)
- /privacy-check: PASS (2026-03-14)
- /ui-review: PASS (2026-03-14)

<!-- UI Review: PASS 2026-03-14. HouseholdPetsPanel is lazy-loaded, theme parity verified, no RESTRICTED_PII displayed. -->
<!-- Privacy Check: PASS 2026-03-14. Fields: petName, petBreed, petSpecies, petVisibility, displayName (member), householdName, inviteCode, householdOwnerId — all UNRESTRICTED_DATA. 3 fields added to contract dict. -->

---

### [TASK-32] Feature — Public User Profile View
Tags: profile, public, ui, search, feature
Contracts: unified-ui-design, privacy-contract
Skills: ui-review, privacy-check
Status: done

**Description:**
Define and implement the public-facing user profile view for user search selections.
Shows basic profile info (display name, bio) and public pet info only. Includes both
an owner's view of their own public profile and a visitor's view via People/Search.

**Acceptance Criteria:**
- [x] Public profile shows: display name, avatar (tokenized), public pets only
- [x] No RESTRICTED_PII fields (address, phone, medical notes) visible on public view
- [x] Avatar resolves via tokenService — no raw URLs
- [x] Profile view adapts to bottom-sheet modal on mobile
- [x] Private pets are not shown on public profile

**Verification:**
- cd app && npm run build ✓ (2026-03-14, exit 0)
- /privacy-check: PASS (2026-03-14)
- /ui-review: PASS (2026-03-14)

<!-- UI Review: PASS 2026-03-14. Glass surface, focus trap, touch targets, lazy load, theme parity all verified. -->
<!-- Privacy Check: PASS 2026-03-14. Fields: username (added to dict), petName, petBreed, petSpecies, avatarShape, petVisibility, avatarUrl (tokenized), publicStatus, displayName. No RESTRICTED_PII exposed. -->

---

### [TASK-33] Feature — Messaging Platform (DMs)
Tags: messaging, dm, retention, ui, firebase, feature
Contracts: unified-ui-design, firebase-governance, privacy-contract
Skills: ui-review, privacy-check
Status: done

**Description:**
Implement a text-only direct messaging platform with 365-day retention.
- Users can delete received DMs (their own copy only)
- If a user blocks another, existing received messages from that user show "user blocked" but remain visible and deletable
- Multi-message selection for mass delete and mark-as-read
- No image sharing — text only
- UI/page/modal design required (use Pencil MCP)

**Acceptance Criteria:**
- [ ] Users can send and receive text DMs
- [ ] Messages older than 365 days are automatically deleted (Firestore TTL or scheduled function)
- [ ] Block behavior: messages show "user blocked" label, remain deletable
- [ ] Multi-select: bulk delete and mark-as-read
- [ ] Firestore rules: users can only read/write their own message collections
- [ ] No PII stored unencrypted in message metadata

**Verification:**
- cd app && npm run build
- cd functions && npm run build
- /privacy-check on message schema
- /ui-review on all new components

<!-- Privacy Check: PASS 2026-03-14.
Fields checked: messageContent, messageFromUid, messageToUid, messageThreadId, messageParticipants, messageCreatedAt, messageExpiresAt, messageRead, messageDeletedBySender, messageDeletedByRecipient
All 10 fields present in UNRESTRICTED_DATA dictionary. No encryption applied (correct — RESTRICTED_PII only). avatarUrl absent from all messages writes (resolved via tokenService only). Firestore rule: isSignedIn() && request.auth.uid in resource.data.participants. Update rule restricts changes to hasOnly(['deletedBySender','deletedByRecipient','read']).
-->

<!-- UI Review Report — TASK-33 (Re-check)
Date: 2026-03-14

File: app/src/components/Layout.tsx
- [PASS] Avatar img backgrounds include dark mode class (bg-stone-200 dark:bg-stone-700) at both mobile search results (line 255) and desktop sidebar search results (line 327)
- [PASS] All three NotificationsDropdown buttons (vaccine, pending request, unread message) include focus-visible:ring-2 focus-visible:ring-sky-500 focus rings
- [PASS] Messages nav badge rendering: icon wrapped in <div className="relative"> in both sidebar nav and mobile bottom nav; badge <span> positioned correctly with absolute placement; no new dark mode, focus, or accessibility violations introduced

Result: PASS
-->

---

### [TASK-34] Feature — Community Platform (Groups)
Tags: community, groups, permissions, events, ui, firebase, feature
Contracts: unified-ui-design, firebase-governance, privacy-contract
Skills: ui-review, privacy-check
Status: done

**Description:**
Build the community platform: group creation, role model (admin/moderator/member),
event scheduling, and configurable message retention (default 365 days, owner can
set shorter). Includes UI/page design in Pencil MCP before implementation.

**Acceptance Criteria:**
- [ ] Users can create, join, and leave groups
- [ ] Role model (admin, moderator, member) enforced in Firestore rules
- [ ] Group admins can configure message retention period
- [ ] Event scheduling: create events with date/time, visible to members
- [ ] Pencil design spec completed before any code written
- [ ] Group pages adapt to mobile (bottom-sheet modals, swipe gestures)

**Verification:**
- cd app && npm run build
- cd functions && npm run build
- /privacy-check on group schema
- /ui-review on all new components

<!-- UI Review Report — TASK-34 (Re-check)
Date: 2026-03-14

File: app/src/components/GroupRetentionModal.tsx
- [PASS] Escape key handler present: onKeyDown={(e) => e.key === 'Escape' && onClose()} on outer dialog div (line 33)

File: app/src/pages/GroupHub.tsx
- [PASS] Post button: min-h-[44px] present (line 179)
- [PASS] New Event button: min-h-[44px] present (line 233)
- [PASS] Event delete button: min-h-[44px] min-w-[44px] present, aria-label="Delete event" (lines 317-318)
- [PASS] Search input (role search): min-h-[44px] present (line 391)
- [PASS] Pin post button: min-h-[44px] min-w-[44px] present, aria-label="Pin Post"/"Unpin Post" (lines 490-491)
- [PASS] Delete post button: min-h-[44px] min-w-[44px] present, aria-label="Delete Post" (lines 501-502)
- [PASS] Role-search results container: no overflow-y-auto/scroll class — internal scrollbar removed (line 395)

Result: PASS
-->

<!-- Privacy Check — TASK-34
Date: 2026-03-14

| Field             | Location               | Category          | Encrypted? | PII? | Tokenized? | Status |
|-------------------|------------------------|-------------------|------------|------|------------|--------|
| groupRetentionDays | groups/{id}.retentionDays | UNRESTRICTED_DATA | No (correct) | No | No | PASS |

- groupRetentionDays confirmed present in UNRESTRICTED_DATA dictionary (contracts/privacy-contract.md line 121)
- Not encrypted: correct — UNRESTRICTED_DATA fields do not require field-level encryption
- Not PII: owner-configured integer (days); contains no identifying information

Result: PASS
-->

---

### [TASK-37] Redesign Phase 4 — Community Hub
Tags: ui, ux, community, people, redesign
Contracts: unified-ui-design
Skills: ui-review
Status: review

**Description:**
Unified Community Hub page at /community replacing both the old Community.tsx and
the /people nav entry. Modular rearrangeable sections (Groups, Events, Feed, Friends,
Discover) using Reorder.Group with localStorage persistence. Glass surface design,
paw-pattern hero header, multi-action FAB. Post reactions (paw/bone/heart) added to
GroupPost type and CommunityContext via arrayUnion/arrayRemove.

**New files:**
- `app/src/pages/CommunityHub.tsx`
- `app/src/components/community/GroupsSection.tsx`
- `app/src/components/community/PeopleSection.tsx`
- `app/src/components/community/EventsSection.tsx`
- `app/src/components/community/FeedSection.tsx`
- `app/src/components/community/DiscoverSection.tsx`
- `app/src/components/community/CommunityFAB.tsx`

**Modified:**
- `app/src/contexts/CommunityContext.tsx` (reactions field + reactToPost)
- `app/src/App.tsx` (routing — /community → CommunityHub)
- `app/src/components/Layout.tsx` (nav — renamed to "Community Hub", removed People nav item)
- `app/src/pages/Community.tsx` (replaced with redirect to /community)

**Known gap — NOT included in this task:**
- `firestore.rules` not updated: reactions writes (`reactions.paw/bone/heart` arrayUnion)
  will be blocked by Firestore security rules in production. Needs a follow-up rule:
  `allow update: if request.auth != null && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['reactions']);`

**Verification:**
- cd app && npm run build ✓ (exit 0, 4.85s, 2233 modules, CommunityHub-*.js lazy chunk present)
- No new TypeScript errors in new files (pre-existing Dashboard.tsx layout errors unrelated)

---

## Done

### [TASK-21] UI Fix — Remove Duplicate Medical Notes on Multi-Card
Status: done
Completed: 2026-03-09
Description: Consolidated 'Diet or Medical Notes' into 'Health & Diet' section.
Removed redundant 'Medical Notes' section from multi-pet cards.
