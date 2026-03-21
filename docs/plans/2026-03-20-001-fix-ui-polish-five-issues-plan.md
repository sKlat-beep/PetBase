---
title: UI Polish — Five Bug Fixes (Progress Bar, Panel Scroll, Badge Redesign, Edit Modal Buttons, Lost Modal Z-index)
type: fix
status: active
date: 2026-03-20
---

# UI Polish — Five Bug Fixes

Five targeted fixes identified from visual review. Each is independently scoped.

---

## Issue 1 — Progress Bar Not Updating

**File:** `app/src/components/GettingStartedGuide.tsx:99`
**Hook:** `app/src/hooks/useOnboarding.ts`

### Root Cause

`progressPercent` is derived from `ob.completedCount / TOTAL_STEPS * 100`.
`TOTAL_STEPS = 10` (all steps in `onboardingSteps.ts`).

The bar visually appears near-full even when milestone copy says "Halfway there!", indicating `completedCount` includes **skipped** steps in its count. Skipping a step via the `×` dismissal marks it via `markStepSkipped()`, which may also increment `completedCount`. The progress bar should only reflect genuinely **completed** steps (checked, not skipped).

### Fix

In `useOnboarding.ts`, verify `completedCount` is computed as:
```ts
completedCount = state.steps.filter(s => s.status === 'completed').length
// NOT: s.status === 'completed' || s.status === 'skipped'
```

If skipped steps are being counted, separate the two counts:
- `completedCount` → completed only (drives the progress bar)
- `doneCount` → completed + skipped (drives `allComplete` check so guide dismisses once all are handled)

In `GettingStartedGuide.tsx`, update `allComplete`:
```ts
const allComplete = doneCount === TOTAL_STEPS;
```

### Acceptance Criteria

- [ ] Progress bar width reflects only non-skipped completed steps
- [ ] Dismissing a step (skip) does not advance the bar
- [ ] Bar animates to 100% only when all steps are marked ✓ completed
- [ ] Milestone copy ("Halfway there!", etc.) remains in sync with bar

---

## Issue 2 — Right Panel Items Cut Off at Small Viewports

**File:** `app/src/components/layout/RightPanel.tsx:3`
**Dashboard variant:** `app/src/components/dashboard/DashboardRightPanel.tsx`

### Root Cause

Both the `<aside>` and inner content `<div>` carry `overflow-y-auto`, creating a dual-scroll situation. When multiple sections (Calendar, Pet of the Day, Safety Alerts, Quick Actions) are simultaneously expanded, the content overflows but items get clipped due to competing height constraints.

### Fix

Collapse to a single scroll container on the `<aside>`. Remove the "SHORTCUTS" header entirely — each section already has its own title so the header is redundant. Add `scrollbar-hide` to suppress the native scrollbar.

```tsx
// RightPanel.tsx — before
<aside className="hidden xl:flex xl:flex-col w-[380px] shrink-0 min-w-0
  h-screen sticky top-0 overflow-y-auto
  border-l border-outline-variant/30 bg-surface glass-morphism">
  <div className="px-5 py-4 border-b ...">SHORTCUTS</div>   {/* ← DELETE */}
  <div className="flex-1 p-4 flex flex-col gap-4 overflow-y-auto">
    {content}
  </div>
  <div className="px-5 py-3 border-t ...">System online</div>
</aside>

// RightPanel.tsx — after
<aside className="hidden xl:flex xl:flex-col w-[380px] shrink-0 min-w-0
  h-screen sticky top-0 overflow-y-auto scrollbar-hide
  border-l border-outline-variant/30 bg-surface glass-morphism">
  {/* Header REMOVED */}
  <div className="flex-1 p-4 flex flex-col gap-4">   {/* overflow-y-auto REMOVED from here */}
    {content}
  </div>
  <div className="px-5 py-3 border-t ...">System online</div>
</aside>
```

Add `scrollbar-hide` utility to global CSS if not present:
```css
.scrollbar-hide { scrollbar-width: none; }
.scrollbar-hide::-webkit-scrollbar { display: none; }
```

### Acceptance Criteria

- [ ] "SHORTCUTS" header removed from `RightPanel.tsx`
- [ ] Panel scrolls vertically when content exceeds viewport height
- [ ] No visible scrollbar at any time
- [ ] Footer ("System online") scrolls away naturally — not pinned
- [ ] Works correctly with all sections expanded simultaneously

---

## Issue 3 — PointsBadge Redesign: Tier Crest + XP Ring

**Files:**
- `app/src/components/gamification/PointsBadge.tsx`
- `app/src/components/Layout.tsx` (sidebar user section)
- `app/src/types/profile.ts` (or wherever `UserProfile` is typed)
- `app/src/lib/firestoreService.ts` (read/write `gamificationPrefs`)
- `app/src/pages/Settings.tsx` (or profile settings section)

### Design

Replace the current generic `military_tech` pill with two combined elements:

**A — Tier Crest Badge** (placed below the display name, not inline):

| Level | Tier | Icon | Color |
|---|---|---|---|
| 1–2 | Puppy | `pets` | Muted coral |
| 3–4 | Explorer | `explore` | Amber |
| 5–6 | Guardian | `shield` | Teal |
| 7–8 | Champion | `military_tech` | Gold |
| 9–10 | Legend | `workspace_premium` | Purple gradient |

Three badge styles: `minimal` (tier label text only) / `crest` (icon + label) / `glow` (icon + label + pulsing outer glow via CSS `box-shadow` animation).

**B — XP Ring on Avatar**:

A `conic-gradient` ring wrapping the sidebar avatar that fills clockwise based on % progress to next level. A small floating level number sits at the bottom-right corner of the avatar.

Ring animation options: `static` / `pulse` (subtle breathe effect every 4s) / `shimmer` (animated gradient sweep).

### Public Crest Feature

When `publicCrest: true`, the user's spirit icon is overlaid as a small badge on their avatar photo wherever it appears for **other users** — community member lists, message threads, profile cards. This is opt-in only. Denormalize the necessary display fields onto the public profile document so other users' avatars can render the icon without a separate Firestore fetch:

```ts
// Fields written to public profile doc on save:
profile.publicCrestEnabled: boolean
profile.publicSpiritIcon: string       // material symbol name
profile.publicTierColor: string        // hex for the user's current tier
```

### Firestore Data Model

Add `gamificationPrefs` to the `UserProfile` type:

```ts
interface GamificationPrefs {
  // Tier Crest
  showCrest: boolean;                         // default: true
  badgeStyle: 'minimal' | 'crest' | 'glow';  // default: 'crest'
  spiritIcon: string;                         // material symbol, default: 'pets'
  showPointCount: boolean;                    // default: true
  publicCrest: boolean;                       // default: false — show crest on public avatar

  // XP Ring
  showXpRing: boolean;                        // default: true
  ringColor: 'theme' | 'tier' | string;       // 'theme', 'tier', or hex; default: 'tier'
  ringAnimation: 'static' | 'pulse' | 'shimmer'; // default: 'pulse'
  showLevelNumber: boolean;                   // floating dot on avatar; default: true

  // Celebrations
  celebrateMilestones: boolean;               // confetti on level-up; default: true
}
```

Stored at `users/{uid}` → `gamificationPrefs` sub-field. Read via `useAuth()` profile. Write via a new `updateGamificationPrefs(uid, prefs)` in `firestoreService.ts`.

### Spirit Icon Picker Options

Available icons (all `material-symbols-outlined`):

| Symbol | Label |
|---|---|
| `pets` | Paw |
| `star` | Star |
| `bolt` | Bolt |
| `shield` | Shield |
| `emoji_events` | Trophy |
| `local_florist` | Flower |
| `local_fire_department` | Flame |
| `favorite` | Heart |
| `diamond` | Diamond |
| `gps_fixed` | Target |

Rendered as a small icon grid in Settings → Profile. Selected icon highlighted with `ring-2 ring-primary`.

### Ring Color Custom Palette

When `ringColor` is set to a custom value, offer 8 swatches:
Coral · Amber · Teal · Violet · Sky · Rose · Lime · White

### Settings UI Location

New collapsible section in `Settings.tsx` → **Profile** tab (or wherever avatar/display name settings live): **"Badge & XP Appearance"**. Contains:

| Control | Type |
|---|---|
| Show tier crest | Toggle |
| Badge style | 3-option segmented control (Minimal / Crest / Glow) |
| Spirit icon | Icon grid picker (10 options) |
| Show point count | Toggle |
| Show on my public profile | Toggle + explainer: "Your spirit icon appears on your avatar for other users" |
| Show XP ring | Toggle |
| Ring color | 3-option (Theme / Tier / Custom) + swatch picker if Custom |
| Ring animation | 3-option segmented (Static / Pulse / Shimmer) |
| Show level number | Toggle |
| Celebrate level-ups | Toggle |

### Component Changes

- `PointsBadge.tsx` — rewrite to accept `prefs: GamificationPrefs` and render Crest + ring separately via sub-components
- Create `app/src/components/gamification/XpRing.tsx` — the conic-gradient avatar wrapper
- Create `app/src/components/gamification/TierCrest.tsx` — the crest chip below name
- `Layout.tsx` — replace `<PointsBadge compact />` with `<TierCrest />` below name + wrap avatar with `<XpRing>`
- Anywhere other users' avatars are rendered (community, messages) — check `user.publicCrestEnabled` and overlay spirit icon if true

### Acceptance Criteria

- [ ] Tier crest renders below display name with correct icon + color per tier
- [ ] `glow` style animates a soft pulsing outer ring
- [ ] XP ring wraps avatar with correct fill % (progress to next level)
- [ ] Level number dot visible at avatar bottom-right when `showLevelNumber: true`
- [ ] All 8 prefs saved to Firestore and load correctly on page refresh + different device
- [ ] Spirit icon picker in Settings renders all 10 options; selected state is clear
- [ ] Public crest appears on this user's avatar in community member lists and message threads (for other users) when `publicCrest: true`
- [ ] `publicCrestEnabled`, `publicSpiritIcon`, `publicTierColor` denormalized on save
- [ ] `celebrateMilestones: false` suppresses confetti on level-up
- [ ] All defaults applied on first load if `gamificationPrefs` is absent from Firestore

---

## Issue 4 — Edit Pet Modal: Remove "Save Changes" Button

**File:** `app/src/components/PetFormModal.tsx` (~line 1291–1343)

### Root Cause

When `isDirty && isEditMode`, a third button ("Save Changes") animates in as a full-width row below the Cancel / Save & Continue row. Users see three buttons simultaneously, which is confusing.

### Fix

**Remove the Row 2 "Save Changes" button entirely.** Rename Row 1 buttons:

| Before | After |
|---|---|
| `Cancel` (first tab) | `Cancel & Close` |
| `Save & Continue →` (intermediate tabs) | unchanged |
| `Finish Profile` (last tab) | `Save` |

Delete the `AnimatePresence` block for Row 2 (~lines 1328–1343):

```tsx
// DELETE this entire block:
<AnimatePresence>
  {isDirty && isEditMode && (
    <motion.button ... onClick={() => handleSubmit('save')}>
      Save Changes
    </motion.button>
  )}
</AnimatePresence>
```

"Save & Continue" already calls `handleSubmit('save')` before advancing, so saving is preserved on all intermediate tabs. On the last tab, renaming "Finish Profile" → "Save" is semantically cleaner.

### Acceptance Criteria

- [ ] Edit pet modal shows exactly 2 buttons at all times
- [ ] First tab left button reads "Cancel & Close" and closes modal without saving
- [ ] Last tab right button reads "Save" and saves + closes
- [ ] Intermediate tabs still show "Save & Continue →" on the right
- [ ] No regression: saving works correctly on all tabs

---

## Issue 5 — Report Lost Modal Appears Behind Edit Pet Modal

**Files:**
- `app/src/components/PetFormModal.tsx` — `z-[60]`, root at line ~454
- `app/src/components/dashboard/LostPetReportModal.tsx` — `z-[100]`, root at line ~62

### Root Cause

Despite `LostPetReportModal` having `z-[100]` (higher than `z-[60]`), it appears **behind** the edit modal. This is a CSS stacking context trap: `PetFormModal` uses `fixed inset-0` with Framer Motion `transform` properties that create a new stacking context. Any child element — regardless of z-index — cannot escape that context and stack above sibling DOM elements outside it.

`LostPetReportModal` is rendered **inside** PetFormModal's DOM tree, trapping it within PetFormModal's stacking context.

### Fix

Render `LostPetReportModal` via a **React Portal** directly to `document.body`:

```tsx
// LostPetReportModal.tsx
import { createPortal } from 'react-dom';

export function LostPetReportModal({ ... }) {
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4
      bg-black/80 backdrop-blur-lg" role="dialog" aria-modal="true">
      {/* ...modal content unchanged... */}
    </div>,
    document.body
  );
}
```

### Acceptance Criteria

- [ ] Report Lost modal renders on top of Edit Pet modal
- [ ] Backdrop of Report Lost modal covers Edit Pet modal entirely
- [ ] Focus trap works correctly inside Report Lost modal
- [ ] Closing Report Lost modal returns focus to Edit Pet modal
- [ ] No visual regressions in other contexts where LostPetReportModal is used

---

## Implementation Order

1. **Issue 5** — Portal fix (isolated, zero risk) ✓
2. **Issue 4** — Remove Save Changes button, rename labels ✓
3. **Issue 2** — Remove Shortcuts header, single scroll container ✓
4. **Issue 1** — Progress bar: separate completedCount from doneCount ✓
5. **Issue 3** — Badge redesign (largest scope, save for last) ✓

## Files to Modify

| File | Change |
|---|---|
| `app/src/components/dashboard/LostPetReportModal.tsx` | Wrap in `createPortal` |
| `app/src/components/PetFormModal.tsx` | Remove Row 2 button, rename Cancel + Finish |
| `app/src/components/layout/RightPanel.tsx` | Remove SHORTCUTS header, single scroll, scrollbar-hide |
| `app/src/hooks/useOnboarding.ts` | Separate completedCount (completed only) from doneCount (completed + skipped) |
| `app/src/components/GettingStartedGuide.tsx` | Use doneCount for allComplete; completedCount for bar |
| `app/src/types/profile.ts` | Add `GamificationPrefs` interface + `gamificationPrefs` to `UserProfile` |
| `app/src/lib/firestoreService.ts` | Add `updateGamificationPrefs()`, denormalize public fields on save |
| `app/src/components/gamification/PointsBadge.tsx` | Rewrite or delete; split into TierCrest + XpRing |
| `app/src/components/gamification/TierCrest.tsx` | New — tier crest chip with Minimal/Crest/Glow styles |
| `app/src/components/gamification/XpRing.tsx` | New — conic-gradient avatar wrapper with level dot |
| `app/src/components/Layout.tsx` | Replace PointsBadge with TierCrest + XpRing |
| `app/src/pages/Settings.tsx` | Add "Badge & XP Appearance" collapsible section |
| `app/src/index.css` (or tailwind config) | Add `.scrollbar-hide` utility |

## Sources

- `app/src/components/GettingStartedGuide.tsx` — progress bar (lines 99, 165–175)
- `app/src/data/onboardingSteps.ts` — TOTAL_STEPS = 10
- `app/src/components/layout/RightPanel.tsx` — panel layout (lines 3–28)
- `app/src/components/PetFormModal.tsx` — footer buttons (~lines 1291–1343)
- `app/src/components/dashboard/LostPetReportModal.tsx` — z-[100] modal (line ~62)
- `app/src/components/gamification/PointsBadge.tsx` — current badge implementation
