# Mobile UI Overhaul — Brainstorm

**Date:** 2026-03-21
**Status:** Decisions finalized, ready for planning

---

## What We're Building

A comprehensive mobile navigation and layout overhaul for PetBase. The current mobile UI has a redundant hamburger menu, buried settings access, a misleading FAB button, a broken sidebar overlay UX, and several page-level responsiveness issues. This pass fixes the entire mobile shell and the most critical page-level problems.

---

## Why This Approach

The mobile shell (`Layout.tsx`) has grown organically — the sidebar was built for desktop and then "overlaid" onto mobile without a proper mobile-first rethink. The result is two competing navigation systems (sidebar + bottom nav) and settings buried 3 taps deep. Rather than patching individual symptoms, this overhaul rethinks the entire mobile navigation hierarchy using standard mobile UX patterns.

---

## Current State (Problems)

### Navigation Shell (`app/src/components/Layout.tsx`)

| Problem | Location | Description |
|---------|----------|-------------|
| Redundant hamburger | Top header | Opens same sidebar as bottom nav "Menu" button |
| Settings buried 3 taps | Mobile-wide | Menu → sidebar open → tap profile at bottom → modal |
| Misleading FAB icon | Bottom nav center | `add` icon implies create, but navigates to /pets list |
| Sidebar no scrim/close | Mobile overlay | No backdrop, no click-outside-to-close, no scroll lock |
| `safe-area-inset-bottom` broken | Bottom nav | Not a valid Tailwind utility; iPhone home indicator obscures nav |
| "Menu" slot has no unique purpose | Bottom nav | With nav overhaul, sidebar becomes redundant on mobile |

### Page-Level Issues

| Page | File | Problem |
|------|------|---------|
| Messages compose bar | `app/src/pages/Messages.tsx:1211` | Keyboard obscures input on mobile — **critical** |
| Pets search bar | `app/src/pages/Pets.tsx:513` | Fixed `w-48` width; no mobile breakpoint |
| Settings color pickers | `app/src/pages/ProfileSettings.tsx:676` | `grid-cols-5` → ~64px cells, too small for touch targets |

---

## Key Decisions

### 1. Top Header: Profile Avatar Button (replaces hamburger)
- Replace the `menu` icon button in the top header with the user's avatar/initials button
- Tapping opens `UserSettingsModal` directly — eliminates 3-tap buried settings in one move
- Avatar serves dual purpose: personalization + settings entry point
- Notification bell and search icon remain in header

**New header:** `[🐾 PetBase logo] ... [🔍 Search] [🔔 Bell] [👤 Avatar]`

### 2. Center FAB: Quick-Add Action Sheet
- The center elevated FAB becomes a true "create" shortcut
- Tapping opens a bottom sheet with create actions:
  - Add Pet
  - Log Health Record
  - Add Expense
  - Log Vet Visit
- The `add` icon now accurately reflects the button's purpose

### 3. Bottom Nav 5th Slot: Messages + More
- Replace "Menu" with **Messages** (with unread notification badge)
- Add a slim **More ⋯** overflow button for secondary navigation

**New bottom nav:** `[Home] [Pets] [+FAB] [Messages🔔] [More⋯]`

### 4. More ⋯ Sheet: Secondary Navigation
- Tapping "More" opens a compact bottom sheet or popover with:
  - Find Services (`/search`)
  - People (`/people`)
- Clean overflow pattern — no more burying secondary pages in a full sidebar

### 5. Mobile Sidebar: Hidden on Mobile
- The sidebar overlay is removed entirely for `< md` screens
- All navigation is handled by: bottom nav + More sheet + header avatar
- Desktop/tablet sidebar (`md+`) remains unchanged
- Eliminates all overlay UX problems (scrim, scroll-lock, click-outside) by removal

### 6. Safe-Area Fix
- Add proper `env(safe-area-inset-bottom)` padding to the bottom nav
- Prevents iPhone home indicator from obscuring nav items

---

## Implementation Scope

### In Scope (this pass)

**Navigation shell (`Layout.tsx`):**
- Remove hamburger button from mobile header
- Add avatar button to mobile header (opens UserSettingsModal)
- Remove `isMobileMenuOpen` state and sidebar toggle logic for mobile
- Update bottom nav: Menu → Messages (with badge), add More ⋯ button
- Implement FAB quick-add action sheet (bottom sheet component)
- Implement More ⋯ popover/sheet (Find Services, People links)
- Fix `safe-area-inset-bottom` → proper CSS env() variable

**Page fixes:**
- `Messages.tsx` — Fix compose bar keyboard offset (add `dvh` or keyboard-aware padding)
- `Pets.tsx` — Fix search bar to `w-full sm:w-48 md:w-64`
- `ProfileSettings.tsx` — Fix color picker grid: replace `grid-cols-5` with `grid-cols-4` and ensure each cell is at minimum `44×44px` (iOS/Android touch target standard)

### Deferred (follow-up)
- Pets stat card 2-col grid cramped on sub-360px
- Community Hub section jump bar horizontal scroll UX
- ImageCropperModal mobile overflow (needs separate investigation)

---

## Architecture Notes

- `Layout.tsx` is a single 420-line file — all changes are within this file plus the 3 page files
- The sidebar is already `hidden` on mobile; removing the `isMobileMenuOpen` state and all toggle logic cleans it up
- The FAB action sheet is implemented as **inline state in Layout.tsx** (no new component) — a `fabOpen` boolean drives a fixed bottom sheet overlay
- The More ⋯ sheet is a **simple absolute-positioned popover** anchored above the More button — no shared bottom sheet component needed
- Messages badge: unread count is already available via `MessagingContext`; wire it to the new bottom nav slot the same way `NotificationBell` uses its context

---

## Open Questions

_None — all major decisions resolved during brainstorm session._

---

## Files to Modify

| File | Change Type |
|------|-------------|
| `app/src/components/Layout.tsx` | Major refactor — nav overhaul |
| `app/src/pages/Messages.tsx` | Bug fix — keyboard compose bar |
| `app/src/pages/Pets.tsx` | Minor fix — search bar width |
| `app/src/pages/ProfileSettings.tsx` | Minor fix — color picker grid |
