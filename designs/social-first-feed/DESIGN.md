# Design System: PetBase Social-First Feed
**Project:** PetBase Redesign Concept 2
**Device:** MOBILE
**Design Mode:** HIGH_FIDELITY

## 1. Visual Theme & Atmosphere

A bold, immersive social-first dark experience — Instagram meets pet health, where every pet is a social identity. Near-black canvases create a cinematic stage for vivid photography and pulsing accent colors. The aesthetic is energetic and youthful without sacrificing the platform's privacy-first trust signals. Full-bleed imagery, gradient avatar rings, and paw-print reactions give it a playful personality grounded in a sophisticated dark palette. It feels like scrolling through a premium photo magazine dedicated to the pets you love.

## 2. Color Palette & Roles

- **Void Black** (#121212) — Page background, the deepest canvas layer. All content floats above this.
- **Midnight Navy** (#1A1A2E) — Card surfaces, bottom sheets, tab bars, input fields. The elevated surface layer.
- **Coral Flame** (#FF6B6B) — Primary accent. CTA buttons, active nav icons, paw-print reactions, notification badges, primary action highlights. The emotional color — warmth, love, urgency.
- **Electric Teal** (#4ECDC4) — Secondary accent. Health data, star ratings, links, tags, secondary action icons. The informational color — trust, data, navigation.
- **Vivid Violet** (#7C5CFC) — Tertiary accent. Gradient avatar rings (paired with coral), category badges, decorative elements. The playful color — personality, flair, discovery.
- **Pure White** (#FFFFFF) — Primary text, headings, pet names, bold display type. Maximum contrast on dark surfaces.
- **Muted Stone** (#9CA3AF) — Secondary text, timestamps, metadata, placeholder text, inactive nav icons. Recedes gracefully.
- **Deep Divider** (#2A2A3E) — Subtle separators, stat dividers, inactive borders. Nearly invisible structural lines.

## 3. Typography Rules

**Primary Font:** DM Sans — geometric, modern, highly legible at all sizes. Friendly without being childish. Excellent bold weights for social emphasis.

- **Display (H1):** DM Sans 700 (Bold), 28px. Pet names on profiles, screen titles.
- **Section Headers (H2):** DM Sans 700, 20-22px. Section labels ("Trending Groups", "Popular Pets"), logotype.
- **Card Titles (H3):** DM Sans 600 (SemiBold), 15-16px. Post author names, service names, group names.
- **Body:** DM Sans 400 (Regular), 14-15px, line-height 1.5. Post captions, descriptions, bio text.
- **Captions/Labels:** DM Sans 400-500, 11-12px. Timestamps, metadata, nav labels, badge text.
- **Button Text:** DM Sans 600, 14-15px. CTAs, action labels.

Letter-spacing: default (0) for body, slight negative (-0.01em) for display sizes to tighten headlines.

## 4. Component Stylings

- **Primary Buttons:** Coral (#FF6B6B) filled, white text, 12px radius, 44-48px height, full-width on mobile. Subtle shadow for elevation. Hover/press: darken to #E85555.
- **Secondary Buttons:** #1A1A2E background, white text, 1px border #3A3A4E, 12px radius, 44px height. Hover/press: lighten border to #5A5A6E.
- **Ghost Buttons:** Transparent background, coral or teal text, no border. Hover/press: 8% opacity background tint.
- **Cards/Containers:** 12px radius, #1A1A2E background, no visible border, no shadow (flat on dark canvas). Content cards have 16px internal padding.
- **Photo Posts:** Full-width edge-to-edge imagery, no border radius on images within cards (flush to card edges), 16:10 or 1:1 aspect ratios.
- **Avatar Circles:** 32-64px diameter, `rounded-full`. Story avatars have 3px gradient ring (coral-to-violet linear gradient) with a 2px #121212 gap ring inside.
- **Pill Chips/Tags:** 20px radius (pill-shaped), 8px vertical / 12px horizontal padding, colored background at full or 15% opacity.
- **Bottom Sheet:** 16px top radius, #1A1A2E background, drag handle indicator (36px wide, 4px tall, #3A3A4E, rounded-full).
- **Inputs/Search:** Pill-shaped (24px radius), #1A1A2E background, no border, muted gray placeholder, white typed text. Focus: 1px coral border.
- **Star Ratings:** Coral (#FF6B6B) filled stars, gray (#3A3A4E) empty stars, 14px size.
- **Navigation Bar:** #1A1A2E background, 64px height. Active: coral icon + label. Inactive: muted gray. Center "+" FAB: 48px coral circle, elevated.
- **Tab Bars:** #1A1A2E background, 48px height. Active: white text + 3px coral bottom underline. Inactive: muted gray text.

## 5. Layout Principles

- **Max content width:** Full device width (mobile-first, no max-width constraint)
- **Grid:** 3-column square photo grid (2px gaps) for profile/explore galleries. Single-column card feed for posts.
- **Base spacing unit:** 8px. Padding: 16px horizontal page margins, 24px for sheets/modals.
- **Section margins:** 24px between major sections, 8px between cards in a feed.
- **Touch targets:** Minimum 44px height for all interactive elements. Navigation items: 48px. Action sheet rows: 56px.
- **Stories bar:** Horizontal scroll, 64px avatars, 12px gaps, 96px total row height.
- **Scroll behavior:** Vertical scroll with sticky header (56px) and sticky bottom nav (64px). Content scrolls between them.
- **Safe areas:** Bottom nav accounts for device home indicator (additional 20px on notched devices).
- **Photo aspect ratios:** 16:10 for feed posts, 1:1 for grid tiles, 16:9 for hero images.
- **Bottom sheet:** Content-driven height, max 85% screen height, scrim overlay at 60% black opacity.

## 6. Design System Notes for Stitch Generation

When creating new screens for the PetBase Social-First Feed redesign, include this block at the top of every Stitch prompt:

```
DESIGN SYSTEM:
- Platform: Mobile
- Theme: Dark
- Background: Near-black (#121212)
- Surface: Deep dark navy (#1A1A2E) for cards, sheets, inputs, nav bars
- Primary accent: Coral (#FF6B6B) — CTAs, active states, reactions, love
- Secondary accent: Electric Teal (#4ECDC4) — health data, ratings, links, tags
- Tertiary accent: Vivid Violet (#7C5CFC) — gradient rings, badges, decorative flair
- Text: Pure white (#FFFFFF) primary, muted stone (#9CA3AF) secondary
- Font: DM Sans — 28px/700 display, 20px/700 sections, 15px/600 card titles, 14px/400 body, 12px/400 captions
- Buttons: 12px radius, coral filled primary, ghost secondary
- Cards: 12px radius, #1A1A2E, no border, flat
- Avatars: rounded-full, gradient ring (coral to violet) for stories
- Photos: edge-to-edge, no borders, full-bleed
- Touch targets: 44px minimum
- Bottom nav: 5 tabs (Feed, Explore, +, Inbox, Profile), coral active state, center FAB
- Atmosphere: Bold, immersive, Instagram-for-pets. Cinematic dark canvas, vivid accent pops, photography-first.
```

- **Atmosphere:** "Bold, immersive social-first dark experience. Cinematic dark canvas for vivid photography and pulsing accent colors. Energetic and youthful, premium photo magazine for pets."
- **Colors:** Always reference by descriptive name + hex. Coral Flame (#FF6B6B), Electric Teal (#4ECDC4), Vivid Violet (#7C5CFC).
- **Shape:** "Gently rounded corners (12px) on cards and buttons. Pill-shaped (24px) on chips, tags, and search inputs. Circular avatars with gradient border rings."
- **Spacing:** "Comfortable density — generous touch targets (44px+), 16px page margins, 8px base unit. Photography gets maximum space. Feed breathes."
- **Font:** DM Sans — geometric, modern, highly legible. Bold weights (600-700) for social emphasis. Clean at small caption sizes.

## 7. Variant Generation Notes

For Screen 1 (Social Feed) variants with `generate_variants`:
- **Creativity level:** 0.7 (EXPLORE range — fresh takes without losing brand identity)
- **Recommended aspects:** LAYOUT, COLOR_SCHEME
- This explores alternative feed structures (e.g., card-based vs. edge-to-edge, timeline vs. masonry) while keeping the dark social aesthetic.
