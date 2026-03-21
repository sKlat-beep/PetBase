---
title: Remaining Phases Roadmap — Mobile UI Overhaul + Monetization
type: feat
status: active
date: 2026-03-21
origin: docs/brainstorms/2026-03-21-mobile-ui-overhaul-brainstorm.md
---

# Remaining Phases Roadmap — Mobile UI Overhaul + Monetization

## Overview

This plan consolidates all remaining open work into an ordered multi-phase execution roadmap.
As of 2026-03-21, the PetBase codebase is in excellent shape: 34+ phases complete, the pet cards
gallery redesign shipped (`a1d7fda`), and only two active items remain before the monetization phase.

**Phases in this plan:**

| Phase | Name | Effort | Source |
|-------|------|--------|--------|
| P0 | Housekeeping — commit & push to origin | Tiny | git status |
| P35 | Mobile UI Overhaul | Medium | brainstorm `2026-03-21-mobile-ui-overhaul-brainstorm.md` |
| P36 | Monetization — Stripe + Firebase Entitlements | Large | TASK-221 |

---

## Phase P0 — Housekeeping: Commit & Push

**Goal:** Land all loose untracked files on main/origin before starting new feature work.

### Current untracked files

| File/Dir | Action |
|----------|--------|
| `docs/brainstorms/2026-03-21-mobile-ui-overhaul-brainstorm.md` | Stage + commit |
| `docs/brainstorms/2026-03-21-pet-cards-redesign-brainstorm.md` | Stage + commit |
| `.claude/gotcha/events/` | Add to `.gitignore` (runtime state) |
| `.claude/hooks/__pycache__/` | Add to `.gitignore` (Python cache) |
| `firestore-debug.log` | Add to `.gitignore` |

### Steps

- [ ] Add `.gitignore` entries for `firestore-debug.log`, `.claude/gotcha/events/`, `**/__pycache__/`
- [ ] Stage brainstorm files: `git add docs/brainstorms/`
- [ ] Stage `.gitignore`
- [ ] Commit: `chore: add brainstorm docs and update gitignore`
- [ ] Push to origin: `git push origin main`

### Acceptance Criteria

- [ ] `git status` shows clean working tree
- [ ] `git log --oneline -1` shows the housekeeping commit on main
- [ ] `git push` succeeds — origin/main is up to date

---

## Phase P35 — Mobile UI Overhaul

**Source brainstorm:** `docs/brainstorms/2026-03-21-mobile-ui-overhaul-brainstorm.md`

All decisions finalized in the brainstorm. No questions remain.

### What We're Building

A full mobile navigation shell rethink. The current mobile UI has a redundant hamburger, buried
settings, a misleading FAB, a broken sidebar overlay, and page-level responsiveness gaps.
This phase fixes the entire mobile shell and three critical page-level issues.

### Key Decisions (from brainstorm)

1. **Header:** Replace hamburger button with user avatar button → opens `UserSettingsModal` directly
2. **FAB:** Becomes true "create" shortcut — opens action sheet: Add Pet, Log Health, Add Expense, Log Vet
3. **Bottom nav:** `[Home] [Pets] [+FAB] [Messages🔔] [More⋯]` — "Menu" slot replaced by Messages
4. **More ⋯ sheet:** Compact popover/sheet with Find Services + People links
5. **Sidebar:** Hidden entirely on mobile (`< md`) — desktop unchanged
6. **Safe-area fix:** `env(safe-area-inset-bottom)` on bottom nav

### Files to Modify

| File | Change |
|------|--------|
| `app/src/components/Layout.tsx` | Major — nav overhaul (≈420 lines) |
| `app/src/pages/Messages.tsx:1211` | Bug fix — compose bar keyboard offset |
| `app/src/pages/Pets.tsx:513` | Minor — search bar `w-full sm:w-48 md:w-64` |
| `app/src/pages/ProfileSettings.tsx:676` | Minor — color picker `grid-cols-5` → `grid-cols-4`, min 44px touch |

### Implementation Phases

#### P35.1 — Layout Shell (Layout.tsx)

- [ ] Remove hamburger icon button from mobile header (`< md`)
- [ ] Add user avatar/initials button to mobile header → `setShowSettings(true)` (UserSettingsModal)
- [ ] Remove `isMobileMenuOpen` state and all sidebar toggle logic for mobile
- [ ] Update bottom nav: rename Menu slot → Messages with unread badge
  - Wire unread count from `MessagingContext` (same pattern as `NotificationBell`)
  - Add routing: `navigate('/messages')`
- [ ] Add More ⋯ button to bottom nav (5th slot)
  - Simple absolute-positioned popover anchored above the button
  - Links: Find Services (`/search`) + People (`/people`)
  - `moreOpen` boolean state, click-outside to close
- [ ] FAB quick-add action sheet
  - `fabOpen` boolean state (inline — no new component)
  - Fixed bottom sheet overlay (above bottom nav)
  - Actions: Add Pet, Log Health Record, Add Expense, Log Vet Visit
  - Each dispatches to existing modal-open handlers
- [ ] Safe-area fix: replace invalid Tailwind `safe-area-inset-bottom` class with inline CSS `paddingBottom: 'env(safe-area-inset-bottom)'`
- [ ] Verify sidebar is fully `hidden` on mobile (md: visible)

#### P35.2 — Page Fixes

- [ ] **Messages.tsx** — Fix compose bar keyboard offset
  - Switch fixed-height layout to `dvh` (dynamic viewport height)
  - Add `env(keyboard-inset-height, 0px)` padding-bottom on compose container
  - Or: use `position: sticky` + `bottom: 0` on the compose bar inside a scrolling flex column
- [ ] **Pets.tsx** — Fix search bar width: change `w-48` → `w-full sm:w-48 md:w-64`
- [ ] **ProfileSettings.tsx** — Fix color picker grid: `grid-cols-5` → `grid-cols-4`, ensure cell min `44×44px`

#### P35.3 — Build & Commit

- [ ] `npm --prefix app run build` — must exit 0
- [ ] Manual smoke test: mobile viewport, nav items, FAB sheet, More sheet, Messages badge
- [ ] Commit: `feat(mobile): mobile navigation overhaul — avatar header, FAB action sheet, Messages + More nav`
- [ ] Push + PR to main

### Acceptance Criteria

- [ ] Hamburger button gone on mobile; avatar button opens settings
- [ ] Bottom nav: Home | Pets | FAB | Messages | More (5 slots)
- [ ] Messages slot shows unread badge count (same source as NotificationBell)
- [ ] FAB opens action sheet with 4 create actions
- [ ] More ⋯ opens popover with Find Services + People
- [ ] Sidebar is NOT visible on mobile (any viewport < md)
- [ ] iPhone home indicator not obscured by bottom nav
- [ ] Messages compose bar not obscured by keyboard
- [ ] Pets search bar is full-width on mobile
- [ ] Color picker cells are at least 44×44px on mobile
- [ ] Vite build passes (`npm --prefix app run build` exits 0)

### Deferred (out of scope this phase — from brainstorm)

- Pets stat card 2-col grid cramped on sub-360px
- Community Hub section jump bar horizontal scroll UX
- ImageCropperModal mobile overflow

---

## Phase P36 — Monetization (TASK-221)

**Source:** `planning/TODO.md` TASK-221

### What We're Building

Full monetization layer: Stripe payment processing, Firebase entitlements, and plan state management.
This enables PetBase to offer tiered plans (free vs. premium) with feature gating.

### High-Level Scope

#### P36.1 — Stripe Integration (Backend)

- [ ] Install Stripe SDK in `functions/`
- [ ] Cloud Function: `createCheckoutSession` — creates Stripe Checkout session for plan upgrade
- [ ] Cloud Function: `stripeWebhook` — handles `checkout.session.completed`, `customer.subscription.updated/deleted`
- [ ] Firestore collection: `users/{uid}/entitlements` — stores plan tier, expiry, Stripe subscription ID
- [ ] Stripe customer creation on first checkout (link `stripeCustomerId` to user doc)

#### P36.2 — Firebase Entitlements (Data Layer)

- [ ] Firestore security rules: `entitlements` readable by owner only
- [ ] Entitlement shape: `{ plan: 'free' | 'pro', validUntil: Timestamp | null, stripeSubscriptionId: string }`
- [ ] Cloud Function: `getUserEntitlement` — secure callable returning plan tier
- [ ] Frontend hook: `useEntitlement()` — subscribes to entitlement doc, exposes `isPro: boolean`

#### P36.3 — Plan State UI

- [ ] Settings page: "Upgrade to Pro" CTA card with feature comparison
- [ ] Plan badge in header/profile (Pro indicator)
- [ ] Feature gates: wrap premium features with `isPro` guard + upgrade prompt
- [ ] Subscription management: "Manage Subscription" link → Stripe Customer Portal

#### P36.4 — Test Mode Validation

- [ ] Stripe test mode end-to-end: checkout → webhook → entitlement update
- [ ] Manual test: upgrade, downgrade, webhook retry
- [ ] Firestore rules test for entitlement read isolation

### Acceptance Criteria

- [ ] User can initiate checkout and be redirected to Stripe
- [ ] Successful payment updates `users/{uid}/entitlements` within 10s (webhook latency)
- [ ] `useEntitlement()` returns correct `isPro` value across page reloads
- [ ] Premium features are gated behind `isPro` check with upgrade prompt
- [ ] Subscription cancellation downgrades plan on next billing cycle
- [ ] No Stripe keys in client-side code (backend only)

---

## System-Wide Impact

### Interaction Graph

- **P35 Layout.tsx changes:** Bottom nav renders for all authenticated routes. Changes affect every page load — no hidden callbacks, but full regression check required.
- **P35 FAB action sheet:** Dispatches to existing modal open handlers (`setShowPetModal`, `setShowExpenseModal`, etc.) — these already exist; no new state paths.
- **P36 Stripe webhook:** Fires after payment → writes to Firestore → `useEntitlement()` snapshot listener updates → UI re-renders. Two-layer async (Stripe → Firebase).

### Error & Failure Propagation

- **P35:** Layout failures are render-blocking (all pages affected). Test thoroughly before commit.
- **P36 webhook:** Stripe webhook delivery can fail/retry. Webhook handler must be idempotent (use `event.id` dedup in Firestore).

### State Lifecycle Risks

- **P35 `fabOpen` / `moreOpen`:** Two new boolean states in Layout. Must close on route change (add `useEffect` cleanup on `location.pathname`).
- **P36 entitlements:** Partial webhook failure can leave stale plan state. Add `updatedAt` timestamp; UI can show "checking plan status" if entitlement is stale.

---

## Execution Order

```
P0 (15 min)  →  P35.1 (2-3h)  →  P35.2 (30 min)  →  P35.3 (commit/PR)
                                                              ↓
                                                   P36 (separate session)
```

P36 is a separate session — it requires Stripe account setup, environment config, and webhook
endpoint registration before code can be written.

---

## Sources & References

### Origin Brainstorms
- **Mobile UI Overhaul:** [docs/brainstorms/2026-03-21-mobile-ui-overhaul-brainstorm.md](docs/brainstorms/2026-03-21-mobile-ui-overhaul-brainstorm.md)
  - Key decisions: avatar replaces hamburger, FAB action sheet, Messages + More nav, sidebar removed on mobile
- **Pet Cards (completed):** [docs/brainstorms/2026-03-21-pet-cards-redesign-brainstorm.md](docs/brainstorms/2026-03-21-pet-cards-redesign-brainstorm.md)
  - Implemented in commit `a1d7fda`

### Internal References
- Layout file: `app/src/components/Layout.tsx`
- Messages compose: `app/src/pages/Messages.tsx:1211`
- Pets search: `app/src/pages/Pets.tsx:513`
- Color pickers: `app/src/pages/ProfileSettings.tsx:676`
- MessagingContext (for unread badge): `app/src/contexts/MessagingContext.tsx`
- Task board: `planning/TODO.md` (TASK-221 — Monetization)

### Related Work
- Settings/Search cleanup PR: #6 (merged)
- Pet cards gallery: commit `a1d7fda`
- Gotcha system: plan `2026-03-21-002-feat-gotcha-system-integration-plan.md`
