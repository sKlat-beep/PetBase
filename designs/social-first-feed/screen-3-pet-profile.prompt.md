# Screen 3: Pet Profile — Stitch Generation Prompt

Copy-paste this into Stitch `generate_screen_from_text` or stitch.withgoogle.com.

## Stitch Settings

- **Font:** DM_SANS
- **Roundness:** Medium
- **Color Mode:** Dark
- **Custom Color:** #FF6B6B

## Prompt

```
Mobile High-Fidelity pet profile screen for PetBase, a privacy-first pet social platform. Bold, high-contrast, immersive dark aesthetic. This is a pet's social profile page — part Instagram profile, part health dashboard. The pet IS the social identity. Photography-forward with a hero image and grid gallery.

DESIGN SYSTEM:
- Platform: Mobile
- Theme: Dark
- Background: Near-black (#121212)
- Surface: Deep dark navy (#1A1A2E) for cards and tabs
- Primary accent: Coral (#FF6B6B) for CTAs and active states
- Secondary accent: Electric blue (#4ECDC4) for health data and links
- Tertiary accent: Violet (#7C5CFC) for badges and decorative elements
- Text primary: Pure white (#FFFFFF)
- Text secondary: Muted gray (#9CA3AF)
- Font: DM Sans — 28px/700 display name, 20px/600 section headers, 14px/400 body, 12px/400 captions
- Cards: 12px radius, #1A1A2E background
- Touch targets: minimum 44px

LAYOUT:
Vertical scroll profile page. Full-width hero image at top. Profile info below. Tab bar. Content grid. Sticky bottom navigation.

SECTIONS:

1. **Hero Image (full-width, 280px tall):** Edge-to-edge photo of a golden retriever in golden hour light, looking at camera with a happy expression. Bottom gradient overlay (transparent to #121212) so text below blends seamlessly. Top-left: back arrow icon button (white, 40px touch target). Top-right: share icon and three-dot overflow menu icon (white, 40px each).

2. **Profile Info Section (below hero, overlapping slightly):** Pet name: "Max" in white 28px/700 DM Sans. Below: "Golden Retriever" bullet "4 yrs" bullet "Seattle, WA" in muted gray (#9CA3AF) 14px/400. Below: bio text "Living my best life. Park enthusiast, treat connoisseur, professional napper." in white 14px/400. Owner line: "Family: @MaxsFamily" in electric blue (#4ECDC4) 13px as a tappable link.

3. **Stats Row (horizontal, centered):** Three stat columns evenly distributed. Each: large number in white 22px/700, label below in gray 12px/400. "234" / "followers", "89" / "posts", "12" / "groups". Subtle vertical dividers (#2A2A3E) between stats. Full-width, 64px tall.

4. **Action Buttons Row:** Two buttons side by side with 8px gap, full width minus 32px padding. Left: "Follow" primary button — coral (#FF6B6B) filled, white text 14px/600, 12px radius, 44px tall. Right: "Message" secondary button — #1A1A2E background, white text 14px/600, 1px border #3A3A4E, 12px radius, 44px tall.

5. **Tab Bar:** Four tabs spanning full width, equal widths. Tabs: "Posts" | "Health" | "Cards" | "About". "Posts" is active — white text 14px/600 with a coral (#FF6B6B) 3px bottom underline indicator. Inactive tabs: muted gray text 14px/400. Tab bar background: #1A1A2E. 48px tall.

6. **Posts Tab Content — Photo Grid (3-column, Instagram-style):** Square photo tiles in a 3-column grid with 2px gaps. 9 photos (3 rows). Photos: Max at the park, Max with a birthday hat, Max swimming, Max sleeping on a couch, Max with another dog, Max in a car window, Max at the vet (healthy checkup), Max with a toy, Max in snow. Each tile is exactly one-third screen width. Subtle dark overlay on hover/press showing a paw-heart icon and "24" reaction count in white.

7. **Share CTA (below grid):** Full-width coral (#FF6B6B) filled button, 48px tall, 12px radius, 32px horizontal margin. Text: "Share Max's Card" in white 15px/600. Subtle shadow for elevation.

8. **Bottom Navigation Bar (64px, sticky):** Feed (home, gray), Explore (compass, gray), "+" (coral FAB), Inbox (chat, gray), Profile (person, coral active state).
```
