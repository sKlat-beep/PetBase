# Modal Performance Analysis — 2026-03-20

Analysis of tab-switching sluggishness reported across PetBase modals. No code changes included here — this is a reference for the next performance sprint.

---

## Root Causes (Ranked by Impact)

### 1. All Tab Content Mounts on Modal Open

**Files:** `PetFormModal.tsx`, `MedicalRecordsModal.tsx`
**Pattern:** `{activeTab === 'x' && <content />}` — React mounts and unmounts tab content on every switch.
**Impact:** On first open, all 4 tabs in `PetFormModal` (and all 3 in `MedicalRecordsModal`) are eagerly evaluated. On tab switch, the leaving tab's tree is torn down and the entering tab's tree is mounted fresh — triggering sub-component initialization, effects, and layout paint all at once.

**Fix:** Lazy-mount with a "has been activated" ref guard:
```tsx
// One ref per tab — flips true on first visit, never flips back
const hasSeenTab = useRef<Record<Tab, boolean>>({ basic: false, details: false, health: false, emergency: false });
hasSeenTab.current[activeTab] = true;

// In JSX — mount once, then hide/show via CSS only
{TAB_ORDER.map(tab => (
  <div key={tab} className={activeTab === tab ? '' : 'hidden'}>
    {hasSeenTab.current[tab] && <TabContent tab={tab} />}
  </div>
))}
```
This mounts each tab once on first visit, then hides with CSS (`display:none`) on subsequent switches — zero unmount/remount cost.

---

### 2. No Memoization on Modal Sub-Components

**Files:** All modal children (form field groups, list items in `MedicalRecordsModal`, vaccine cards)
**Pattern:** No `React.memo` wrappers on child components that receive stable props.
**Impact:** Every keystroke or state update in `PetFormModal` re-renders all 40+ child elements. In `MedicalRecordsModal`, every drag-reorder re-renders all vaccine cards.

**Fix:**
```tsx
// Wrap heavy list items
const VaccineCard = React.memo(function VaccineCard({ vaccine, ... }) { ... });

// Stabilize handlers passed as props
const handleRemove = useCallback((i: number) => { ... }, [vaccines]);
```
Priority targets: `MedicalRecordsModal` vaccine/visit list items (potentially 20+ items), `PetFormModal` tag input groups.

---

### 3. Spring Animation on Every Tab Switch (0.3s Duration)

**Files:** All modals using `motion/react` — `PetFormModal.tsx` (line 442), `MedicalRecordsModal.tsx` (line 481)
**Pattern:** `transition={{ type: 'spring', duration: 0.3 }}` on the modal card + `AnimatePresence` with spring on tab content.
**Impact:** Physics-based spring calculation runs on the JS thread for every tab switch. On lower-end devices, this competes with React reconciliation.

**Fix (two options):**
```tsx
// Option A: Tune spring — shorter, snappier
transition={{ type: 'spring', duration: 0.18, bounce: 0.1 }}

// Option B: Switch tab content to a simple tween — no physics
transition={{ duration: 0.12, ease: 'easeOut' }}
```
The modal open/close animation can stay as spring (it's a one-time cost); only the in-modal tab switching needs to be lighter.

---

### 4. Vaccine Sort + Status Calc Runs for All 3 Tabs on Load

**File:** `MedicalRecordsModal.tsx`
**Pattern:** Vaccine sorting and `getVaccineStatus()` calls execute for all three tabs' data on every render.
**Impact:** With 10+ vaccines, status calculations (date comparisons, sort) run on every state update even when the vaccines tab isn't visible.

**Fix:**
```tsx
// Memoize per-tab — only recalc when tab data or active tab changes
const sortedVaccines = useMemo(
  () => activeTab === 'vaccines' ? [...vaccines].sort(...) : [],
  [vaccines, activeTab]
);
```

---

### 5. Only 2 of 20+ Modals Are Code-Split

**File:** `Pets.tsx` (only `HouseholdPetsPanel` uses `React.lazy`)
**Impact:** `PetFormModal` (42 KB), `MedicalRecordsModal`, and all community modals land in the initial JS bundle, increasing parse time on first load.

**Fix:** Lazy-load heavy modals that aren't needed on initial render:
```tsx
const PetFormModal = lazy(() =>
  import('./PetFormModal').then(m => ({ default: m.PetFormModal }))
);
const MedicalRecordsModal = lazy(() =>
  import('./MedicalRecordsModal').then(m => ({ default: m.MedicalRecordsModal }))
);
```
Wrap call sites in `<Suspense fallback={null}>`. These are already only opened on user interaction, so lazy loading has zero UX cost.

---

## Effort vs. Impact Summary

| Fix | Effort | Tab-switch improvement |
|---|---|---|
| Lazy-mount tabs (hasMounted ref) | Low | **High** — eliminates mount/unmount cost |
| React.memo on vaccine/visit list items | Medium | Medium — removes cascade re-renders |
| Tune animation duration | Trivial | Low-medium — smoother feel on low-end |
| useMemo for vaccine sort | Low | Medium for MedicalRecordsModal |
| React.lazy for modals | Low | Improves initial load, not tab switching |

Start with #1 (lazy-mount) — it addresses the primary cause of sluggishness and requires no component restructuring.
