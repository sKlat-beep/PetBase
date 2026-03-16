# UI/UX Polish — Dashboard, Community, Pets & Photos

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply a coordinated set of UI/UX improvements across the Dashboard, Community group pages, My Pets page, and photo management system.

**Architecture:** Each chunk is independently deployable. Chunks 1–3 are pure UI tweaks to existing components. Chunk 4 (photo overhaul) touches Firestore service, PetContext, PetFormModal, and PhotoManagerModal, and must be done in order. Chunk 5 (tooltips) is a sweep pass across all touch-points.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Lucide icons, Framer Motion, Firebase Firestore.

---

## File Map

### Modified
- `app/src/pages/Dashboard.tsx` — hidden-widgets position, card color, quick-actions layout
- `app/src/pages/GroupHub.tsx` — add PostComments to PostCard
- `app/src/pages/Pets.tsx` — reorder sections, remove per-pet album toggle, show recent albums
- `app/src/contexts/PetContext.tsx` — create default album on pet creation
- `app/src/lib/firestoreService.ts` — add user-level Default album functions
- `app/src/components/PetFormModal.tsx` — remove Gallery tab
- `app/src/components/pets/PhotoManagerModal.tsx` — album selector on upload, show user Default album, move-photo feature
- `app/src/components/pets/AlbumDetailModal.tsx` — move-photo-to-album button

### Created
- `app/src/components/dashboard/LostPetReportModal.tsx` — multi-step lost pet report (pet select, description, photos)

---

## Chunk 1: Dashboard Improvements

### Task 1: Move Hidden Widgets Tray Above the Grid

**Files:**
- Modify: `app/src/pages/Dashboard.tsx:1362-1437`

- [ ] **Step 1: Move the hidden-widgets tray JSX above the GridLayout block**

In `Dashboard.tsx`, the hidden-widgets tray currently renders _after_ the grid (line 1419). Move it to render _before_ the grid (between the grid container opening `<div ref={containerRef}>` and the loading skeleton / GridLayout).

Replace this block order (inside `<div ref={containerRef} className="w-full">`):

```tsx
{/* BEFORE — tray was at the bottom, after the grid */}
{layoutLoading ? (...) : isMobile ? (...) : (<GridLayout .../>)}

{/* Hidden widgets tray — edit mode only */}
{editMode && hiddenWidgets.size > 0 && (
  <div className="mt-6 ...">...</div>
)}
```

With:

```tsx
{/* Hidden widgets tray — edit mode only, shown ABOVE the grid */}
{editMode && hiddenWidgets.size > 0 && (
  <div className="mb-6 p-4 bg-white/50 dark:bg-zinc-800/50 rounded-2xl border border-dashed border-stone-300 dark:border-zinc-600">
    <p className="text-xs font-semibold text-stone-500 dark:text-zinc-400 uppercase tracking-widest mb-3">Hidden Widgets — click to restore</p>
    <div className="flex flex-wrap gap-2">
      {[...hiddenWidgets].map(key => (
        <button
          key={key}
          onClick={() => showWidget(key)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-stone-200 dark:border-zinc-700 bg-white/70 dark:bg-zinc-800/70 text-stone-600 dark:text-zinc-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:border-emerald-300 dark:hover:border-emerald-800 hover:text-emerald-700 dark:hover:text-emerald-400 motion-safe:transition-colors text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          title={`Restore ${WIDGET_LABELS[key]}`}
        >
          <Eye className="w-3.5 h-3.5" aria-hidden="true" />
          {WIDGET_LABELS[key]}
        </button>
      ))}
    </div>
  </div>
)}

{layoutLoading ? (...) : isMobile ? (...) : (<GridLayout .../>)}
```

Delete the old tray JSX at its former location (lines ~1419–1436).

- [ ] **Step 2: Verify — no visual/functional change when `editMode` is false**

Run the app and confirm the tray does NOT appear outside edit mode. Enter edit mode, hide a widget, and confirm the tray appears above the grid.

- [ ] **Step 3: Commit**

```bash
git add app/src/pages/Dashboard.tsx
git commit -m "feat(dashboard): move hidden-widgets tray to top of grid in edit mode"
```

---

### Task 2: Change "Card" Button Color from Rose to Calm Blue

**Files:**
- Modify: `app/src/pages/Dashboard.tsx:704,706,1141`

There are two places where the "Card" link uses rose colors.

- [ ] **Step 1: Update the pet health card link (line ~704)**

Find:
```tsx
<Link to="/cards" ... className="flex flex-col items-center justify-center p-2 rounded-xl bg-rose-50 dark:bg-rose-900/30 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 ...">
  <CreditCard className="w-4 h-4 mb-1" ... />
  <span className="text-xs font-semibold uppercase tracking-wide">Card</span>
```

Replace rose color classes with calm blue:
```tsx
<Link to="/cards" ... className="flex flex-col items-center justify-center p-2 rounded-xl bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 ...">
```

- [ ] **Step 2: Update the your-pets widget compact card link (line ~1141)**

Find the second `bg-rose-50 dark:bg-rose-900/30` Card link and apply the same blue swap.

- [ ] **Step 3: Commit**

```bash
git add app/src/pages/Dashboard.tsx
git commit -m "fix(dashboard): change Card button color from rose to calm blue"
```

---

### Task 3: Redesign Quick Actions Layout + Labels

**Files:**
- Modify: `app/src/pages/Dashboard.tsx:720-744`

Current layout: 2×2 grid, all equal. New layout: Emergency full-width on top, three buttons side-by-side below. Add Pet → Lost Pet.

- [ ] **Step 1: Restructure the `quick_actions` case in `renderWidget()`**

Find (lines ~720–744):
```tsx
case 'quick_actions': {
  return (
    <section className={`${GLASS_CARD} p-4 flex flex-col gap-3`} aria-label="Quick Actions">
      <h2 ...>Quick Actions</h2>
      <div className="grid grid-cols-2 gap-3 flex-1">
        <button onClick={() => setIsModalOpen(true)} ...>  {/* Add Pet */}
        <button onClick={() => navigate('/messages')} ...>  {/* Messages */}
        <button onClick={() => navigate('/search')} ...>  {/* Find Services */}
        <button onClick={() => setIsEmergencyOpen(true)} ...>  {/* Emergency */}
      </div>
    </section>
  );
}
```

Replace with:
```tsx
case 'quick_actions': {
  return (
    <section className={`${GLASS_CARD} p-4 flex flex-col gap-3`} aria-label="Quick Actions">
      <h2 className="text-sm font-semibold text-stone-500 dark:text-zinc-400 uppercase tracking-widest flex items-center gap-2">
        <Zap className="w-4 h-4" aria-hidden="true" /> Quick Actions
      </h2>
      <div className="flex flex-col gap-3 flex-1">
        {/* Emergency — full width */}
        <button
          onClick={() => setIsEmergencyOpen(true)}
          className="w-full flex items-center justify-center gap-3 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/40 border border-rose-100 dark:border-rose-900/50 text-rose-700 dark:text-rose-400 motion-safe:transition-colors min-h-[56px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          title="Open emergency vet finder"
        >
          <ShieldAlert className="w-5 h-5" aria-hidden="true" />
          <span className="text-sm font-semibold">Emergency Vet</span>
        </button>
        {/* Three actions side by side */}
        <div className="grid grid-cols-3 gap-2 flex-1">
          <button
            onClick={() => setIsLostPetOpen(true)}
            className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-900/40 border border-amber-100 dark:border-amber-900/50 text-amber-700 dark:text-amber-400 motion-safe:transition-colors min-h-[80px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
            title="Report a lost pet"
          >
            <SearchX className="w-5 h-5" aria-hidden="true" />
            <span className="text-xs font-semibold text-center leading-tight">Lost Pet</span>
          </button>
          <button
            onClick={() => navigate('/messages')}
            className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl bg-sky-50 dark:bg-sky-950/30 hover:bg-sky-100 dark:hover:bg-sky-900/40 border border-sky-100 dark:border-sky-900/50 text-sky-700 dark:text-sky-400 motion-safe:transition-colors min-h-[80px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
            title="Open messages"
          >
            <MessageSquare className="w-5 h-5" aria-hidden="true" />
            <span className="text-xs font-semibold text-center leading-tight">Messages</span>
          </button>
          <button
            onClick={() => navigate('/search')}
            className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl bg-violet-50 dark:bg-violet-950/30 hover:bg-violet-100 dark:hover:bg-violet-900/40 border border-violet-100 dark:border-violet-900/50 text-violet-700 dark:text-violet-400 motion-safe:transition-colors min-h-[80px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
            title="Find local pet services"
          >
            <MapPin className="w-5 h-5" aria-hidden="true" />
            <span className="text-xs font-semibold text-center leading-tight">Find Services</span>
          </button>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Add `isLostPetOpen` state and `SearchX`, `Zap` imports**

Add state near other modal state declarations (~line 258):
```tsx
const [isLostPetOpen, setIsLostPetOpen] = useState(false);
```

Add `SearchX` and `Zap` to the lucide-react import line.

- [ ] **Step 3: Commit placeholder (modal wired in Task 4)**

```bash
git add app/src/pages/Dashboard.tsx
git commit -m "feat(dashboard): redesign quick actions — Emergency full-width, Lost Pet replaces Add Pet"
```

---

### Task 4: Create LostPetReportModal

**Files:**
- Create: `app/src/components/dashboard/LostPetReportModal.tsx`
- Modify: `app/src/pages/Dashboard.tsx` — import and render modal

- [ ] **Step 1: Create the modal component**

```tsx
// app/src/components/dashboard/LostPetReportModal.tsx
import { useState, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X, SearchX, Upload, ChevronRight, ChevronLeft, AlertTriangle } from 'lucide-react';
import type { Pet } from '../../types/pet';
import { updatePet } from '../../lib/firestoreService';
import { useAuth } from '../../contexts/AuthContext';

interface Props {
  pets: Pet[];
  onClose: () => void;
  onSaved?: (petId: string) => void;
}

export default function LostPetReportModal({ pets, onClose, onSaved }: Props) {
  const { user } = useAuth();
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedPetId, setSelectedPetId] = useState<string>(pets[0]?.id ?? '');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const selectedPet = pets.find(p => p.id === selectedPetId);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    files.forEach(file => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = () => {
        setPhotos(prev => [...prev, reader.result as string].slice(0, 6));
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const handleSubmit = async () => {
    if (!user || !selectedPet) return;
    setSaving(true);
    try {
      await updatePet(user.uid, {
        ...selectedPet,
        lostStatus: {
          isLost: true,
          reportedAt: Date.now(),
          description: description.trim() || undefined,
          additionalPhotos: photos.length > 0 ? photos : undefined,
        },
      } as Pet);
      onSaved?.(selectedPetId);
      onClose();
    } catch (err) {
      console.error('Failed to report lost pet', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label="Report a lost pet"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={{ duration: 0.15 }}
        className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
      >
        {/* Header */}
        <div className="bg-amber-500 p-5 flex items-center justify-between">
          <div className="flex items-center gap-3 text-white">
            <SearchX className="w-5 h-5" aria-hidden="true" />
            <h2 className="font-bold text-lg">Report Lost Pet</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white rounded"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {step === 1 && (
            <>
              {/* Pet selector */}
              <div>
                <label className="block text-xs font-semibold text-stone-500 dark:text-zinc-400 uppercase tracking-widest mb-2">
                  Which pet is lost?
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {pets.map(pet => (
                    <button
                      key={pet.id}
                      type="button"
                      onClick={() => setSelectedPetId(pet.id)}
                      className={`flex items-center gap-3 p-3 rounded-xl border text-left motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
                        selectedPetId === pet.id
                          ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200'
                          : 'border-stone-200 dark:border-zinc-700 hover:bg-stone-50 dark:hover:bg-zinc-800 text-stone-700 dark:text-zinc-200'
                      }`}
                    >
                      {pet.image
                        ? <img src={pet.image} alt={pet.name} className="w-8 h-8 rounded-full object-cover shrink-0" />
                        : <div className="w-8 h-8 rounded-full bg-stone-200 dark:bg-zinc-700 flex items-center justify-center text-sm font-bold shrink-0">{pet.name[0]}</div>
                      }
                      <span className="font-medium text-sm truncate">{pet.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label htmlFor="lost-description" className="block text-xs font-semibold text-stone-500 dark:text-zinc-400 uppercase tracking-widest mb-2">
                  Description
                </label>
                <textarea
                  id="lost-description"
                  rows={5}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder={`Help others identify ${selectedPet?.name ?? 'your pet'}:\n• When was ${selectedPet?.name ?? 'they'} last seen? (date, time, location)\n• What were they wearing? (collar color, tags)\n• What were they doing when last seen?\n• Any distinctive markings or behaviors?\n• Your contact info (optional)`}
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 dark:border-zinc-700 bg-stone-50 dark:bg-zinc-800 text-stone-900 dark:text-zinc-100 placeholder:text-stone-400 dark:placeholder:text-zinc-500 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/50">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" aria-hidden="true" />
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  Uploading additional photos helps the community identify <strong>{selectedPet?.name}</strong>.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-500 dark:text-zinc-400 uppercase tracking-widest mb-2">
                  Additional Photos (up to 6)
                </label>
                <input ref={fileRef} type="file" accept="image/*" multiple className="sr-only" onChange={handlePhotoSelect} aria-label="Upload lost pet photos" />
                {photos.length < 6 && (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="w-full flex items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed border-stone-300 dark:border-zinc-600 text-stone-500 dark:text-zinc-400 hover:border-amber-400 hover:text-amber-600 dark:hover:border-amber-700 dark:hover:text-amber-400 motion-safe:transition-colors min-h-[64px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                  >
                    <Upload className="w-4 h-4" aria-hidden="true" />
                    <span className="text-sm font-medium">Upload Photos</span>
                  </button>
                )}
                {photos.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mt-3">
                    {photos.map((url, i) => (
                      <div key={i} className="relative aspect-square rounded-xl overflow-hidden">
                        <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setPhotos(prev => prev.filter((_, idx) => idx !== i))}
                          className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                          aria-label={`Remove photo ${i + 1}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 flex items-center justify-between gap-3">
          {step === 2 ? (
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-medium border border-stone-200 dark:border-zinc-700 text-stone-600 dark:text-zinc-300 hover:bg-stone-50 dark:hover:bg-zinc-800 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
          ) : (
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium border border-stone-200 dark:border-zinc-700 text-stone-600 dark:text-zinc-300 hover:bg-stone-50 dark:hover:bg-zinc-800 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500">
              Cancel
            </button>
          )}

          {step === 1 ? (
            <button
              type="button"
              disabled={!selectedPetId}
              onClick={() => setStep(2)}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-semibold bg-amber-500 hover:bg-amber-600 text-white disabled:opacity-50 disabled:cursor-not-allowed motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled={saving}
              onClick={handleSubmit}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-semibold bg-amber-500 hover:bg-amber-600 text-white disabled:opacity-50 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            >
              {saving ? 'Reporting…' : 'Report Lost Pet'}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
```

- [ ] **Step 2: Wire modal into Dashboard.tsx**

Add import:
```tsx
const LostPetReportModal = React.lazy(() => import('../components/dashboard/LostPetReportModal'));
```

Add to the `<React.Suspense>` block at the bottom of Dashboard:
```tsx
<LostPetReportModal
  pets={pets}
  onClose={() => setIsLostPetOpen(false)}
/>
```
Wrap with `{isLostPetOpen && ...}` and `<AnimatePresence>`.

Note: `updatePet` in the modal calls `firestoreService.savePet` — import it from firestoreService. Check that `savePet(uid, pet)` is the correct signature (it is, at line 522 of firestoreService.ts).

- [ ] **Step 3: Commit**

```bash
git add app/src/components/dashboard/LostPetReportModal.tsx app/src/pages/Dashboard.tsx
git commit -m "feat(dashboard): add LostPetReportModal with pet select, description, and photo upload"
```

---

## Chunk 2: Community Group Page — Add Comments to Posts

### Task 5: Wire PostComments into GroupHub PostCard

**Files:**
- Modify: `app/src/pages/GroupHub.tsx:591-631`

Currently `PostCard` in `GroupHub.tsx` renders the post text but has no comment toggle. `PostComments` already exists and is used on the community feed — add it here.

- [ ] **Step 1: Import PostComments and add props to PostCard**

Add import at top of `GroupHub.tsx`:
```tsx
import PostComments from '../components/community/PostComments';
```

Extend `PostCard`'s props interface (line 591):
```tsx
function PostCard({
  post, groupId, canPin, canDelete, pinPost, deletePost, isAuthor, onProfileClick,
  currentUserUid, currentUserRole, isGroupMember,
}: {
  key?: React.Key;
  post: GroupPost;
  groupId: string;
  canPin: boolean;
  canDelete: boolean;
  pinPost: any;
  deletePost: any;
  isAuthor: boolean;
  onProfileClick: (uid: string) => void;
  currentUserUid: string;
  currentUserRole: CommunityRole;
  isGroupMember: boolean;
}) {
```

- [ ] **Step 2: Add PostComments below the post content in PostCard**

After the `<p>` content line (line 628), before the closing `</div>`:
```tsx
<div className="mt-4 border-t border-stone-100 dark:border-stone-700 pt-3">
  <PostComments
    groupId={groupId}
    postId={post.id}
    isGroupMember={isGroupMember}
    currentUserUid={currentUserUid}
    currentUserRole={currentUserRole}
    onProfileClick={onProfileClick}
  />
</div>
```

- [ ] **Step 3: Pass the new props at every PostCard call site**

In GroupHub.tsx, `PostCard` is called at lines ~277 and ~295. The parent component has `user`, `userRole`, and `group` in scope. Pass the new props:

```tsx
<PostCard
  key={post.id}
  post={post}
  groupId={group.id}
  canPin={canPin}
  canDelete={canDeletePost}
  pinPost={pinPost}
  deletePost={deletePost}
  isAuthor={post.authorId === user?.uid}
  onProfileClick={setProfileUid}
  currentUserUid={user?.uid ?? ''}
  currentUserRole={userRole ?? 'Member'}
  isGroupMember={!!userRole}
/>
```

Apply this to both call sites.

- [ ] **Step 4: Commit**

```bash
git add app/src/pages/GroupHub.tsx
git commit -m "feat(community): add PostComments to group feed posts, matching community feed behavior"
```

---

## Chunk 3: My Pets Page Restructure

### Task 6: Reorder Sections and Replace Per-Pet Album Toggles with Recent Albums Panel

**Files:**
- Modify: `app/src/pages/Pets.tsx`

Current order: header → lost banners → Photo Library preview → pets grid (with per-pet album toggle).
New order: header → lost banners → pets grid → Photo Library (showing recent albums, not just recent photos).

- [ ] **Step 1: Remove the per-pet album toggle from the pet grid**

In `Pets.tsx`, inside the `pets.map()` block (~line 292), find the "Albums toggle" section (~lines 300–325):

```tsx
{/* Albums toggle */}
{user && (
  <div className="bg-white/80 dark:bg-stone-800/80 rounded-2xl border border-stone-100 dark:border-stone-700 overflow-hidden">
    <button type="button" onClick={() => toggleAlbums(pet.id)} ...>
      ...Albums...
    </button>
    {expandedAlbums.has(pet.id) && (
      <PhotoAlbums ... />
    )}
  </div>
)}
```

Delete this entire block. Also remove the `expandedAlbums` state and `toggleAlbums` function (~lines 100–108) since they're no longer needed.

Remove unused imports: `PhotoAlbums`, `ChevronDown` (if no longer used elsewhere).

- [ ] **Step 2: Move the Photo Library section below the pet grid**

Cut the Photo Library `<div>` (~lines 258–276) and paste it after the pet grid (`</div>` that closes the grid).

Update the Photo Library section to show recent **albums** (not just recent photos). Replace `RecentPhotosPreview` with a new `RecentAlbumsPreview` component inline in `Pets.tsx`:

```tsx
{/* Photo Library — shows most recently updated albums */}
{user && pets.length > 0 && (
  <div className="bg-white/80 dark:bg-stone-800/80 rounded-2xl border border-stone-100 dark:border-stone-700 p-4">
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <Images className="w-4 h-4 text-stone-400" aria-hidden="true" />
        <h3 className="text-sm font-semibold text-stone-700 dark:text-stone-200">Photo Library</h3>
      </div>
      <button
        onClick={() => setShowPhotoManager(true)}
        className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 rounded"
      >
        View all →
      </button>
    </div>
    <RecentAlbumsPreview pets={pets} uid={user.uid} onViewAll={() => setShowPhotoManager(true)} />
  </div>
)}
```

- [ ] **Step 3: Write `RecentAlbumsPreview` component (above the page component)**

Replace the existing `RecentPhotosPreview` component at the top of `Pets.tsx` with `RecentAlbumsPreview`:

```tsx
function RecentAlbumsPreview({ pets, uid, onViewAll }: { pets: Pet[]; uid: string; onViewAll: () => void }) {
  const [recentAlbums, setRecentAlbums] = useState<Array<{
    petName: string;
    albumName: string;
    coverUrl: string | null;
    photoCount: number;
  }>>([]);

  useEffect(() => {
    if (pets.length === 0) return;
    const unsubs: (() => void)[] = [];
    const albumsByPet = new Map<string, typeof recentAlbums>();

    pets.forEach(pet => {
      if (!pet.id) return;
      const unsub = subscribePetAlbums(uid, pet.id, (albums) => {
        albumsByPet.set(pet.id!, albums.map(a => ({
          petName: pet.name,
          albumName: a.name,
          coverUrl: a.coverPhoto ? photoEntryUrl(a.coverPhoto) : (a.photos[0] ? photoEntryUrl(a.photos[0]) : null),
          photoCount: a.photos.length,
        })));
        // Flatten and take 4 most recent (albums are already ordered createdAt desc)
        const all = Array.from(albumsByPet.values()).flat();
        setRecentAlbums(all.slice(0, 4));
      });
      unsubs.push(unsub);
    });
    return () => unsubs.forEach(u => u());
  }, [pets, uid]);

  if (recentAlbums.length === 0) {
    return (
      <button
        onClick={onViewAll}
        className="w-full text-center py-6 text-sm text-stone-400 dark:text-zinc-500 hover:text-emerald-600 dark:hover:text-emerald-400 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 rounded-xl"
      >
        No albums yet — click to create one
      </button>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {recentAlbums.map((album, i) => (
        <button
          key={i}
          onClick={onViewAll}
          className="group flex flex-col gap-1.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 rounded-xl"
          title={`${album.albumName} — ${album.petName}`}
        >
          <div className="aspect-square rounded-xl overflow-hidden bg-stone-100 dark:bg-zinc-800">
            {album.coverUrl
              ? <img src={album.coverUrl} alt={album.albumName} className="w-full h-full object-cover group-hover:scale-105 motion-safe:transition-transform duration-200" />
              : <div className="w-full h-full flex items-center justify-center text-stone-400"><Images className="w-6 h-6" /></div>
            }
          </div>
          <p className="text-xs font-medium text-stone-700 dark:text-zinc-200 truncate">{album.albumName}</p>
          <p className="text-xs text-stone-400 dark:text-zinc-500">{album.petName} · {album.photoCount} photo{album.photoCount !== 1 ? 's' : ''}</p>
        </button>
      ))}
    </div>
  );
}
```

Remove the old `RecentPhotosPreview` function.

- [ ] **Step 4: Clean up unused state / imports**

Remove: `expandedAlbums`, `toggleAlbums`, `PhotoAlbums` import, old `RecentPhotosPreview`.
Keep: `subscribePetAlbums`, `photoEntryUrl`, `Images` (used by `RecentAlbumsPreview`), `showPhotoManager`, `PhotoManagerModal`.

- [ ] **Step 5: Commit**

```bash
git add app/src/pages/Pets.tsx
git commit -m "feat(pets): move pet grid to top, replace per-pet album toggles with recent-albums panel"
```

---

## Chunk 4: Photo System Overhaul

### Task 7: Create Default Album on Pet Creation

**Files:**
- Modify: `app/src/contexts/PetContext.tsx:43-50`
- Modify: `app/src/lib/firestoreService.ts` — verify `createPetAlbum` signature

- [ ] **Step 1: Import `createPetAlbum` in PetContext.tsx**

```tsx
import { savePet, deletePetDoc, deletePublicCardsForPet, createPetAlbum, logActivity } from '../lib/firestoreService';
```

- [ ] **Step 2: After saving the new pet, create a default album**

In `addPet` callback (line ~47), after `savePet(user.uid, newPet)`:

```tsx
const addPet = useCallback((data: Omit<Pet, 'id'>) => {
  const newPet: Pet = { ...data, id: crypto.randomUUID() };
  setPets((prev) => [...prev, newPet]);
  if (user) {
    savePet(user.uid, newPet)
      .then(() => createPetAlbum(user.uid, newPet.id!, {
        name: 'All Photos',
        photos: [],
        coverPhoto: null,
        visibility: 'private',
        createdAt: Date.now(),
      }))
      .catch(console.error);
    logActivity(user.uid, `Added pet: ${data.name}`);
  }
}, [user]);
```

`createPetAlbum` signature is: `createPetAlbum(uid, petId, album: Omit<PetAlbum, 'id'>)` — returns the new albumId (line 1290 of firestoreService.ts).

- [ ] **Step 3: Commit**

```bash
git add app/src/contexts/PetContext.tsx
git commit -m "feat(pets): auto-create default 'All Photos' album when a new pet is created"
```

---

### Task 8: Add User-Level "Default" Album to Firestore Service

This album holds photos not tied to any specific pet. Path: `users/{uid}/albums/default`.

**Files:**
- Modify: `app/src/lib/firestoreService.ts`

- [ ] **Step 1: Add types and CRUD functions for user-level albums**

Find the `// --- Pet Photo Albums` section (line ~1268) and add below it:

```ts
// --- User Default Album (photos not tied to a specific pet) ---------------

export interface UserDefaultAlbum {
  photos: PhotoEntry[];
  updatedAt: number;
}

const USER_DEFAULT_ALBUM_PATH = (uid: string) =>
  doc(db, 'users', uid, 'albums', 'default');

/** Returns current user default album, or empty shell if none. */
export async function getUserDefaultAlbum(uid: string): Promise<UserDefaultAlbum> {
  const snap = await getDoc(USER_DEFAULT_ALBUM_PATH(uid));
  if (!snap.exists()) return { photos: [], updatedAt: 0 };
  return snap.data() as UserDefaultAlbum;
}

/** Adds photos to the user default album. */
export async function addPhotosToUserDefaultAlbum(uid: string, entries: PhotoEntry[]): Promise<void> {
  const ref = USER_DEFAULT_ALBUM_PATH(uid);
  await setDoc(ref, {
    photos: arrayUnion(...entries),
    updatedAt: Date.now(),
  }, { merge: true });
}

/** Removes a photo from the user default album. */
export async function removePhotoFromUserDefaultAlbum(uid: string, entry: PhotoEntry): Promise<void> {
  const ref = USER_DEFAULT_ALBUM_PATH(uid);
  await updateDoc(ref, {
    photos: arrayRemove(entry),
    updatedAt: Date.now(),
  });
}

/** Real-time subscription to user default album. */
export function subscribeUserDefaultAlbum(
  uid: string,
  onData: (album: UserDefaultAlbum) => void,
): () => void {
  return onSnapshot(USER_DEFAULT_ALBUM_PATH(uid), snap => {
    onData(snap.exists() ? (snap.data() as UserDefaultAlbum) : { photos: [], updatedAt: 0 });
  });
}
```

Note: `PhotoEntry`, `arrayUnion`, `arrayRemove`, `setDoc`, `onSnapshot` are already imported in firestoreService.ts.

- [ ] **Step 2: Commit**

```bash
git add app/src/lib/firestoreService.ts
git commit -m "feat(firestore): add user-level Default album (photos not tied to a specific pet)"
```

---

### Task 9: Remove Gallery Tab from PetFormModal

**Files:**
- Modify: `app/src/components/PetFormModal.tsx`

- [ ] **Step 1: Remove 'gallery' from TAB_ORDER and related state**

Line 17: Remove `'gallery'` from `TAB_ORDER`.
Line 23: Remove `gallery: 'Photo Gallery'` from the tab labels map.
Line 39: Remove `'gallery'` from the `Tab` type union.
Line 211: Remove `const [gallery, setGallery] = useState<string[]>([]);`
Line 239: Remove `setGallery(pet?.gallery ?? []);`
Lines 314: Remove `gallery: gallery.filter(Boolean),` from handleSubmit's data object.
Lines 358–372: Delete `handleGallerySelect` function.
Lines 991–1108: Delete the entire `{activeTab === 'gallery' && (...)}` JSX block.

- [ ] **Step 2: Add a small hint in the "basic" tab near the avatar upload**

After the avatar upload section, add:
```tsx
<p className="text-xs text-stone-400 dark:text-zinc-500 mt-1 flex items-center gap-1">
  <Images className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
  Manage photos in the <button type="button" onClick={onClose} className="underline hover:text-emerald-600">Photo Library</button> on My Pets.
</p>
```

Import `Images` from lucide-react if not already imported.

- [ ] **Step 3: Commit**

```bash
git add app/src/components/PetFormModal.tsx
git commit -m "feat(pets): remove Photo Gallery tab from PetFormModal — photos managed in Photo Library"
```

---

### Task 10: Album Selection During Photo Upload in PhotoManagerModal

**Files:**
- Modify: `app/src/components/pets/PhotoManagerModal.tsx`

- [ ] **Step 1: Read the top of PhotoManagerModal to understand current upload flow**

Look at the `handleUpload()` function. Currently it uploads to a hardcoded album (or the first pet's album). We need to add an album selector that appears when the user picks a photo.

- [ ] **Step 2: Add album state and selector UI**

Add state:
```tsx
const [uploadTargetPetId, setUploadTargetPetId] = useState<string | null>(pets[0]?.id ?? null);
const [uploadTargetAlbumId, setUploadTargetAlbumId] = useState<string | null>(null);
const [availableAlbums, setAvailableAlbums] = useState<Array<{ petId: string; albumId: string; albumName: string; petName: string }>>([]);
```

In a `useEffect`, subscribe to all pet albums to build the `availableAlbums` list:
```tsx
useEffect(() => {
  if (!uid) return;
  const unsubs = pets.map(pet =>
    subscribePetAlbums(uid, pet.id!, albums => {
      setAvailableAlbums(prev => [
        ...prev.filter(a => a.petId !== pet.id),
        ...albums.map(a => ({ petId: pet.id!, albumId: a.id!, albumName: a.name, petName: pet.name })),
      ]);
    })
  );
  return () => unsubs.forEach(u => u());
}, [pets, uid]);
```

- [ ] **Step 3: Add album selector before the upload button**

In the upload section, before the file input trigger button, add:
```tsx
<div className="mb-3">
  <label className="block text-xs font-semibold text-stone-500 dark:text-zinc-400 uppercase tracking-widest mb-1.5">
    Upload to album
  </label>
  <select
    value={uploadTargetAlbumId ?? ''}
    onChange={e => {
      const opt = availableAlbums.find(a => a.albumId === e.target.value);
      setUploadTargetPetId(opt?.petId ?? null);
      setUploadTargetAlbumId(e.target.value || null);
    }}
    className="w-full px-3 py-2 rounded-xl border border-stone-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-stone-700 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
    aria-label="Select album for upload"
  >
    <option value="">General (no specific pet)</option>
    {availableAlbums.map(a => (
      <option key={a.albumId} value={a.albumId}>{a.petName} — {a.albumName}</option>
    ))}
  </select>
</div>
```

- [ ] **Step 4: Update `handleUpload` to use selected album or user Default album**

In `handleUpload`, replace the hardcoded album target with:
```tsx
if (uploadTargetPetId && uploadTargetAlbumId) {
  await addPhotosToAlbum(uid, uploadTargetPetId, uploadTargetAlbumId, newEntries);
} else {
  await addPhotosToUserDefaultAlbum(uid, newEntries);
}
```

Import `addPhotosToUserDefaultAlbum` from firestoreService.

- [ ] **Step 5: Show user Default album section in the modal**

Add a "General Photos" section above the pet albums, pulling from `subscribeUserDefaultAlbum`. Show a row of thumbnails similar to the existing pet-album rows.

- [ ] **Step 6: Commit**

```bash
git add app/src/components/pets/PhotoManagerModal.tsx
git commit -m "feat(photos): add album selector on upload, support user Default album for pet-free photos"
```

---

### Task 11: Move Photos Between Albums

**Files:**
- Modify: `app/src/components/pets/AlbumDetailModal.tsx`

- [ ] **Step 1: Add a "Move to album" button per photo in AlbumDetailModal**

In the photo grid, add a move button alongside the existing delete button. On click, show a small inline picker (dropdown or popover) listing all available albums.

Add state:
```tsx
const [movingPhotoIdx, setMovingPhotoIdx] = useState<number | null>(null);
const [allAlbums, setAllAlbums] = useState<Array<{ petId: string; albumId: string; albumName: string; petName: string }>>([]);
```

Load all albums (same pattern as Task 10 Step 2).

Move handler:
```tsx
const handleMovePhoto = async (photo: PhotoEntry, targetPetId: string, targetAlbumId: string) => {
  // 1. Add to target album
  await addPhotosToAlbum(ownerUid, targetPetId, targetAlbumId, [photo]);
  // 2. Remove from current album
  await handleDeletePhoto(photo); // existing delete function
  setMovingPhotoIdx(null);
};
```

In the photo grid cell, add a move button:
```tsx
<button
  type="button"
  onClick={() => setMovingPhotoIdx(movingPhotoIdx === idx ? null : idx)}
  className="absolute bottom-1 right-1 bg-black/60 text-white rounded-full p-1 hover:bg-black/80 opacity-0 group-hover:opacity-100 motion-safe:transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
  aria-label="Move photo to another album"
  title="Move to album"
>
  <FolderInput className="w-3 h-3" />
</button>
```

Import `FolderInput` from lucide-react. When `movingPhotoIdx === idx`, show a small dropdown listing `allAlbums` (excluding the current one).

- [ ] **Step 2: Commit**

```bash
git add app/src/components/pets/AlbumDetailModal.tsx
git commit -m "feat(photos): add move-photo-between-albums in AlbumDetailModal"
```

---

## Chunk 5: Responsive Tooltips on All Icon Buttons

### Task 12: Add Tooltips and Labels Across the App

**Files (sweep all modified files plus):**
- `app/src/pages/Dashboard.tsx`
- `app/src/pages/GroupHub.tsx`
- `app/src/pages/Pets.tsx`
- `app/src/components/pets/AlbumDetailModal.tsx`
- `app/src/components/pets/PhotoManagerModal.tsx`
- `app/src/components/community/PostComments.tsx`

**Pattern:** Use the native `title` attribute for tooltip text on every icon-only button. For buttons that already have visible labels, `title` is optional. For touch contexts, add `aria-label` as well (most buttons already have this — verify and fill gaps).

- [ ] **Step 1: Audit icon-only buttons in Dashboard.tsx**

Check: widget hide button (EyeOff), widget drag handle (GripVertical), edit toolbar Reset/Cancel/Save. Each should have `title="..."` set. The quick-action buttons already have `title` from Task 3.

- [ ] **Step 2: Audit GroupHub.tsx icon buttons**

Check: Pin button, Trash button in PostCard. Both have `aria-label` — add `title` to match:
```tsx
title={post.isPinned ? "Unpin Post" : "Pin Post"}
title="Delete Post"
```

- [ ] **Step 3: Audit PhotoManagerModal.tsx icon buttons**

Check the delete selected, bulk select, close, and crop buttons. Add `title` where missing.

- [ ] **Step 4: Audit AlbumDetailModal.tsx icon buttons**

Check delete photo, change cover, delete album, visibility toggle. Add `title` where missing.

- [ ] **Step 5: Audit PostComments.tsx icon buttons**

Check delete comment, reply, react buttons. Add `title` to each react button (e.g., `title="React with paw"`).

- [ ] **Step 6: Commit**

```bash
git add app/src/pages/Dashboard.tsx app/src/pages/GroupHub.tsx app/src/pages/Pets.tsx \
  app/src/components/pets/AlbumDetailModal.tsx app/src/components/pets/PhotoManagerModal.tsx \
  app/src/components/community/PostComments.tsx
git commit -m "a11y: add title tooltips to all icon-only buttons across dashboard, community, and pets"
```

---

## Final Verification Checklist

- [ ] Dashboard edit mode: hidden-widgets tray appears above the grid, not below
- [ ] Dashboard edit mode: hidden-widgets tray is NOT visible outside edit mode
- [ ] Dashboard: "Card" links use `bg-blue-*` (not `bg-rose-*`)
- [ ] Dashboard quick actions: Emergency is full-width on top; Lost Pet, Messages, Find Services are in a 3-column row below
- [ ] Dashboard: Lost Pet button opens LostPetReportModal with step 1 (pet + description) and step 2 (photos)
- [ ] Community group page: each post shows a comments section matching the community feed style
- [ ] My Pets: pet cards appear before the Photo Library section
- [ ] My Pets: per-pet album toggles are gone; Photo Library shows recent album thumbnails
- [ ] Adding a new pet auto-creates an "All Photos" album in Firestore
- [ ] PetFormModal: no Gallery tab; hint points user to Photo Library
- [ ] PhotoManagerModal: album dropdown shown before uploading; photos go to selected album or user Default album
- [ ] AlbumDetailModal: move-photo button visible on hover with album picker
- [ ] All icon-only buttons have `title` and `aria-label` attributes
