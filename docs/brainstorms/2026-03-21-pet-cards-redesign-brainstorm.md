# Pet Cards Redesign Brainstorm
**Date:** 2026-03-21
**Status:** Draft — awaiting user approval to proceed to planning

---

## What We're Building

Two interconnected redesigns + one bug fix, all part of the Identity Cards feature:

1. **Identity Cards Page (Owner View)** — Replace compact `CardTile` list rows with large, visual "gallery cards" that lead with the pet photo. Clicking a card opens a contextual action panel (Share, QR, Download, Edit, Revoke).

2. **Shared Card Page (Recipient View)** — Redesign `SharedCardPage.tsx` to match the rich "Cooper card" aesthetic: full-bleed hero photo, emergency contact with Call/Message buttons, Core Specs grid, Medical Notes bullets, Dietary Schedule (morning/evening), and Primary Vet with directions.

3. **Shared Card Bug Fix** — The shared URL (`/cards/view/:cardId`) currently hangs on the skeleton and shows "no card available" when visited by the recipient. The `getPublicCard()` fetch either times out or the `petSnapshot` data is missing/incomplete.

---

## Why This Approach

The current `CardTile` design (compact rows with a tiny avatar, name text, and action chips) doesn't communicate the "premium identity credential" feeling the product aims for. The target design (Image 2 — Cooper card) proves the concept: a pet ID card should feel like something you'd actually hand someone, not a spreadsheet row.

The `SharedCardPage` already has the right structural bones — hero photo, active/expired badge, template label — but `CardSectionRenderer` renders into plain accordions with icon-only labels and dark boxes rather than readable, human-first sections.

---

## Key Design Decisions

### Decision 1: Identity Cards Page Layout

**Current:** `CardTile` rows in a vertical list inside `PetCardsModal`.

**Target:** A 2-column (mobile: 1-column) gallery grid. Each card is a tall visual tile showing:
- Full pet photo as the card background (with gradient scrim)
- Pet name overlay at the bottom (large, bold)
- Template badge (color-coded: Emergency = red, Vet = teal, Sitter = purple)
- QR icon button in the top-right corner (clicking shows QR overlay)
- Status indicator: Active (green dot) or Revoked/Expired (dimmed overlay + stamp)
- Expiration line at the bottom: "Never expires" / "Expires Oct 2025"

**Interaction model:** Clicking the card body opens a bottom sheet / slide-up action panel with:
- Large card title + pet name
- Share link (copy URL)
- QR code (full size)
- Download (PDF or image)
- Edit card
- Revoke (destructive, confirmation)

This matches the goal image where clicking a card opens the detail/edit view. Keeps the grid clean and action-focused.

**Revoked & Expired section:** Remains as collapsible section below. Cards show dimmed photo + red "REVOKED" or "EXPIRED" stamp overlay.

---

### Decision 2: Shared Card Page Layout (Recipient)

Redesign `SharedCardPage.tsx` to render sections in a structured, human-readable layout — NOT accordions. Sections render sequentially based on `sharing` toggles.

**New section anatomy:**

```
┌─────────────────────────────────┐
│  [FULL-BLEED HERO PHOTO ~300px] │  ← existing, keep
│  Cooper                         │
│  Golden Retriever · 3 Years     │
│                 MANAGED BY [◯]  │  ← NEW: owner avatar + displayName
└─────────────────────────────────┘

🚨 Emergency Contact             (if sharing.emergencyContact)
   Alex Rivera
   +1 (555) 012-3456
   [Call Now]  [Message]

📋 Core Specs                    (if sharing.basicInfo)
   Weight       32 kg
   Neutered     Yes
   Microchip    #98511200

🏥 Medical Notes                 (if sharing.medicalOverview)
   • Slightly allergic to bee stings
   • Up to date on all vaccinations

🍽️ Dietary Plan                  (if sharing.diet)
   MORNING (8:00 AM)
   2 cups Grain-free kibble + Salmon oil
   EVENING (6:00 PM)
   2 cups Grain-free kibble + Joint supplement
   ⚠ NO CHICKEN PRODUCTS

📍 Primary Vet                   (if sharing.vetInfo)
   City Pet Hospital
   Dr. Sarah Jenkins
   [View Directions]
```

**"Managed By" badge:** Show the owner's `displayName` + avatar in the hero section (bottom-right corner). The owner avatar comes from `profile.photoURL` — needs to be embedded in the card snapshot at creation time (new field: `ownerDisplayName`, `ownerAvatarUrl`).

**Call Now / Message buttons:** `tel:` and `sms:` links from `emergencyContacts.ownerPhone`. Already in the snapshot.

**View Directions:** Google Maps link using `lastVet.address` if available.

---

### Decision 3: Shared Card Bug Fix

**Root cause (suspected):** The skeleton renders but `getPublicCard(cardId)` never resolves or rejects cleanly. Most likely causes:
- Firestore security rules block unauthenticated reads on `publicCards` (but rules say world-readable — needs verification)
- `petSnapshot` is `undefined` on the Firestore doc (card created before snapshot denormalization was added)
- `getPublicCard` awaits indefinitely with no timeout

**Fix strategy:**
- Add a 10-second timeout to `getPublicCard` — if it exceeds, fall to `not-found`
- Add a null-guard: if `card.petSnapshot` is undefined on a single-pet card, show a graceful "Card data unavailable" state
- Add Firestore security rule verification test for unauthenticated reads

---

## Recommended Feature Additions

These flesh out the feature and make it feel complete:

### R1: Owner Snapshot Embedding
When a card is created, embed `ownerDisplayName` and `ownerAvatarUrl` (tokenized) into the Firestore doc. This powers the "Managed By" badge on the recipient view and personalizes the shared experience.

### R2: Emergency Contact Call/Message CTAs
The `emergencyContacts.ownerPhone` already exists in the snapshot. Render it as `<a href="tel:...">` and `<a href="sms:...">` buttons in the Emergency Contact section. High-value for the "someone found my lost pet" use case.

### R3: Dietary Schedule Display
`dietSchedule: DietSchedule[]` already exists in the snapshot. Render each entry as a time-labeled row (MORNING / EVENING / MIDDAY) with feeding amount and notes. Show allergy/exclusion notes in an amber warning chip.

### R4: Vet Directions Link
`lastVet` in the snapshot should include address. Generate a Google Maps intent URL (`https://maps.google.com/?q=<address>`) for the "View Directions" button.

### R5: QR Quick-Access on Gallery Cards
Tapping the QR icon on a gallery card tile (owner view) opens a fullscreen QR overlay without having to open the full action panel — faster for handing your phone to a vet.

### R6: Card Share Preview (OG Meta)
`cardMetaProxy.ts` already generates OG tags. Improve the preview thumbnail: include pet name, breed, and a cropped version of the pet photo. This makes shared links look polished in iMessage/WhatsApp.

### R7: Expiry Countdown Chip
On active cards in the gallery, show a subtle countdown: "Expires in 12 days" as a warning chip when < 14 days remain. Prompts owner to renew before a vet visit.

### R8: Download as Image
The "Download" action currently exists in `CardTile`. Wire it to generate a styled PNG of the shared card view (using `html2canvas` or similar) so owners can save/print the card.

---

## What Changes Where

| File | Change |
|---|---|
| `app/src/pages/Cards.tsx` | Replace `CardTile` list with gallery grid; wire card click → action drawer |
| `app/src/components/cards/CardTile.tsx` | Retire or repurpose as `CardGalleryTile` (visual gallery card) |
| `app/src/components/cards/CardActionDrawer.tsx` | **NEW** — bottom sheet with Share/QR/Download/Edit/Revoke |
| `app/src/pages/SharedCardPage.tsx` | Redesign sections; add "Managed By" badge; add Call/Message CTAs; add timeout |
| `app/src/components/cards/CardSectionRenderer.tsx` | Refactor to render structured sections (not accordions) matching new design |
| `app/src/types/cardExtensions.ts` | Add `ownerDisplayName`, `ownerAvatarUrl` to `PublicCardPetSnapshot` |
| `app/src/lib/firestoreService.ts` | Add timeout to `getPublicCard`; add `ownerDisplayName`/`ownerAvatarUrl` to snapshot builder |
| `app/src/components/cards/CreateCardModal.tsx` | Embed owner snapshot fields on card creation |

---

## Resolved Questions

1. **Action panel style** → **Bottom sheet** (slide up from bottom). Most natural on mobile, consistent with the app's modal patterns.

2. **Multi-pet card gallery tile** → **Collage of overlapping avatars** on a gradient background with a pet count label. Richer visual identity than borrowing one pet's photo.

3. **Owner badge on shared card** → **Name only** ("Managed by Alex Rivera"). No avatar embedding — avoids tokenization complexity and broken images if the owner changes their photo.

4. **CardSectionRenderer refactor scope** → Create a new structured layout path within `CardSectionRenderer` (or a sibling `SharedCardSectionRenderer`) specifically for the recipient view — no accordions, sequential readable sections. The owner-preview path can remain as-is.

5. **Call/Message CTA visibility** → **Always visible** on all devices. Simpler, consistent. Desktop users can still copy the number.

6. **Stale snapshot fix** → **Auto-fix silently**. On owner page load, detect cards with missing/stale `petSnapshot` and quietly rebuild + re-save to Firestore in the background. No manual "Refresh" button needed.

7. **Expiry display on gallery tiles** → **Always show** — every tile shows "Never expires" or "Expires Oct 2025". Countdown warning chip (amber) appears when ≤14 days remain.

8. **Revoked/expired cards** → **Collapsed section** at the bottom (existing behavior preserved). Active cards grid stays clean.

9. **QR display (from action sheet)** → **Full-screen overlay** — dark modal, QR centered large, card name below. Easy to scan at a vet desk.

10. **Recipient page footer** → **Subtle branded footer** — "Made with PetBase — Create a card for your pet" link at the bottom. Organic growth driver.

---

## Out of Scope

- Creating new card types (no new templates)
- Redesigning the card creation/edit modal flow
- Changing Firestore data structures (additive only — new snapshot fields)
- Mobile app (web only)
