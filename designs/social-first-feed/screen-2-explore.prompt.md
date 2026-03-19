# Screen 2: Explore / Discover — Stitch Generation Prompt

Copy-paste this into Stitch `generate_screen_from_text` or stitch.withgoogle.com.

## Stitch Settings

- **Font:** DM_SANS
- **Roundness:** Medium
- **Color Mode:** Dark
- **Custom Color:** #FF6B6B

## Prompt

```
Mobile High-Fidelity explore and discovery screen for PetBase, a privacy-first pet social platform. Bold, high-contrast, immersive dark aesthetic. This screen is the discovery hub — search for pets, groups, services, and trending content. Instagram Explore-meets-Yelp for the pet world.

DESIGN SYSTEM:
- Platform: Mobile
- Theme: Dark
- Background: Near-black (#121212)
- Surface: Deep dark navy (#1A1A2E) for cards and inputs
- Primary accent: Coral (#FF6B6B) for highlights and active elements
- Secondary accent: Electric blue (#4ECDC4) for ratings, tags, and links
- Tertiary accent: Violet (#7C5CFC) for category badges and decorative elements
- Text primary: Pure white (#FFFFFF)
- Text secondary: Muted gray (#9CA3AF)
- Font: DM Sans — 24px/700 section headers, 16px/600 card titles, 14px/400 body, 12px/400 captions
- Cards: 12px radius, #1A1A2E background, no visible border
- Touch targets: minimum 44px

LAYOUT:
Vertical scroll page. Sticky top search bar (56px). Scrollable content sections below. Sticky bottom navigation bar (64px).

SECTIONS:

1. **Sticky Search Bar (56px):** Full-width search input on #1A1A2E surface with 24px radius (pill shape). Left: magnifying glass icon in muted gray. Placeholder text: "Find pets, groups, services..." in gray 14px. Right: filter/sliders icon button. Background of bar: #121212.

2. **Quick Filter Chips (horizontal scroll):** Row of pill-shaped filter chips below search: "Nearby" (coral filled, white text — active), "Dogs", "Cats", "Vets", "Groomers", "Groups", "Events". Inactive chips: #1A1A2E background, white text, 20px radius. 8px gaps. Horizontal scroll.

3. **Trending Groups Section:** Section header: "Trending Groups" in white 20px/700, "See all" link in electric blue (#4ECDC4) right-aligned. Horizontal scroll row of 3 group cards (160px wide, 200px tall, 12px radius). Each card: background photo (dimmed overlay), group name in white 14px/600 at bottom, member count "2.4k members" in gray 11px, and a category tag pill (violet #7C5CFC background for "Dogs", electric blue for "Cats", coral for "Exotic"). Groups: "Seattle Dog Owners" (park photo, Dogs tag), "Cat Lovers NYC" (cat cafe photo, Cats tag), "Reptile Keepers" (terrarium photo, Exotic tag).

4. **Nearby Services Section:** Section header: "Nearby Services" in white 20px/700, "Map view" link in electric blue right-aligned. Two horizontal cards (full width minus 16px padding, 88px tall, 12px radius, #1A1A2E background). Each card: left thumbnail (64px square, 8px radius), right content. Card 1: "Pawsitive Vet Clinic" in white 15px/600, "Veterinary • 0.8 mi" in gray 12px, star rating row (5 stars, 4.8 filled in coral, "128 reviews" in gray). Card 2: "Bark & Shine Grooming" in white 15px/600, "Grooming • 1.2 mi" in gray 12px, star rating 4.6 in coral, "89 reviews". Cards stacked vertically with 8px gap.

5. **Popular Pets Grid (Instagram-style):** Section header: "Popular Pets" in white 20px/700. 3-column square photo grid with 2px gaps. 9 photos total (3 rows). Photos of various pets: golden retriever close-up, orange tabby cat sleeping, French bulldog in costume, green parrot on shoulder, beagle puppy, white rabbit, husky in snow, calico kitten, corgi at beach. No visible borders. Each photo is a square tile filling exactly one-third of the screen width.

6. **Recommended for You Section:** Section header: "Suggested Friends" in white 20px/700. Horizontal scroll of profile suggestion cards (140px wide, 180px tall, 12px radius, #1A1A2E). Each card: circular pet avatar (56px) centered at top, pet name "Mochi" in white 14px/600, "Shiba Inu • Portland" in gray 11px, coral "Follow" pill button (full card width minus padding, 32px tall). Three cards: "Mochi" (Shiba Inu), "Pepper" (tabby cat), "Zeus" (Great Dane).

7. **Bottom Navigation Bar (64px, sticky):** Same as feed screen — Feed (home, gray), Explore (compass, coral active), "+" (coral FAB), Inbox (chat, gray), Profile (person, gray).
```
