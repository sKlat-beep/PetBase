# Future Possibilities — Archived from Plan Gap Audit (2026-03-20)

Features identified in plan files but deferred. These are not active tasks.
Move items to `planning/TODO.md` when ready to implement.

---

## Monetization (zesty-hatching-shamir)
- Stripe integration, subscription tiers, Firebase entitlements
- Free-tier limits (pet count cap, photo count cap)
- Pro Worker profiles, Business verified profiles
- Sponsored/featured search placement
- Cosmetic purchases (avatar frames, card skins)

## Major Features
- Pet Safety Center Page — dedicated 3-col emergency/safety page (quiet-chasing-marble Task 2.7A)
- Stories — 24h ephemeral pet updates (reactive-crafting-mist #26)
- AI Pet Health Insights — Claude API integration for health recommendations (reactive-crafting-mist #27)
- Playdate Scheduling — full workflow beyond BuddyMatchSection (reactive-crafting-mist #32)
- Vet Review/Rating System — community-sourced provider ratings (reactive-crafting-mist #35)
- PDF Export of Pet Card (reactive-crafting-mist #25)
- Full-text Search via Algolia (foamy-conjuring-rocket #30)
- Pet Milestone Auto-Posts — automatic community posts for milestones (reactive-crafting-mist #31)
- Photo Challenges/Contests (reactive-crafting-mist #28 — components were intentionally deleted)
- Rescue/Adoption Marketplace completeness (reactive-crafting-mist #50)

## Pet Features
- Pet-level follows (reactive-crafting-mist #20)
- Pet photo albums Firestore subcollection schema with visibility (feature-expansion-plan Phase 2a)
- Pet profile per-field visibility UI in pet edit form (feature-expansion-plan Phase 2b)
- Pet status quick updates (reactive-crafting-mist #40)
- Shareable pet profile image card — Instagram-optimized 1080x1080 (foamy-conjuring-rocket #29)
- Pet care task sharing in household — multi-member assignment (reactive-crafting-mist #34)

## Household
- Parental controls enforcement at app level — routing guards (zippy-purring-goose F1-5)
- Extended Family vs Member role visual differentiation (zippy-purring-goose F2-3)
- Native share/deep link for invite codes via navigator.share() (zippy-purring-goose F4-1)
- Family Founder badge display rendering (zippy-purring-goose F4-4)
- Maximum household size limit (20) enforcement in Cloud Function (zippy-purring-goose F6-3)
- Household expense split tracking (reactive-crafting-mist #42)
- Integration tests for household security rules (zippy-purring-goose F6-4)

## UX / Polish
- Birthday picker show-on-demand pattern in PetFormModal (breezy-watching-fiddle Task 1)
- "Finish Profile" button modal close behavior on last tab (breezy-watching-fiddle Task 2)
- Widget visual hierarchy priority prop on CollapsiblePanelWidget (polymorphic-whistling-seahorse TASK-98)
- Blur stacking fix — backdrop-blur-xl to backdrop-blur-md where stacking (polymorphic-whistling-seahorse TASK-99)
- Structural fixes to HouseholdPetsPanel, OnboardingTour, CalendarModal, GroupsSection (polymorphic-whistling-seahorse TASK-102)
- system.md update with violet/rose semantic colors, z-index scale (polymorphic-whistling-seahorse TASK-103)
- Swipe gestures on mobile (reactive-crafting-mist #37)
- Emoji reaction hover tooltips (wobbly-plotting-squid)
- Pin conversations in DMs (foamy-conjuring-rocket #38)
- Cross-device sync password UI removal from ProfileSettings (lazy-wiggling-sunbeam)
- Reaction emoji contrast/size in FeedSection (atomic-wiggling-wave)

## Messaging
- Voice messages waveform playback quality (reactive-crafting-mist #44)
- FeedSection scrollbar fix with explicit height constraint (hazy-cooking-snowglobe Phase 7A)
- CommunityFAB React refs replacing document.getElementById (hazy-cooking-snowglobe Phase 8)
- Photo posts in groups — verify attachment support (reactive-crafting-mist #12)

## Cinematic Design Gaps
- Emergency Modal verification against Stitch spec (quiet-chasing-marble Task 2.7C)
- Family Invite Modal gradient hero header + premium benefits cards (quiet-chasing-marble Task 2.8)
- Per-theme font switching verification (quiet-chasing-marble)

## Security / Data Integrity
- Groups/events update/delete Firestore rule restricting to author/owner/mod (lexical-napping-boot P2-03)
- Public card revocation enforcement — revoked cards still readable (lexical-napping-boot P2-04)
- Legacy UserProfileData type alias removal from firestoreService.ts (lexical-napping-boot P3-03)
- getNearbyStores() no-op in storeApi.ts returns [] (lexical-napping-boot P3-04)
- Push notification service worker firebase-messaging-sw.js (steady-popping-melody)
- Email digest completeness — verify sendWeeklyDigest aggregation (steady-popping-melody)

## Verification Needed (may already work)
- Photo upload to Firebase Storage flow (reactive-crafting-mist #11)
- Achievement badge system completeness (reactive-crafting-mist #14)
- Lost pet H3 k-ring broadcast completeness (reactive-crafting-mist #17)
- GIF picker Tenor API integration (wobbly-plotting-squid)
- Vet Card template init fix — state initialization order (validated-finding-scott TASK-22)
- GettingStartedGuide new steps: add-friend, send-message, complete-pet-health (feature-expansion-plan Phase 3a)
- FeatureTip trickle cards in DashboardRightPanel (feature-expansion-plan Phase 3a)
