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

### Phase 15: Quick Wins & Polish
Tags: ui, ux, polish, animations
Status: in-progress

- [x] **[TASK-42]** Pet Birthday confetti/party UI — Dashboard confetti banner + PetCard birthday badges already existed; added `'birthday'`/`'vaccine'`/`'medication'` to AppNotification type union + NotificationDropdown icon/bg/nav handlers *(fun #2)*
- [x] **[TASK-43]** Personality-driven empty states — upgraded EmptyState.tsx with circular icon container, motion entrance animation, improved CTA button styling, accessibility (focus ring, min-h touch target) *(fun #10)*
- [x] **[TASK-44]** Remove dark/light mode toggle from ProfileSettings and GettingStartedGuide — already absent; toggle only in Layout sidebar (correct) *(inline #36)*
- [x] **[TASK-45]** Personalized welcome greeting — Dashboard shows pet name when user has 1 pet ("Here's what's happening with Buddy today") *(fun #41)*
- [x] **[TASK-46]** Swipe-to-dismiss notifications — already implemented with Framer Motion drag="x", -120px dismiss threshold *(inline #7)*
- [x] **[TASK-47]** Card full-screen QR overlay — QrOverlay.tsx with 240px QR, level="H", pet name/breed, expiry, Escape dismiss; wired via expand button in CardTile *(fun #48)*
- [x] **[TASK-48]** Confetti & celebration animations — Confetti.tsx (30 particles, 6 colors, useReducedMotion); useCelebration hook with localStorage dedup; wired to Dashboard onboarding-complete + Cards first-card-created *(fun #36)*
- [x] **[TASK-49]** Keyboard shortcuts — KeyboardShortcuts.tsx with `?` help modal, `g+h/p/c/m/k/s` navigation chords, input-aware suppression; ShortcutsHelpModal; wired in Layout.tsx *(fun #49)*

---

### Phase 16: Messaging & Social Enrichment
Tags: messaging, social, ux
Status: done

- [x] **[TASK-50]** Pin conversations in DMs — `pinnedConversations[]` on UserProfile; sorted pinned-first in MessagingContext; Pin icon + hover button in ConversationRow *(fun #38)*
- [x] **[TASK-51]** Service tip upvoting — extended Tip type with `upvotes`/`upvoters`; upvote button per tip; sorted by votes; one-vote-per-user *(fun #39)*
- [x] **[TASK-52]** Group welcome bot post — `isSystemPost` flag on GroupPost; `welcomePostEnabled` on CommunityGroup; auto-creates system post on joinGroup *(fun #43)*
- [x] **[TASK-53]** Swipe gestures on mobile — CSS scroll-snap carousel on Pets page (`snap-x snap-mandatory`); horizontal swipe between pet cards on mobile, grid on desktop *(fun #37)*
- [x] **[TASK-54]** Pet status quick updates — `ephemeralStatus`/`ephemeralStatusExpiresAt` on Pet type; quick-set menu (6 preset statuses) via Zap button on PetCard; violet status pill display; 24h auto-expiry *(fun #40)*
- [x] **[TASK-55]** Voice messages in DMs — VoiceMemo.tsx (MediaRecorder API, 60s limit, webm); `uploadMessageAudio` in storageService; Mic button in compose bar; audio player in MessageBubble; `mediaType: 'audio'` on DmMessage *(fun #44)*

---

### Phase 17: API Cost & Infrastructure Hardening
Tags: api, infrastructure, security, cost
Status: done

- [x] **[TASK-56]** Yelp cross-ZIP dedup via H3 — client-side cache key now uses H3 cell (res 7) via `zipCodeToH3`/`latLngToH3` instead of raw filter JSON; nearby ZIPs share cache *(inline #21)*
- [x] **[TASK-57]** Google Places batch pre-fetch — `prefetchTopPlaceDetails()` fires background requests for top 3 results after search; server-side caches for subsequent hits *(inline #22)*
- [x] **[TASK-58]** Per-user rate limiter on findServices — already existed: `apiUsage/yelp/perUser/{uid}/{today}` counter, 5/day limit *(inline #23)*
- [x] **[TASK-59]** Scheduled Yelp cache warming — already existed: `warmYelpCache` Cloud Function runs daily 02:00 UTC, processes up to 10 targets from `serviceCache/warmingTargets` *(inline #25)*
- [x] **[TASK-60]** Dashboard widget rename — already existed: `widgetLabels` state + localStorage + rename UI in Edit Layout mode *(inline #27)*
- [x] **[TASK-61]** Apple Sign-In — `OAuthProvider('apple.com')` added to firebase.ts; `handleAppleAuth()` + Apple button in Auth.tsx *(fun #18)*

---

### Phase 18: Health & Data Visualization
Tags: health, charts, data, visualization
Status: done

- [x] **[TASK-62]** Weight & health trend charts — `WeightTrendChart.tsx` using recharts (LineChart, responsive); shows weight history + current weight; wired into PetHealthPanel; `weightHistory` array added to Pet type *(fun #15)*
- [x] **[TASK-63]** Expense analytics charts — `ExpenseChart.tsx` using recharts (BarChart); 6-month rolling monthly spending; wired into Dashboard expenses widget *(fun #16)*
- [x] **[TASK-64]** Pet daily journal / mood log — `MoodLog.tsx` with 5 moods, 1-5 energy, notes; `moodLog` array on Pet type (90-day rolling); wired into PetActivitiesPanel; 7-day recent history display *(fun #22)*
- [x] **[TASK-65]** Streak system — `streaks.ts` utility (idb-keyval); `recordHealthActivity`/`getStreakData`; `streak_counter` Dashboard widget with current + longest streak display *(fun #23)*
- [x] **[TASK-66]** Lost pet neighborhood broadcast — `onPetLostStatusChange` Firestore trigger on `users/{uid}/pets/{petId}`; queries users by ZIP + lostPetOptOut; creates `lost_pet` notification type; Megaphone icon in NotificationDropdown *(fun #17)*

---

### Phase 19: Social & Discovery
Tags: social, discovery, community
Status: done

- [x] **[TASK-67]** Playdate & walking buddy matching — `BuddyMatchSection.tsx` in CommunityHub; filters by publicStatus (Playdates/Walking); pet-type overlap scoring; friend connect button *(fun #13)*
- [x] **[TASK-68]** Achievement badge system — `badges.ts` with 10 badge definitions + eligibility checker; `badges`/`petFollows` on UserProfile type *(fun #14)*
- [x] **[TASK-69]** Personalized activity feed — FeedSection now boosts friend posts + engagement-weighted recency (reaction count × 1hr boost) *(fun #19)*
- [x] **[TASK-70]** Pet-level follows — `followers[]` on Pet type; `petFollows[]` on UserProfile; follower count on SharedCardPage header *(fun #20)*
- [x] **[TASK-71]** Better group discovery — 8 category filter chips (Dog/Cat/Bird/Rabbit/etc.) in DiscoverSection; combined with text search; dynamic heading *(fun #24)*
- [x] **[TASK-72]** Pet of the week vote — `PetOfTheWeek.tsx` with weekly reset, nomination flow, vote counting, trophy/medal ranking (top 5) *(fun #45)*

---

### Phase 20: Strategic Features
Tags: strategic, platform, ai
Status: intake

- [ ] **[TASK-73]** Interactive onboarding tutorial — tooltip-based contextual tour replacing static checklist *(fun #21)*
- [ ] **[TASK-74]** Stories: ephemeral 24h pet updates — circular story rings on pet cards, quick photo+caption, 24h TTL *(fun #26)*
- [ ] **[TASK-75]** AI pet health insights — Claude API analysis of logged health data with proactive suggestions *(fun #27)*
- [ ] **[TASK-76]** Shareable pet profile image card — 1080x1080 shareable image (name, breed, photo, stats) for Instagram/Twitter *(fun #29)*
- [ ] **[TASK-77]** Playdate coordination & scheduling — invite flow, time/location picker, RSVP, calendar integration, reminders *(fun #32)*
- [ ] **[TASK-78]** Household expense split tracking — mark expenses as shared, split between members, running balance *(fun #42)*

---

### Phase 21: Platform & Marketplace
Tags: platform, marketplace, analytics
Status: intake

- [ ] **[TASK-79]** Photo challenges & community contests — weekly themed challenges in groups, vote with reactions, winner banner *(fun #28)*
- [ ] **[TASK-80]** Full-text search across app — Algolia or compound queries for users, pets, groups, posts; global search bar *(fun #30)*
- [ ] **[TASK-81]** Pet milestone auto-posts — auto-create feed posts for birthdays, anniversaries, health milestones; user approves before posting *(fun #31)*
- [ ] **[TASK-82]** Group analytics dashboard — post engagement, member growth, most active members, peak activity hours *(fun #33)*
- [ ] **[TASK-83]** Pet care task sharing in household — assign pet care tasks (walk, feed, meds) to members, Dashboard reminders *(fun #34)*
- [ ] **[TASK-84]** Vet review & rating system — rate clinic after vet visit (1-5 stars + note), aggregate ratings in service discovery *(fun #35)*
- [ ] **[TASK-85]** Rescue/adoption marketplace — adoption listings in Community, photos/description/contact, shelter integration *(fun #50)*

---

## Done

### [TASK-39] Cards & QR Deep Audit + Improvement Plan
Tags: cards, qr, audit, feature, ui
Status: done

**Description:**
QR codes are confirmed working in the app. This task produced a written audit of the
QR/cards system before any implementation changes. Report delivered 2026-03-15.

**Acceptance Criteria:**
- [x] Written audit report delivered and approved before any code changes

**Verification:**
- Audit agent completed read-only analysis (2026-03-15) — see report below

---

#### TASK-39 Audit Report — Cards & QR System
**Date:** 2026-03-15 | **Analyst:** Explore agent (read-only)

**1. QR Library:** `qrcode.react` v4.2.0 (`QRCodeCanvas` aliased as `QRCode`)

**2. QR Generation:** Single render point at `CardTile.tsx:124-129`. Value = `${window.location.origin}/cards/view/{cardId}`. Size 120px, error correction "M". Toggle-visible only when card is selected + active + QR toggled on.

**3. URL Construction:** Pattern `/cards/view/{cardId}` (UUID from `crypto.randomUUID()`). Share button in CardTile uses `navigator.share()` with clipboard fallback. Route: `App.tsx:91`.

**4. Firestore Lifecycle (`publicCards/{cardId}`):**
- Create: `savePublicCard()` on card creation — `Cards.tsx:184-205`
- Active: QR visible; URL resolves to SharedCardPage
- Update: `savePublicCard()` re-syncs petSnapshot — `Cards.tsx:258-265`
- Revoke: status → `'revoked'` + `revokedAt` timestamp — `Cards.tsx:233`
- Undo window: 5 min; after expiry `deletePublicCard()` removes doc — `Cards.tsx:235`
- Expiry: client-side check via `expiresAt`; SharedCardPage shows "Card Not Found"
- Old revoked purge: >30 days → deleted on Cards page load — `Cards.tsx:86-88`
- Security rules: unauthenticated read; owner-only write/delete — `firestore.rules:52-60`

**5. Identified Gaps:**

| # | Gap | Severity |
|---|-----|----------|
| G1 | QR only in CardTile sidebar, not in main CardPreview pane | Medium |
| G2 | QR not printable — no print-media QR context | Medium |
| G3 | No Firestore TTL; expired docs accumulate until page load | Low-Med |
| G4 | Revoked cards show generic "Card Not Found" — no revoke context | Low-Med |
| G5 | petSnapshot staleness not communicated to user | Low-Med |
| G6 | No tooltip explaining why QR button disappears on expired/revoked cards | Low |
| G7 | No rate limiting on SharedCardPage (UUID entropy mitigates brute-force) | Low |

**6. Recommended Implementation Order:**
1. **(P1)** Add QR display to `CardPreview.tsx` (and multi/all-pet previews) — move QR to main pane
2. **(P2)** Print-friendly QR: "Print Card" button + `@media print` QR visible at ≥200px
3. **(P3)** Firestore TTL policy on `publicCards.expiresAt` (Firebase Console, no code change)
4. **(P4)** Tooltip on disabled QR button: "QR unavailable — card is revoked/expired"
5. **(P5)** SharedCardPage: show "This card was revoked" vs. "Card not found" distinction
6. **(P6)** CardPreview: "Last updated [date]" + help text for petSnapshot freshness

**Files affected (future work):** `CardPreview.tsx`, `MultiPetCardPreview.tsx`, `AllPetsCardPreview.tsx`, `CardTile.tsx`, `SharedCardPage.tsx`; `firestore.rules` (TTL comment)

---

### [TASK-41] Tech Debt — TypeScript Strict Mode
Tags: typescript, tech-debt
Status: done

**Description:**
Phase 11 audit reported 3,700+ errors; actual baseline (2026-03-15) was **53 errors**.
All 53 resolved in one session. Key fixes: `react-grid-layout` v2 API migration
(`cols`/`rowHeight`/`margin` → `gridConfig`; `isDraggable`/`draggableHandle` → `dragConfig`;
`isResizable`/`resizeHandles` → `resizeConfig`), `DashboardLayoutItem` export, `CommunityRole`
union fix (`'Member'` → `'User'`), `AlbumDetailModal` PhotoEntry/string guard,
`firestoreService` updateDoc spread fix, and 8 other files.

**Acceptance Criteria:**
- [x] All 53 strict errors resolved
- [x] `npx tsc --noEmit --strict --project app/tsconfig.json` exits 0
- [x] `cd app && npm run build` still passes after changes

**Verification:**
- npx tsc --noEmit --strict --project app/tsconfig.json ✓ (0 errors, 2026-03-15)
- cd app && npm run build ✓ (exit 0, 6.24s, 2026-03-15)
- firebase deploy --only hosting ✓ (2026-03-15)

---

### [TASK-40] Cleanup — Delete Dead brainfileSync.ts
Tags: cleanup, functions
Status: done

**Description:**
Verified `functions/src/brainfileSync.ts` is absent from the main branch — the file
was never present here (only existed in the `ui-ux-polish` worktree). No deletion needed.

**Acceptance Criteria:**
- [x] `functions/src/brainfileSync.ts` not present in main branch
- [x] No imports or references to this file found

**Verification:**
- Glob search: no matches in `C:\Admin\Projects\PetBase\functions` ✓ (2026-03-15)

---

### [TASK-38] Deploy — Firestore Reactions Rule for TASK-37
Tags: firebase, security, community
Status: done

**Description:**
The reactions `affectedKeys().hasOnly(['reactions'])` rule was already present in
`firestore.rules` (posts, comments, event posts subcollections). Deployed to production.

**Acceptance Criteria:**
- [x] `firebase deploy --only firestore:rules` runs clean
- [ ] Reactions write succeeds in production for authenticated users (manual verify)

**Verification:**
- firebase deploy --only firestore:rules ✓ (2026-03-15, rules already current)

---

### [TASK-37] Redesign Phase 4 — Community Hub
Tags: ui, ux, community, people, redesign
Contracts: unified-ui-design
Skills: ui-review
Status: done

**Description:**
Unified Community Hub page at /community replacing both the old Community.tsx and
the /people nav entry. Modular rearrangeable sections (Groups, Events, Feed, Friends,
Discover) using Reorder.Group with localStorage persistence. Glass surface design,
paw-pattern hero header, multi-action FAB. Post reactions (paw/bone/heart) added to
GroupPost type and CommunityContext via arrayUnion/arrayRemove.
Also fixed: mobile bottom nav "/" label changed from "Home" → "Dashboard" (Layout.tsx:309).

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
- `app/src/components/Layout.tsx` (nav — renamed to "Community Hub", removed People nav item; "/" label → "Dashboard")
- `app/src/pages/Community.tsx` (replaced with redirect to /community)

**Verification:**
- cd app && npm run build ✓ (exit 0, 5.20s, 2026-03-15)
- firebase deploy --only hosting ✓ (2026-03-15)

---

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
- [x] Users can create, join, and leave groups
- [x] Role model (admin, moderator, member) enforced in Firestore rules
- [x] Group admins can configure message retention period
- [x] Event scheduling: create events with date/time, visible to members
- [x] Pencil design spec completed before any code written
- [x] Group pages adapt to mobile (bottom-sheet modals, swipe gestures)

**Verification:**
- cd app && npm run build ✓ (2026-03-14, exit 0)
- cd functions && npm run build ✓ (2026-03-14, exit 0)
- /privacy-check: PASS (2026-03-14)
- /ui-review: PASS (2026-03-14)

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

### [TASK-33] Feature — Messaging Platform (DMs)
Tags: messaging, dm, retention, ui, firebase, feature
Contracts: unified-ui-design, firebase-governance, privacy-contract
Skills: ui-review, privacy-check
Status: done

**Description:**
Text-only direct messaging platform with 365-day retention, per-user soft-delete,
block behavior, multi-message selection, and Firestore security rules.

**Acceptance Criteria:**
- [x] Users can send and receive text DMs
- [x] Messages older than 365 days are automatically deleted (Firestore TTL or scheduled function)
- [x] Block behavior: messages show "user blocked" label, remain deletable
- [x] Multi-select: bulk delete and mark-as-read
- [x] Firestore rules: users can only read/write their own message collections
- [x] No PII stored unencrypted in message metadata

**Verification:**
- cd app && npm run build ✓ (2026-03-14)
- cd functions && npm run build ✓ (2026-03-14)
- /privacy-check: PASS (2026-03-14)
- /ui-review: PASS (2026-03-14)

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

### [TASK-32] Feature — Public User Profile View
Tags: profile, public, ui, search, feature
Contracts: unified-ui-design, privacy-contract
Skills: ui-review, privacy-check
Status: done

**Description:**
Public-facing user profile view for user search selections. Shows display name, bio,
and public pets only. Includes owner's own view and visitor view via People/Search.

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

### [TASK-31] Feature — Household System and Management
Tags: household, permissions, ui, modal, firebase, feature
Contracts: unified-ui-design, firebase-governance, privacy-contract
Skills: ui-review, privacy-check
Status: done

**Description:**
Household creation/management flows, role and permissions model (owner, member),
supporting UI modals/pages. Members share visibility of pets per role model.

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

### [TASK-30] UI Cleanup — Remove Location Popup Modal
Tags: ui, modal, dashboard, profile, cleanup
Contracts: unified-ui-design
Skills: ui-review
Status: done

**Description:**
Removed location popup modal entirely — triggers on first dashboard load and on profile
save removed. All related UI/state logic and the component file deleted.

**Acceptance Criteria:**
- [x] No location modal appears on first dashboard load
- [x] No location modal appears after saving profile changes
- [x] `LocationPromptModal.tsx` is deleted and no dead imports remain
- [x] No console errors related to location modal

**Verification:**
- cd app && npm run build ✓ (2026-03-14, exit 0)

---

### [TASK-29] UI/UX — Mobile Bottom Navigation Feature Parity Update
Tags: ui, ux, mobile, feature
Contracts: unified-ui-design
Skills: ui-review
Status: done
> **SUPERSEDED**: Original spec (People + Find Services in bottom nav) was written before
> TASK-37 merged People into CommunityHub and redesigned the nav as Home/Pets/Community/Messages/Cards.
> Current nav structure is intentional. Minor remaining gap: "/" label says "Home" instead of "Dashboard" — fix bundled into TASK-37 deploy.

---

### [TASK-28] UI Fix — Prevent Mobile Sidebar Overlap with Bottom Navigation
Tags: ui, bug, ux, mobile
Contracts: unified-ui-design
Skills: ui-review
Status: done

**Description:**
Fixed: sidebar scroll container has `pb-16 md:pb-0` at `Layout.tsx:152`, preventing
profile nav item from being obscured by the fixed h-16 bottom navigation bar.

**Acceptance Criteria:**
- [x] All sidebar menu items are visible and tappable on mobile viewport (375px)
- [x] Profile nav item is not obscured by the bottom navigation bar
- [x] Sidebar scroll works correctly with the padding applied

**Verification:**
- Codebase verified: `Layout.tsx:152` — `pb-16 md:pb-0` ✓ (2026-03-15)

---

### [TASK-22] UI Fix — Correct Default Vet Card Template Initialization
Tags: ui, ux
Status: done

**Description:**
Vet Card defaults were verified already implemented in `CreateCardModal.tsx`:
`template='vet'`, `customDays=365`, `customHours=0`, `sharing=TEMPLATE_DEFAULTS.vet`
all initialize correctly on first render (lines 61-73). No second click required.
Fixed as part of Phase 4.5 card overhaul; task was incorrectly reopened.

**Acceptance Criteria:**
- [x] Clicking 'Create Card' with 'Vet Card' template selected immediately shows correct fields
- [x] No second-click required to apply defaults
- [x] Default expiration value is set correctly on first render

**Verification:**
- Codebase verified: `CreateCardModal.tsx:61-73` ✓ (2026-03-15)

---

### [TASK-27] Bug — Profile Picture Not Saving or Visible in Search
Tags: bug, ui, profile, security
Contracts: unified-ui-design, privacy-contract
Skills: ui-review, privacy-check
Status: done

**Description:**
Fixed: `ProfileSettings.tsx:252` saves `avatarUrl` via `updateContextProfile`.
`SocialContext.tsx:142` resolves avatar tokens in `searchUsers`. `People.tsx:138`
renders avatar images in search results.

**Acceptance Criteria:**
- [x] After saving profile picture, nav bar avatar updates without page reload
- [x] Profile picture is visible in People/search results for the user
- [x] Avatar still resolves via `tokenService.getAvatarUrl()` — no raw URLs exposed

**Verification:**
- Codebase verified: `ProfileSettings.tsx:252`, `SocialContext.tsx:142`, `People.tsx:138` ✓ (2026-03-15)

---

### [TASK-21] UI Fix — Remove Duplicate Medical Notes on Multi-Card
Status: done
Completed: 2026-03-09
Description: Consolidated 'Diet or Medical Notes' into 'Health & Diet' section.
Removed redundant 'Medical Notes' section from multi-pet cards.
