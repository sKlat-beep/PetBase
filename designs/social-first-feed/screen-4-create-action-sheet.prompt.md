# Screen 4: Create Action Sheet — Stitch Generation Prompt

Copy-paste this into Stitch `generate_screen_from_text` or stitch.withgoogle.com.

## Stitch Settings

- **Font:** DM_SANS
- **Roundness:** Medium
- **Color Mode:** Dark
- **Custom Color:** #FF6B6B

## Prompt

```
Mobile High-Fidelity create action sheet overlay for PetBase, a privacy-first pet social platform. Bold, high-contrast, immersive dark aesthetic. This is a bottom sheet modal that appears when the user taps the "+" FAB button on the bottom nav. It presents creation actions — posting, health logging, card sharing, and check-ins.

DESIGN SYSTEM:
- Platform: Mobile
- Theme: Dark
- Background: Near-black (#121212) with dimmed overlay scrim
- Surface: Deep dark navy (#1A1A2E) for the bottom sheet
- Primary accent: Coral (#FF6B6B) for the primary action highlight
- Secondary accent: Electric blue (#4ECDC4) for secondary action icons
- Tertiary accent: Violet (#7C5CFC) for tertiary action icons
- Text primary: Pure white (#FFFFFF)
- Text secondary: Muted gray (#9CA3AF)
- Font: DM Sans — 18px/600 action titles, 13px/400 action descriptions, 14px/500 sheet header
- Touch targets: minimum 56px per action row
- Sheet: 16px top-left and top-right radius, no bottom radius (flush to screen bottom)

LAYOUT:
Full-screen overlay. Dimmed background showing the feed screen behind at 40% opacity. Bottom sheet sliding up from the screen bottom edge.

SECTIONS:

1. **Scrim / Dimmed Background:** The social feed screen is visible behind the sheet but dimmed to 40% opacity with a dark overlay (#000000 at 60% opacity). Feed content (stories bar, posts) is blurred slightly and non-interactive. This communicates modality.

2. **Bottom Sheet Container:** Slides up from the bottom of the screen. Background: #1A1A2E. Top corners: 16px radius. Width: full screen width. Height: auto (content-driven, approximately 420px). Top center: a small drag handle indicator — 36px wide, 4px tall, rounded-full, #3A3A4E color, 8px from top edge.

3. **Sheet Header:** "Create" in white 18px/700 DM Sans, left-aligned with 24px horizontal padding, 16px below the drag handle. Right side: "X" close button icon in muted gray, 40px touch target.

4. **Action List (vertical stack, 56px per row):** Five action rows, each with: left icon (24px, in a 40px circular background), title text, subtitle description, and a right chevron arrow in muted gray. 24px horizontal padding, 8px vertical gap between rows.

   - **Row 1 (Primary — highlighted):** Coral (#FF6B6B) circular icon background with white camera icon. Title: "New Post" in white 16px/600. Subtitle: "Share a photo or video of your pet" in gray 13px/400. This row has a subtle coral tint on the background (#FF6B6B at 8% opacity) to indicate it's the primary action.

   - **Row 2:** Electric blue (#4ECDC4) circular icon background with white clipboard/checklist icon. Title: "Log Health Event" in white 16px/600. Subtitle: "Record weight, mood, vet visit, or medication" in gray 13px/400.

   - **Row 3:** Violet (#7C5CFC) circular icon background with white card/badge icon. Title: "Share Pet Card" in white 16px/600. Subtitle: "Generate a shareable profile card for Max" in gray 13px/400.

   - **Row 4:** Electric blue (#4ECDC4) circular icon background with white map-pin icon. Title: "Check In" in white 16px/600. Subtitle: "Tag your location at a park, vet, or groomer" in gray 13px/400.

   - **Row 5:** Muted gray (#6B7280) circular icon background with white pencil/edit icon. Title: "Write Update" in white 16px/600. Subtitle: "Post a text update to your followers" in gray 13px/400.

5. **Bottom Safe Area:** 24px padding below the last action row, plus safe area inset for devices with home indicators. Background continues as #1A1A2E.
```
