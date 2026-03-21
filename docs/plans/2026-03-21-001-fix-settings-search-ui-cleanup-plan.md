---
title: "fix: Settings cleanup, Pets page icon removal, Search right panel with favorites"
type: fix
status: completed
date: 2026-03-21
---

# fix: Settings cleanup, Pets page icon removal, Search right panel with favorites

## Overview

Six focused UI changes across three areas of the app:

1. **Remove Encryption & Sync section** from ProfileSettings — fully automatic on the backend, users don't need to see it.
2. **Remove Data & Backup section** (Encrypted Backup, Export Your Data, Personal Activity Log) — no longer needed.
3. **Promote Family Sharing** — rename the now-empty "Data & Backup" accordion to "Family Sharing" so it stands alone as a top-level section.
4. **Remove the dead profile icon** from the My Pets page header.
5. **Remove Recent Community Reports** from the Search page SideRail — the search engine has been redesigned.
6. **Add a right context panel** to Search with two collapsible sections: **Favorites** (expanded by default) and **Recent Searches** (collapsed by default), with pin-to-favorites support.

---

## Problem Statement / Motivation

- The Encryption & Sync and Data & Backup accordions expose implementation details that are now invisible infrastructure. Surfacing them adds noise and risks user confusion.
- The profile `account_circle` button in the Pets header has no click handler — it is a dead affordance.
- The Recent Community Reports panel in Search is a leftover from the old search design and shows stale/empty content.
- Search has no saved-search affordance. Users lose their query history on every session and cannot pin frequent searches.

---

## Proposed Solution

### Part A — ProfileSettings cleanup

Remove two `<Section>` accordions and promote Family Sharing:

| Before | After |
|---|---|
| Section 5: Encryption & Sync | *(removed)* |
| Section 6: Data & Backup → Encrypted Backup, Export Your Data, Personal Activity Log, Family Sharing | Section 6: Family Sharing (top-level) |

### Part B — Pets page header

Delete the `account_circle` `<button>` (lines 523–529 of `Pets.tsx`). No handler, no state — surgical deletion only.

### Part C — Search page

- Remove `SideRail` and its `recentTips` prop / `useCommunityTips` hook from `Search.tsx`.
- Create `app/src/components/search/SearchRightPanel.tsx` with Favorites + Recent Searches collapsible sections.
- Wire `SearchRightPanel` into the global `RightPanelContext` using the standard page pattern.

---

## Technical Considerations

### ProfileSettings removals

**Encryption & Sync block** (`ProfileSettings.tsx` lines 1205–1252):
- Delete the `<Section icon="sync_lock" title="Encryption & Sync" id="section-sync">` block.
- Remove state: `showEncryptionWarning`, `vaultEnabled`, `syncSaving`, `syncError`, `syncSuccess`.
- Remove handler: `handleEnableSync` (lines 320–337).
- Trim the `useEffect` at lines 271–278: remove the `loadVaultKey(user.uid).then(...)` call.

**Data & Backup block** (outer Section lines 1254–1727 — keep Family Sharing content at 1393–1726):
- Delete sub-sections: Encrypted Backup (1258–1284), Export Your Data (1286–1314), Personal Activity Log (1316–1391).
- Change outer `<Section>` props: `icon="cloud_download" title="Data & Backup" id="section-data"` → `icon="group" title="Family Sharing" id="section-family"`.
- Remove inner `<div className="pt-4 border-t ...">` wrapper and its `<h3>Family Sharing</h3>` heading (now redundant — Section title carries it).

**State to remove:**
- `showPersonalLogs`, `activityLog` (lines 132–133)
- `showBackupModal`, `backupMode`, `backupPassword`, `backupConfirm`, `backupFile`, `backupWorking`, `backupError`, `backupSuccess`, `backupFileRef` (lines 163–172)
- `exporting`, `exportUrl` (lines 227–229)

**Handlers to remove:**
- `handleExport` (lines 395–408)
- `handleExportBackup` (lines 409–435)
- `handleImportBackup` (lines 436–455)

**Dead imports to remove after both sections gone:**
- From `'../lib/crypto'`: `hasLocalKey`, `createEncryptedBackup`, `restoreEncryptedBackup`, `wrapKeyForVault`, `getOrCreateUserKey`, `type EncryptedBackup`
- From `'../lib/firestoreService'`: `saveVaultKey`, `loadVaultKey` (verify no other usage remains)
- From `'../utils/activityLog'`: `getActivityLog`, `formatRelativeTime`, `type ActivityEntry`
- From `'firebase/functions'`: `httpsCallable` (verify no other section uses it); `functions` from `'../lib/firebase'`

### Search right panel

**Existing RightPanel pattern** (canonical example: `Dashboard.tsx` lines 486–496):
```tsx
const { setContent } = useRightPanel();
useEffect(() => {
  setContent(<SearchRightPanel history={orchestrator.history} onSelect={...} />);
  return () => setContent(null);
}, [setContent, orchestrator.history]);
```

The `RightPanel` renderer (`app/src/components/layout/RightPanel.tsx`) is a sticky 380 px `<aside>` rendered in `Layout.tsx`, visible at `xl:` breakpoint only. It replaces the removed SideRail column.

**Recent searches source:** `orchestrator.history` — a `SearchHistoryEntry[]` already returned by `useOrchestrator` hook (localStorage key `petbase_orchestrator_history`, max 5 entries). Shape: `{ query, serviceType, timestamp }`.

**Favorites storage:** New localStorage key `petbase_search_favorites`. Same `SearchHistoryEntry` shape. Add/remove toggle via a pin button on each recent-search row.

**Collapsible UI:** Use native `<details>`/`<summary>` elements matching the rest of the app's accordion pattern, or a `useState`-based open flag — match whatever pattern `RightPanel` content already uses elsewhere.

**Collapsible defaults:**
- Favorites → `open` / `defaultOpen={true}`
- Recent Searches → closed by default

---

## System-Wide Impact

- **Interaction graph**: ProfileSettings renders entirely client-side; no Firestore writes are triggered by the UI removals. The Family Sharing content (household create/join/manage) is unaffected.
- **Dead state cleanup**: Several `useState` declarations and one `useEffect` branch become unreferenced — TypeScript will surface any missed references via `tsc --noEmit`.
- **RightPanel**: `setContent(null)` on unmount is critical — the Search panel must clear itself so navigating away doesn't leave stale panel content.
- **SideRail removal**: `useCommunityTips` fires a Firestore listener — removing the hook from `Search.tsx` eliminates that subscription entirely (good for read costs).
- **Favorites persistence**: localStorage only, no Firestore. No data migration needed.

---

## Acceptance Criteria

### ProfileSettings

- [ ] "Encryption & Sync" accordion is absent from ProfileSettings
- [ ] "Data & Backup" accordion is absent from ProfileSettings
- [ ] A standalone "Family Sharing" section (with Create/Join Household and household management) is present and functional
- [ ] All removed state variables, handlers, and imports are gone — `tsc --noEmit` passes with zero errors

### Pets page

- [ ] The `account_circle` icon button is absent from the My Pets page header
- [ ] The notification bell icon (if present) is unaffected

### Search page

- [ ] "Recent Community Reports" section is no longer rendered
- [ ] The old SideRail grid column is removed
- [ ] A right context panel appears at `xl:` breakpoint containing:
  - [ ] **Favorites** section — expanded by default — shows pinned searches (empty state: "No favorites yet")
  - [ ] **Recent Searches** section — collapsed by default — shows recent queries from `orchestrator.history`
  - [ ] A pin/star button on each recent search row adds it to Favorites
  - [ ] A remove button on each favorite removes it from Favorites
  - [ ] Clicking a recent search or favorite re-runs the search
  - [ ] Favorites persist across page reloads (localStorage)
  - [ ] Navigating away clears the right panel (`setContent(null)` on unmount)

---

## Implementation Phases

### Phase 1 — Dead code removal (ProfileSettings + Pets)
- `app/src/pages/ProfileSettings.tsx`: remove Encryption & Sync block, remove Data & Backup sub-sections, rename/promote Family Sharing Section, delete dead state/handlers/imports
- `app/src/pages/Pets.tsx`: delete `account_circle` button block (lines 523–529)
- Run `tsc --noEmit` to confirm zero errors

### Phase 2 — Search page cleanup
- `app/src/pages/Search.tsx`: remove `useCommunityTips` import + usage, remove `SideRail` grid column
- `app/src/components/search/SideRail.tsx`: remove "Recent Community Reports" block and `recentTips` prop (or remove file entirely if SideRail has no remaining content)

### Phase 3 — Search right panel
- Create `app/src/components/search/SearchRightPanel.tsx` with Favorites + Recent Searches sections
- Wire into `Search.tsx` via `useRightPanel` / `useEffect` pattern
- Test expand/collapse defaults, pin/unpin, localStorage persistence, re-run on click, panel teardown on navigate

---

## Dependencies & Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Dead import TypeScript errors after section removal | Low | Run `tsc --noEmit` after Phase 1; fix any residual references |
| `loadVaultKey` / `saveVaultKey` used elsewhere in the file | Low | Grep full file before removing import |
| `httpsCallable` used by another handler not being removed | Low | Grep full ProfileSettings for `httpsCallable` before removing |
| Right panel not clearing on navigate (stale content) | Medium | Always include `return () => setContent(null)` in the `useEffect` |
| Favorites localStorage schema diverging from `SearchHistoryEntry` | Low | Use same shape; add `pinnedAt: number` timestamp if sort order needed |
| SideRail used by other pages | Low | Grep codebase — SideRail is imported only in `Search.tsx` |

---

## Files to Create / Modify

| File | Action |
|---|---|
| `app/src/pages/ProfileSettings.tsx` | Remove Encryption & Sync block, remove Data & Backup sub-sections, promote Family Sharing, remove dead state/handlers/imports |
| `app/src/pages/Pets.tsx` | Remove `account_circle` button (lines 523–529) |
| `app/src/pages/Search.tsx` | Remove `useCommunityTips`, remove SideRail, add `useRightPanel` + `SearchRightPanel` wiring |
| `app/src/components/search/SideRail.tsx` | Remove "Recent Community Reports" block + `recentTips` prop (or delete file) |
| `app/src/components/search/SearchRightPanel.tsx` | **Create** — Favorites + Recent Searches collapsible panel |

---

## Sources & References

- ProfileSettings Encryption & Sync block: `app/src/pages/ProfileSettings.tsx:1205`
- ProfileSettings Data & Backup block: `app/src/pages/ProfileSettings.tsx:1254`
- ProfileSettings Family Sharing sub-div: `app/src/pages/ProfileSettings.tsx:1393`
- Pets page header icon: `app/src/pages/Pets.tsx:523`
- SideRail community reports: `app/src/components/search/SideRail.tsx:40`
- Search page orchestrator history: `app/src/utils/yelpOrchestrator.ts` — key `petbase_orchestrator_history`
- RightPanel context: `app/src/contexts/RightPanelContext.tsx`
- RightPanel renderer: `app/src/components/layout/RightPanel.tsx`
- Dashboard RightPanel wiring (canonical pattern): `app/src/pages/Dashboard.tsx:486`
