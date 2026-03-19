# Design System: PetBase Redesign -- Pet-Centric Hub

**Concept:** Pet-Centric Hub (Concept 1)
**Device:** MOBILE
**Font:** Nunito Sans
**Roundness:** High
**Color Mode:** Light

---

## 1. Visual Theme & Atmosphere

Warm artisanal sanctuary with a pet-forward, organic warmth -- every screen feels like a cozy living room where your pet's world comes alive. The palette draws from terracotta pottery, sage garden herbs, and sun-warmed sand, creating a grounded naturalism that avoids clinical sterility. Photo-forward composition prioritizes the emotional bond between owners and their pets, with generous breathing room and pillow-soft card edges that invite touch.

---

## 2. Color Palette & Roles

- **Terracotta Clay** (#C4654A) -- Primary accent for CTAs, active states, selected indicators, countdown badges, alerts, and brand-forward touches. The emotional anchor of the palette.
- **Garden Sage** (#8B9E7E) -- Secondary accent for health-positive indicators, "healthy/happy" states, toggle switches in ON position, chart lines, and community/nature associations.
- **Warm Sand** (#E8D5B7) -- Elevated surface backgrounds for cards, avatar backdrops, section dividers, and neutral badges. The bridge between cream and terracotta.
- **Morning Cream** (#FFF8F0) -- Page canvas and card backgrounds. Warmer than pure white, eliminates harsh contrast against earth tones.
- **Kiln Charcoal** (#2D2926) -- Primary text color for headings and body. Softer than pure black, maintaining the warm atmosphere.
- **Muted Charcoal** (#2D2926 at 60% opacity) -- Secondary text for timestamps, subtitles, and metadata. Never pure grey -- always warm-shifted.
- **Terracotta Light** (#D4876F) -- Hover/pressed state for terracotta elements, light badge backgrounds.
- **Sage Light** (#A8B89E) -- Hover/pressed state for sage elements, subtle health-positive backgrounds.

---

## 3. Typography Rules

**Primary Font:** Nunito Sans -- Rounded terminals with geometric bones; friendly without being childish, readable at all sizes.

- **Display (H1):** 800 weight, 28-32px, charcoal (#2D2926). Used for pet names on profile heroes.
- **Section Headings (H2):** 700 weight, 18-20px, charcoal. Used for "Recent Activity", "Health Summary", section titles.
- **Subsection (H3):** 600 weight, 16px, charcoal. Used for card group headings, chart titles.
- **Body:** 400 weight, 14-15px, line-height 1.5, charcoal. Used for descriptions, post text, event details.
- **Labels/Captions:** 500 weight, 11-12px, muted charcoal. Used for card labels, timestamps, navigation labels, mini-card titles.
- **Stat Values:** 600-700 weight, 14-16px, colored (terracotta or sage depending on context). Used inside health summary cards.

---

## 4. Component Stylings

- **Primary Buttons:** Terracotta (#C4654A) filled, 20px rounded corners, 16px vertical / 24px horizontal padding, white text 14px/600. Hover: darken 10% (#A8523D). Active: scale 0.98.
- **Secondary Buttons:** Cream (#FFF8F0) filled with 1px warm sand border, charcoal text. Hover: warm sand background.
- **Ghost Buttons / Links:** Terracotta text, no background, underline on hover.
- **Cards / Containers:** 16-20px rounded corners, cream (#FFF8F0) background, whisper-soft shadow (0 2px 8px rgba(45,41,38,0.06)). Hover: shadow deepens slightly.
- **Mini Stat Cards:** 16px rounded corners, cream background, subtle shadow. Icon top (colored), label below (11px muted), value below (14-16px bold colored).
- **Pet Switcher Cards:** 20px rounded corners, warm sand background. Selected state: 3px terracotta border, larger scale (160px vs 130px).
- **Avatar Circles:** rounded-full, 2-3px colored border (terracotta for primary pet, sage/sand for albums).
- **Badge Pills:** rounded-full, 11px/700 text. Terracotta background + white text for urgent. Sage background + white text for healthy. Warm sand background + charcoal text for neutral.
- **Toggle Switches:** Sage green (#8B9E7E) track in ON state, warm sand track in OFF state, white circle thumb.
- **Bottom Navigation:** Cream background, subtle warm sand top border (1px). Active item: terracotta icon (filled) + terracotta label. Inactive: muted charcoal icon (outlined) + muted label.
- **Timeline Items:** Vertical sage green line (2px), colored dots at each entry, cream card per entry with 16px rounded corners.
- **Date Badges:** rounded-lg, colored background (terracotta/sage/sand), white text, 11px/700 uppercase.
- **Charts:** Sage green (#8B9E7E) lines/fills on cream background. Faint warm sand grid lines. Terracotta for highlighted data points.

---

## 5. Layout Principles

- **Max content width:** 375px (mobile-first, single-column)
- **Base spacing unit:** 8px system
- **Section vertical margins:** 24-32px between major sections
- **Card internal padding:** 16px all sides
- **Card gap (stacked):** 12px
- **Card gap (grid, e.g. 2x2 health):** 16px
- **Horizontal scroll padding:** 16px left inset, cards peek from right edge
- **Touch targets:** Minimum 44px for all interactive elements, 56px for quick action circles
- **Bottom nav height:** 64px with 8px bottom safe area
- **Hero image height:** 280px on profile screens
- **Avatar sizes:** 120px (profile hero), 64px (story rings), 36px (inline/top bar)
- **Screen edge padding:** 16px horizontal

---

## 6. Design System Notes for Stitch Generation

When creating new screens for PetBase Pet-Centric Hub, include this block in every prompt:

- **Atmosphere:** "Warm artisanal sanctuary with pet-forward organic warmth. Earth-tone palette of terracotta, sage, and sand. Photo-forward, generous breathing room, pillow-soft card edges."
- **Colors:** Always specify: Terracotta Clay (#C4654A) for primary accents and CTAs, Garden Sage (#8B9E7E) for health-positive states, Warm Sand (#E8D5B7) for elevated surfaces, Morning Cream (#FFF8F0) for page canvas and cards, Kiln Charcoal (#2D2926) for text.
- **Shape:** "Generously rounded corners (16-20px) on all cards and containers. Pill-shaped (rounded-full) for badges, avatars, and toggle switches. Whisper-soft shadows for subtle depth."
- **Spacing:** "Comfortable density with 8px base unit. 16px screen edge padding. 24-32px between sections. 16px card internal padding. 44px minimum touch targets."
- **Font:** Nunito Sans -- rounded terminals, friendly geometric. 700-800 for headings, 400 for body, 500-600 for labels and stat values.
- **Device:** Mobile (375px), single-column layout, bottom navigation with 4 tabs (Overview/Home, Health, Social, Cards).

---

## 7. Screen Inventory

| # | Screen Name | Key Components | Primary Accent |
|---|-------------|---------------|----------------|
| 1 | Pet Overview | Avatar hero, health mini-cards, activity timeline, bottom nav | Terracotta (active nav) |
| 2 | Health Dashboard | Weight chart, mood calendar, vaccine cards, medication toggles | Sage (chart), Terracotta (badges) |
| 3 | Pet Switcher + Home | Horizontal pet cards, selected pet world, photo grid, quick actions | Terracotta (selected pet border) |
| 4 | Mobile Pet Profile | Hero photo with overlay, story rings, 2x2 health grid, events, community, shareable cards | Full palette |
