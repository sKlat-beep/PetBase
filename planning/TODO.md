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

- TASK-194: `intake` — Pet-Aware Orchestrator: extend tagMatcher.ts from 2-layer to full 5-layer (breed intelligence, medical augments, query composition, URL builder) (cosmic-percolating-lake)
- TASK-195: `intake` — SearchPreview + SearchHistory components — FrequentlyVisited exists, need SearchHistory persistence + SearchPreview query explanation (cosmic-percolating-lake)
- TASK-196: `intake` — Breed Intelligence Dictionary: breed→keyword maps, medical condition augments (cosmic-percolating-lake)
- TASK-197: `intake` — Verification modal: "Did [Service] accept [Pet]?" post-redirect (cosmic-percolating-lake)
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
