---
title: "fix: Onboarding Checklist Overhaul + Modal Polish"
type: fix
status: completed
date: 2026-03-20
---

# fix: Onboarding Checklist Overhaul + Modal Polish

## Overview

A focused polish pass across two areas: (1) the Getting Started onboarding checklist — fixing the broken progress bar, replacing broken `/settings` links with working modal-open actions, redesigning steps to highlight the app's most impactful features, enabling skip-to-minimize behavior, and wiring up "Did You Know" post-completion hints; and (2) general UI cleanup — increasing glass-card modal opacity for readability, removing the "Live Beta" badge from the feedback modal, removing the non-functional avatar shape picker from ProfileSettings, converting toggle/switch settings to live-save, and fixing the profile save to correctly persist all fields.

---

## Problem Statement / Motivation

Several compounding issues degrade the new-user first-run experience and day-to-day usability:

- **Progress bar is broken visually** — Framer Motion uses `initial={{ width: 0 }}` which causes the bar to re-animate from zero on every mount/collapse-expand cycle, and the bar may simply not reflect real state.
- **Four checklist steps silently navigate to a blank screen** — `complete-profile`, `create-family`, `enable-notifications`, and `privacy-settings` all route to `/settings`, which has no registered route. `ProfileSettings` is rendered exclusively inside `UserSettingsModal` opened from the nav bar.
- **Current checklist steps don't showcase the app's best features** — steps like "Create or join a family" and "Control your privacy" are technical housekeeping tasks, not the memorable features (QR cards, communities, health records, messaging) that drive retention.
- **Skip hides the guide entirely** — users who skip prematurely lose all onboarding entry points. Minimizing to a collapsed header preserves the affordance.
- **Glass modal backgrounds are too transparent** — dark-mode `rgba(26, 26, 46, 0.4)` is difficult to read against busy backgrounds.
- **Profile settings don't reliably save** — `handleSaveProfile` has state initialization bugs (each accordion section initializes its own slice from the profile snapshot at mount, so cross-section writes clobber each other), and toggles require a separate manual Save per section.

---

## Proposed Solution

### Part A — Onboarding Checklist

1. **Fix the progress bar** — change Framer Motion `initial` from `{ width: 0 }` to `false` so the bar starts at the current computed value on mount/re-mount.
2. **Fix broken links** — introduce a `useSettingsModal` context (or a callback prop from Dashboard) so checklist steps can programmatically open `UserSettingsModal` and scroll to the relevant section. Remove the four `/settings` path steps; replace with modal-open actions.
3. **Redesign the 8 checklist steps** in `onboardingSteps.ts` to showcase the highest-retention features (see Acceptance Criteria).
4. **Skip → minimize** ✅ **Decided: collapse to header.** The dismiss (×) and "Maybe later" footer buttons set `localStorage.setItem('petbase-guide-expanded', 'false')` and do NOT call `onComplete`. The guide collapses to a small header bar showing progress % and a ▼ expand toggle. It persists on the dashboard across page reloads. Only auto-completing all 8 steps (or a deliberate "dismiss permanently" option) calls `onComplete`.
5. **"Did You Know" hints** — update the hints array in `onboardingSteps.ts` (or the relevant data file) with 10+ engagement-driving feature tips. These render in the existing `RecommendationBanner` component that already replaces the guide once `guideCompleted` is true.

### Part B — Modal & Settings Polish

6. **Glass opacity** — in `app/src/index.css` lines 340-351, change dark-mode `glass-card` alpha from `0.4` to `0.65`.
7. **Remove "Live Beta" badge** — delete the `<span>` pill element in `FeedbackModal.tsx` header (~lines 67-69).
8. **Remove avatar shape picker** — delete the segmented button group in `ProfileSettings.tsx` lines 622-633; remove `avatarShape` from the `handleSaveProfile` payload; keep the state initialization guard (`!== 'hexagon'`) removal.
9. **Live-save toggles** — convert Notifications and Privacy section toggles to auto-save to Firestore on change with a 400 ms debounce. Remove the per-section "Save" buttons for toggle-only settings.
10. **Fix profile save** — audit `handleSaveProfile` to ensure `displayName`, `address` (encrypted), `avatarUrl`, and `visibility` all reach Firestore. Fix the cross-section visibility conflict (both `handleSaveProfile` and `handleSavePrivacy` write `visibility` independently; use a single source of truth or re-read latest profile state before each save).

---

## Technical Considerations

### Routing / Navigation Fix for Checklist Steps ✅ Decided

**Decision: Global UIContext action.** Add `openSettingsModal(section?: string)` to `AppContext` (or a lightweight new `UIContext`). `Dashboard.tsx` and `Layout.tsx` both consume this action and set the `showSettings`/`showUserSettings` boolean that controls `UserSettingsModal`. This avoids prop drilling and keeps routing concerns out of checklist data.

`ProfileSettings` needs to read `useLocation().state?.scrollTo` (or a passed `initialSection` prop when rendered inside the modal) to auto-open and scroll to the target accordion on mount.

`ProfileSettings` needs to read `useLocation().state?.scrollTo` (or a prop when rendered inside the modal) to auto-open and scroll to the target accordion on mount.

### Step ID Migration Strategy

Changing step IDs in `onboardingSteps.ts` will leave returning users with orphaned Firestore keys. Add a migration in `onboardingService.ts` (alongside the existing `migrateOldLocalStorageKeys`) that maps old IDs to new IDs on first load. For IDs that have no equivalent in the new schema, mark them complete to avoid resetting user progress.

Old → New ID mapping (example):
- `complete-profile` → `setup-profile`
- `create-family` → (removed; map to complete)
- `enable-notifications` → (removed; map to complete)
- `privacy-settings` → (removed; map to complete)
- `find-services` → `discover-services` (renamed)

### Debounce for Live-Save Toggles

Use a `useRef`-based debounce (not `useCallback` — component re-renders would cancel queued writes):

**Error handling decision: toast + optimistic rollback.** If the Firestore write fails, show a brief toast ("Settings could not be saved") and revert the toggle to its previous value.

```ts
// profileSettings.tsx
const notifSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

const handleToggleLiveSave = (updates: Partial<UserProfile>, revertFn: () => void) => {
  if (notifSaveTimer.current) clearTimeout(notifSaveTimer.current);
  notifSaveTimer.current = setTimeout(async () => {
    try {
      await updateContextProfile(updates);
    } catch (e) {
      revertFn(); // revert toggle to previous state
      toast.error('Settings could not be saved. Please try again.');
    }
  }, 400);
};
```

Push notification toggle (`handlePushToggle`) must await its async permission dialog before triggering the debounced save, not on the raw `onChange` event.

### avatarShape Cleanup

After removing the picker UI, also:
- Remove `avatarShape` from `handleSaveProfile`'s Firestore payload
- Search and audit all avatar display components for `avatarShape` reads:
  - `app/src/components/` — search for `avatarShape` prop usage
  - If found, default the missing value to `'circle'` at the read site

### Glass Opacity

```css
/* app/src/index.css — dark mode glass-card */
background: rgba(26, 26, 46, 0.65);  /* was 0.4 */
```

Light mode value (`rgba(255,255,255,0.9)`) is already near-opaque — leave unchanged.

---

## System-Wide Impact

- **Interaction graph**: The new `openSettingsModal` context write triggers `UserSettingsModal` render in `App.tsx` or `Layout.tsx`, which mounts `ProfileSettings`, which reads `useLocation().state` or a prop for the target section.
- **Onboarding service**: Step ID migration runs once per user on `useOnboarding` mount; subsequent calls are no-ops via a `schemaVersion` field.
- **Live-save writes**: Each toggle change queues a debounced Firestore update. With 10 toggles and 400 ms debounce, maximum write rate is 2.5 writes/second per section — well within Firestore limits.
- **avatarShape**: Only `ProfileSettings` currently reads and writes this field. No other components were found to render `avatarShape` directly (avatar display uses `rounded-full` unconditionally in most card components).

---

## Acceptance Criteria

### Onboarding Checklist

- [x] Progress bar fills from current completion percentage on mount; does not flash from 0% when guide is expanded after collapse
- [x] All 8 checklist steps navigate to correct destinations without blank screens
- [x] Steps that open settings programmatically scroll to (or highlight) the relevant section in the settings modal
- [x] Clicking × or "Maybe later" collapses the guide to a minimized header; the guide header remains visible on dashboard across page reloads
- [x] The minimized header shows the current progress percentage and a "Resume" or expand affordance
- [x] All 8 new step IDs are defined; existing users with old IDs do not lose all progress (migration logic runs)
- [x] Auto-detect steps (add-pet, pet-photo, health-record) still complete automatically when conditions are met
- [x] Guide completes and `markGuideCompleted()` is called when all 8 steps are done or skipped

### New Getting Started Step List (8 steps)

| # | ID | Label | Destination | Auto-detect |
|---|---|---|---|---|
| 1 | `add-pet` | Add your first pet | `/pets` + openAddModal | yes |
| 2 | `add-pet-photo` | Give your pet a face | `/pets` | yes |
| 3 | `log-health-record` | Log a vaccine or vet visit | `/pets` (open health records) | yes |
| 4 | `create-qr-card` | Create a QR pet card | `/pets?openCards=true` | no |
| 5 | `join-community` | Join a community | `/community` | no |
| 6 | `discover-services` | Find nearby pet services | `/search` | no |
| 7 | `send-message` | Send your first message | `/messages` | no |
| 8 | `setup-profile` | Set up your profile | opens `UserSettingsModal` → `section-profile` | yes |

### "Did You Know" Hints (minimum 10 items)

Hints appear in `RecommendationBanner` after guide completion and cover:
- [ ] Emergency alert feature (lost pet, injury)
- [ ] Expense tracker on the dashboard
- [ ] Marketplace (buy/sell/adopt)
- [ ] Dashboard widget customization (drag and reorder)
- [ ] Calendar reminders for vaccines and vet visits
- [ ] Family / household sharing
- [ ] Global search (pets, people, communities)
- [ ] Gamification: XP, levels, streaks
- [ ] Privacy controls (who can see your pet)
- [ ] QR card sharing and printing

### Modal Polish

- [x] `glass-card` dark mode alpha is 0.65 (was 0.4); all modals using this class are visibly more opaque
- [x] "Live Beta" pill badge is absent from FeedbackModal header
- [x] No avatar shape picker (circle/square/squircle segmented control) appears in ProfileSettings
- [x] `avatarShape` is not written to Firestore in `handleSaveProfile`

### Live-Save Toggles

- [x] Notifications toggles (sound, email, push) save to Firestore within 400 ms of change, no Save button required
- [x] Privacy toggles (visibility, disableDMs, disableGroupInvites, showLastActive) save to Firestore within 400 ms of change, no Save button required
- [x] An inline error appears if a live-save write fails and toggles revert
- [x] Push notifications toggle awaits browser permission dialog before writing state
- [x] Rapid toggling (3+ changes in <400 ms) results in exactly 1 Firestore write for the final state

### Profile Save

- [x] Saving the Profile Information section persists: `displayName`, `address` (encrypted), `avatarUrl`, `visibility`
- [x] `visibility` changed in the Privacy section does not get silently overwritten by a later Profile section save

---

## Success Metrics

- Zero navigation dead-ends from checklist step clicks
- Progress bar reflects real completion state at all times
- New users complete at least 3 checklist steps in first session (no broken affordances blocking them)
- Modal content is readable without straining against the background

---

## Dependencies & Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Step ID migration corrupts user progress | High | Write migration mapping before removing old IDs; add `schemaVersion` field |
| `openSettingsModal` context adds coupling | Low | Scope to UIContext; only Dashboard and checklist consume it |
| Live-save write storms if debounce not implemented | Medium | Implement ref-based debounce from day one |
| `avatarShape` still read somewhere causing visual regression | Low | Grep full codebase for `avatarShape` reads before removing write |
| Framer Motion `initial={false}` causes no-animation on first render | Low | Acceptable tradeoff; bar should show real value immediately |

---

## Implementation Phases

### Phase 1 — Cosmetic & Low-Risk (no logic changes)
- `app/src/index.css`: glass-card alpha 0.4 → 0.65
- `app/src/components/FeedbackModal.tsx`: remove "Live Beta" `<span>` pill
- `app/src/pages/ProfileSettings.tsx`: remove avatar shape segmented control (lines 622-633)

### Phase 2 — Profile Save Fixes
- Audit `handleSaveProfile` → ensure all fields are included in `updateContextProfile` call
- Remove `avatarShape` from the save payload
- Fix `visibility` cross-section conflict (load latest profile state before each section save, or use a unified `pendingChanges` map)
- Convert Notifications and Privacy section toggles to live-save with 400 ms debounce; remove their dedicated Save buttons

### Phase 3 — Onboarding Checklist Overhaul
- Add `openSettingsModal` action to `AppContext` / `UIContext`; wire up `Dashboard.tsx` and `UserSettingsModal`
- Add `useLocation().state?.section` handling to `ProfileSettings` (auto-open accordion on mount)
- Rewrite `onboardingSteps.ts` with the 8 new steps and updated hint definitions
- Add step ID migration to `onboardingService.ts`
- Fix Framer Motion `initial` in `GettingStartedGuide.tsx`
- Fix skip/× behavior to collapse (not hide) the guide; add a permanent dismiss affordance

### Phase 4 — "Did You Know" Hints
- Add 10+ hint entries to the hint data in `onboardingSteps.ts` / `onboarding.ts` types
- Verify `RecommendationBanner` renders all hint categories correctly
- Smoke-test post-completion hint trickle flow

---

## Files to Create / Modify

| File | Change |
|---|---|
| `app/src/index.css` | glass-card opacity |
| `app/src/components/FeedbackModal.tsx` | remove Live Beta badge |
| `app/src/pages/ProfileSettings.tsx` | remove avatar shape, fix save, live-save toggles |
| `app/src/data/onboardingSteps.ts` | new step definitions, updated hints |
| `app/src/components/GettingStartedGuide.tsx` | progress bar fix, skip behavior |
| `app/src/lib/onboardingService.ts` | step ID migration |
| `app/src/contexts/AppContext.tsx` (or new `UIContext`) | `openSettingsModal` action |
| `app/src/pages/Dashboard.tsx` | wire `openSettingsModal` to `UserSettingsModal` |

---

## Sources & References

- Getting Started Guide: `app/src/components/GettingStartedGuide.tsx:29`
- Onboarding steps data: `app/src/data/onboardingSteps.ts`
- Profile Settings: `app/src/pages/ProfileSettings.tsx:85`
- Glass card CSS: `app/src/index.css:340`
- Feedback Modal: `app/src/components/FeedbackModal.tsx:14`
- Avatar shape picker: `app/src/pages/ProfileSettings.tsx:622`
- UserSettingsModal shell: `app/src/components/UserSettingsModal.tsx:10`
- Dashboard render site: `app/src/pages/Dashboard.tsx:828`
- RecommendationBanner: `app/src/components/RecommendationBanner.tsx:9`
- Onboarding types: `app/src/types/onboarding.ts:53`
