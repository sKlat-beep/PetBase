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

## Phase 23 — Security & Cloud Functions Hardening

- TASK-93: `intake` — Add `request.auth` checks to `sendReport`, `getPlaceDetails`, `getPlaceReviews` Cloud Functions (lexical-napping-boot)
- TASK-94: `intake` — Add per-user rate limiting on `getPlaceDetails`/`getPlaceReviews` (Google Places cost risk) (lexical-napping-boot)
- TASK-95: `intake` — Add input validation on all Cloud Function parameters (serviceId, placeId, name, address, userEmail) (lexical-napping-boot)
- TASK-96: `intake` — Add `lat`/`lng` bounds checking in `findServices` (lexical-napping-boot)
- TASK-97: `intake` — Fix `groups/events` Firestore rule — any member can modify any event, should be creator/owner only (lexical-napping-boot)
- TASK-98: `intake` — Fix `publicCards` revocation not enforced server-side (lexical-napping-boot)
- TASK-99: `intake` — Fix Firestore rules for reactions writes (groovy-honking-kettle, TASK-37 gap)
- TASK-100: `intake` — Document or tighten pet read Firestore rule (`firestore.rules:32`) (lexical-napping-boot)
- TASK-101: `intake` — Create structured error handling + Slack webhook integration for Cloud Functions (federated-sprouting-nygaard)
- TASK-102: `intake` — Replace `console.error` with structured logger across all Cloud Functions (federated-sprouting-nygaard)
- TASK-103: `intake` — Session timeout after 30 days of inactivity (atomic-wiggling-wave)
- TASK-104: `intake` — Sign-in activity log in Settings > Security (atomic-wiggling-wave)

---

## Phase 24 — Family/Household Critical Fixes

- TASK-105: `intake` — Fix encrypted display names unreadable by non-owners in household (zippy-purring-goose F1-1)
- TASK-106: `intake` — Fix invite code query blocked by Firestore rules (zippy-purring-goose F1-2)
- TASK-107: `intake` — Fix leader departure — no ownership transfer on leave (zippy-purring-goose F1-3)
- TASK-108: `intake` — Enforce member permissions server-side (zippy-purring-goose F1-4)
- TASK-109: `intake` — Enforce parental controls server-side (zippy-purring-goose F1-5)
- TASK-110: `intake` — Add confirmation dialogs for destructive household actions (zippy-purring-goose F1-6)
- TASK-111: `intake` — Fix household name decryption for non-owners (zippy-purring-goose F2-1)
- TASK-112: `intake` — Add household rename capability (zippy-purring-goose F2-2)
- TASK-113: `intake` — Differentiate Extended Family role from Member (zippy-purring-goose F2-3)
- TASK-114: `intake` — Migrate PetCareTaskList from localStorage to Firestore (zippy-purring-goose F3-1)
- TASK-115: `intake` — Invite code expiration + max household size limit (zippy-purring-goose F6-2, F6-3)
- TASK-116: `intake` — Handle stale householdId after deletion (zippy-purring-goose F6-1)

---

## Phase 25 — Type Safety & Dead Code Cleanup

- TASK-117: `intake` — Fix GettingStartedGuide.tsx wrong field names (`avatarUrl`/`photoUrl` → `image`, `medicalRecords` → `medicalVisits`) (jazzy-greeting-yao)
- TASK-118: `intake` — Fix `onboardingService.ts` OnboardingState type assignability (jazzy-greeting-yao)
- TASK-119: `intake` — Fix GroupEventsPanel.tsx `userRole` type mismatch (zany-cooking-giraffe)
- TASK-120: `intake` — Fix MessagingContext.tsx `updateProfile` import from wrong module (zany-cooking-giraffe)
- TASK-121: `intake` — Replace `useAuth() as any` casts in ServiceDetailModal.tsx and Messages.tsx (lexical-napping-boot P2-01)
- TASK-122: `intake` — Remove `sendEmailDigest` no-op stub from notifications.ts (lexical-napping-boot)
- TASK-123: `intake` — Dead code sweep — delete unused exports, orphaned imports, console.logs in production code (lexical-napping-boot P3, zany-cooking-giraffe)
- TASK-124: `intake` — Delete placeholder components with zero imports (PlaydateScheduler, PhotoChallenge, PetOfTheWeek) (hazy-cooking-snowglobe)
- TASK-125: `intake` — TypeScript strict mode incremental migration (twinkling-zooming-book TASK-41)

---

## Phase 26 — Design System & Accessibility

- TASK-126: `intake` — Color palette normalization: blue/purple/indigo → sky, orange/teal → amber/emerald, remove hex constants (polymorphic-whistling-seahorse TASK-91-93)
- TASK-127: `intake` — Touch targets + focus rings audit: 13 buttons across ~10 files need min 44px (polymorphic-whistling-seahorse TASK-94)
- TASK-128: `intake` — Modal a11y sweep: 28 modals need `role="dialog"` + `aria-labelledby` (polymorphic-whistling-seahorse TASK-95, glimmering-sprouting-swing)
- TASK-129: `intake` — Eliminate sub-12px text: ~30 replacements across ~15 files (polymorphic-whistling-seahorse TASK-97)
- TASK-130: `intake` — Z-index normalization across 7 files + document in system.md (polymorphic-whistling-seahorse TASK-100)
- TASK-131: `intake` — Active/press states on interactive elements: ~15-20 files (polymorphic-whistling-seahorse TASK-101)
- TASK-132: `intake` — Blur stacking fix: backdrop-blur-xl → backdrop-blur-md (polymorphic-whistling-seahorse TASK-99)
- TASK-133: `intake` — Standardize dark-mode palette stone/zinc → neutral across ~40 components (glimmering-sprouting-swing)
- TASK-134: `intake` — Update index.css border/surface tokens (glimmering-sprouting-swing)

---

## Phase 27 — Messages & Community Enhancements

- TASK-135: `intake` — Reply-to-message feature: data model + context + UI (hazy-cooking-snowglobe)
- TASK-136: `intake` — Message editing with 15-min window (hazy-cooking-snowglobe)
- TASK-137: `intake` — Link previews via Cloud Function `ogService.ts` + client rendering + Firestore cache (hazy-cooking-snowglobe)
- TASK-138: `intake` — Emoji picker full rewrite: 8 categories, search, recents (hazy-cooking-snowglobe)
- TASK-139: `intake` — Read receipts UI — "Seen" indicator on DMs (steady-popping-melody)
- TASK-140: `intake` — Typing indicators via Firestore `_typing` subdocument (steady-popping-melody)
- TASK-141: `intake` — Message reactions (paw/bone/heart on DMs) (steady-popping-melody)
- TASK-142: `intake` — "Jump to latest" pill in DM threads (atomic-wiggling-wave, foamy-conjuring-rocket)
- TASK-143: `intake` — DM search within conversation thread (atomic-wiggling-wave, feature-expansion-plan)
- TASK-144: `intake` — Messages right panel redesign: discovery widgets, online contacts, friend request inbox (phase-a-plan)
- TASK-145: `intake` — Conversation request model: accept/decline banner for non-friends (phase-a-plan)
- TASK-146: `intake` — Handle `/messages?uid=` deep-link routing (phase-a-plan)
- TASK-147: `intake` — GroupHub final decomposition into 5 sub-components (~1,800 → ~150 lines) (hazy-cooking-snowglobe)
- TASK-148: `intake` — Community Hub unified page redesign: 5 modular sections, drag-reorder, FAB (ethereal-snacking-turtle)
- TASK-149: `intake` — CommunityFAB refactor + touch target audit (hazy-cooking-snowglobe)

---

## Phase 28 — Social Features & Moderation

- TASK-150: `intake` — @mentions in group posts and comments: MentionInput component + floating dropdown + notification (feature-expansion-plan)
- TASK-151: `intake` — Pinned posts in groups: pin/unpin for owner/mod, one-per-group banner (feature-expansion-plan)
- TASK-152: `intake` — Post threading: Facebook-style comments subcollection, 2-level nesting, reactions (steady-popping-melody)
- TASK-153: `intake` — Event discussion posts: attendee-only discussion section per event (steady-popping-melody)
- TASK-154: `intake` — Enhanced block system: cancel friend requests on block, filter messages/posts from blocked users (steady-popping-melody)
- TASK-155: `intake` — Group invite feature with disableGroupInvites privacy check (steady-popping-melody)
- TASK-156: `intake` — UserProfileModal: universal profile modal on avatar/name click (steady-popping-melody)
- TASK-157: `intake` — Report service + ReportModal + flagged content UI + ModerationPanel (steady-popping-melody)
- TASK-158: `intake` — Block list management UI in Settings (steady-popping-melody)
- TASK-159: `intake` — 3-year data retention TTL on DMs and event posts (steady-popping-melody)

---

## Phase 29 — Performance & Infrastructure

- TASK-160: `intake` — Virtualized lists with `@tanstack/react-virtual` for Feed, Messages, People (foamy-conjuring-rocket)
- TASK-161: `intake` — React.memo on PetCard and PostItem components (foamy-conjuring-rocket)
- TASK-162: `intake` — Replace sessionStorage service cache with IndexedDB via `idb-keyval` (foamy-conjuring-rocket)
- TASK-163: `intake` — PWA service worker configuration — verify `vite-plugin-pwa` (foamy-conjuring-rocket)
- TASK-164: `intake` — Bundle analyzer + route-level code splitting verification (foamy-conjuring-rocket)
- TASK-165: `intake` — Firestore pagination on group feed (limit/startAfter cursor) (foamy-conjuring-rocket)
- TASK-166: `intake` — Skeleton loading states for Feed, People, Services pages (atomic-wiggling-wave)
- TASK-167: `intake` — Google Places batch pre-fetch for top 3 results (foamy-conjuring-rocket)

---

## Phase 30 — Cinematic UI Page Rebuilds (Stitch)

- TASK-168: `intake` — Dashboard page rebuild from Stitch Bento Grid template (quiet-chasing-marble)
- TASK-169: `intake` — Login/Signup page rebuild from Stitch Auth layout (quiet-chasing-marble)
- TASK-170: `intake` — Onboarding Tour rebuild with SVG mask spotlight (quiet-chasing-marble)
- TASK-171: `intake` — Shared Pet Card page rebuild (quiet-chasing-marble)
- TASK-172: `intake` — Getting Started Guide rebuild from Stitch design (quiet-chasing-marble)
- TASK-173: `intake` — Profile Settings page rebuild with accordion sections (quiet-chasing-marble)
- TASK-174: `intake` — Modal gallery rebuild: Image Cropper, Feedback, Help/FAQ, Keyboard Shortcuts (quiet-chasing-marble)
- TASK-175: `intake` — Pet Management page rebuild (quiet-chasing-marble)
- TASK-176: `intake` — QR Code Sharing overlay rebuild (quiet-chasing-marble)
- TASK-177: `intake` — Emergency & Notifications Hub rebuild (quiet-chasing-marble)
- TASK-178: `intake` — Family Invite Modal rebuild (quiet-chasing-marble)
- TASK-179: `intake` — Medical Records Modal + Medical Dashboard rebuild (quiet-chasing-marble)
- TASK-180: `intake` — Create Pet Card Wizard: split-pane with live preview (quiet-chasing-marble)
- TASK-181: `intake` — Contextual Right Panel (Sidebar) rebuild (quiet-chasing-marble)
- TASK-182: `intake` — Pet Form Modal 4-tab stepper rebuild (quiet-chasing-marble)
- TASK-183: `intake` — Messaging Center 3-pane layout rebuild (quiet-chasing-marble)
- TASK-184: `intake` — People Hub rebuild (quiet-chasing-marble)
- TASK-185: `intake` — Pet Identity Cards Hub rebuild (quiet-chasing-marble)
- TASK-186: `intake` — Layout Shell (sidebar + top nav + bottom nav) rebuild (quiet-chasing-marble)

---

## Phase 31 — Pet Enhancements

- TASK-187: `intake` — Pet photo albums: Firestore subcollection, album management UI, lightbox, per-album visibility (feature-expansion-plan)
- TASK-188: `intake` — Pet profile public visibility field toggles (feature-expansion-plan)
- TASK-189: `intake` — Pet custom status tags: "Available for Playdates", etc. (atomic-wiggling-wave)
- TASK-190: `intake` — Pet age display in months/weeks for <1 year — create `petAge.ts` utility (atomic-wiggling-wave)
- TASK-191: `intake` — Pet daily journal / mood log (foamy-conjuring-rocket rec 22)
- TASK-192: `intake` — Pet birthday celebrations: confetti, card highlight, notification (foamy-conjuring-rocket rec 2)
- TASK-193: `intake` — Firebase Storage photo upload in PetFormModal.tsx (groovy-honking-kettle)

---

## Phase 32 — Service Discovery Frontend

- TASK-194: `intake` — Pet-Aware Orchestrator: 5-layer Yelp redirect URL builder from pet profile data (cosmic-percolating-lake)
- TASK-195: `intake` — OrchestratorPanel + SearchPreview + SearchHistory components (cosmic-percolating-lake)
- TASK-196: `intake` — Breed Intelligence Dictionary: breed→keyword maps, medical condition augments (cosmic-percolating-lake)
- TASK-197: `intake` — Verification modal: "Did [Service] accept [Pet]?" post-redirect (cosmic-percolating-lake)
- TASK-198: `intake` — ServiceDetailModal: full detail view with verified badge, bio, specialties (feature-expansion-plan)
- TASK-199: `intake` — ClaimModal: business claiming flow (feature-expansion-plan)
- TASK-200: `intake` — Global search modal (Cmd+K): cross-entity search for People, Groups, Services (feature-expansion-plan)

---

## Phase 33 — Onboarding & Gamification

- TASK-201: `intake` — Expand feature hints from 4→38 items across 10 categories (snappy-skipping-minsky)
- TASK-202: `intake` — Pet Parent Level gamification system: Curious Kitten → Pet Pro (snappy-skipping-minsky)
- TASK-203: `intake` — Milestone badges at 25/50/75/100% discovery + confetti (snappy-skipping-minsky)
- TASK-204: `intake` — "Did you know?" framing + "Surprise me" button + discovery counter (snappy-skipping-minsky)

---

## Phase 34 — Strategic Features & Polish

- TASK-205: `intake` — Vaccine/medication push reminders Cloud Function (daily schedule) (foamy-conjuring-rocket rec 1)
- TASK-206: `intake` — Post reaction/comment notifications via Firestore triggers (foamy-conjuring-rocket rec 3)
- TASK-207: `intake` — Email digest Cloud Function — complete implementation (foamy-conjuring-rocket rec 7)
- TASK-208: `intake` — Event reminder Cloud Function: hourly schedule, 24h-ahead notifications (feature-expansion-plan)
- TASK-209: `intake` — GIF picker via Tenor API in DMs (foamy-conjuring-rocket rec 6)
- TASK-210: `intake` — Trending posts tab in groups (foamy-conjuring-rocket rec 9)
- TASK-211: `intake` — Lost pet neighborhood broadcast via H3 k-ring push (foamy-conjuring-rocket rec 17)
- TASK-212: `intake` — Playdate/walking buddy matching via H3 proximity (foamy-conjuring-rocket rec 13)
- TASK-213: `intake` — Achievement badge system (foamy-conjuring-rocket rec 14)
- TASK-214: `intake` — PDF export of pet identity card (foamy-conjuring-rocket rec 25)
- TASK-215: `intake` — Character counter on group post (500) and DM compose (1000) (atomic-wiggling-wave)
- TASK-216: `intake` — Image lightbox swipe/arrow navigation for pet photos (atomic-wiggling-wave)
- TASK-217: `intake` — Notification sound toggle in Settings (atomic-wiggling-wave)
- TASK-218: `intake` — Custom group banner image upload for owners (atomic-wiggling-wave)
- TASK-219: `intake` — Pull-to-refresh gesture on Feed, Messages, People pages (atomic-wiggling-wave)
- TASK-220: `intake` — Emoji reaction hover tooltips: "Sarah, Mike and 3 others" (atomic-wiggling-wave)

---

## Phase 35 — Monetization (Future)

- TASK-221: `intake` — Monetization strategy: Stripe integration + Firebase entitlements + plan state (zesty-hatching-shamir)

---

## Tooling & Environment (Non-phase)

- TASK-222: `intake` — Fix Semgrep pysemgrep PATH on Windows (imperative-frolicking-unicorn)
- TASK-223: `intake` — Remove Stitch MCP server entry + STITCH_API_KEY from settings.local.json (linked-twirling-noodle)
- TASK-224: `intake` — Vet Card template init fix in CreateCardModal.tsx (twinkling-zooming-book TASK-22)
