# Design System: PetBase Redesign — Minimal Command Center
**Concept:** 3 of 3
**Device:** DESKTOP (with mobile-responsive variant)

## 1. Visual Theme & Atmosphere

High-density command center with gallery-level restraint — information-first, every pixel earns its place. The aesthetic is Apple Health crossed with Linear: monochrome surfaces with a single indigo accent that marks every interactive element. Premium feel achieved through negative space, precise alignment, and typographic hierarchy by weight rather than size. No decoration, no gradients, no glassmorphism — just clean data on clean surfaces with razor-thin 1px borders.

## 2. Color Palette & Roles

- **Pure White** (#FFFFFF) — Page background, primary canvas, message bubbles (sent context)
- **Soft Gray Surface** (#F7F7F8) — Card backgrounds, input fields, hover states, secondary surfaces
- **Light Gray Border** (#E5E5E7) — All borders (1px), dividers, inactive checkboxes, separators
- **Muted Gray Text** (#6B7280) — Secondary text, labels, timestamps, metadata, inactive navigation
- **Near-Black** (#1D1D1F) — Primary text, headings, pet names, navigation active items
- **Indigo Accent** (#4F46E5) — Primary actions, active tabs, sent message bubbles, links, CTAs, selected state borders
- **Danger Red** (#EF4444) — Overdue alerts, error states, critical badges
- **Warning Amber** (#F59E0B) — Upcoming alerts, attention-needed status indicators
- **Success Green** (#10B981) — Healthy status dots, positive trends, confirmation states

## 3. Typography Rules

**Primary Font:** Inter — neutral, highly legible at small sizes, designed for screens. Hierarchy expressed through weight, not size.

- **Display (H1):** Inter 600 weight, 20-24px — used sparingly (pet names in detail view, page titles)
- **Section Headers (H2):** Inter 600 weight, 16px — panel titles ("Messages", "Pets")
- **Section Labels:** Inter 600 weight, 12-13px, uppercase, tracking-wide (letter-spacing: 0.05em) — "TODAY", "HEALTH SNAPSHOT", "RECENT ACTIVITY"
- **Body:** Inter 400 weight, 14px, line-height 1.5 — primary content text, message text, task descriptions
- **Secondary/Meta:** Inter 400 weight, 12-13px — timestamps, breed names, status labels, captions
- **Buttons:** Inter 500 weight, 14px — both ghost and filled buttons
- **Navigation Tabs:** Inter 500 weight, 14px — inactive #6B7280, active #4F46E5 with 2px bottom border

## 4. Component Stylings

- **Primary Buttons:** 6px radius, indigo (#4F46E5) background, white text, 12px 16px padding; hover: darken to #4338CA
- **Ghost Buttons:** 6px radius, transparent background, 1px indigo border, indigo text; hover: #F7F7F8 background
- **Cards/Containers:** 6px radius, white (#FFFFFF) background, 1px solid #E5E5E7 border, shadow: 0 1px 2px rgba(0,0,0,0.05); hover: shadow 0 2px 4px rgba(0,0,0,0.08) on interactive cards
- **Alert Cards:** 6px radius, white background, 3px colored left border (red for danger, amber for warning), no additional shadow
- **Inputs/Forms:** 6px radius, #F7F7F8 background, 1px #E5E5E7 border, Inter 14px placeholder in #6B7280; focus: 1px #4F46E5 border, subtle indigo ring (0 0 0 2px rgba(79,70,229,0.15))
- **Checkboxes:** 18px, 6px radius, #E5E5E7 border; checked: #4F46E5 fill with white checkmark
- **Status Dots:** 8px circles — green (#10B981), amber (#F59E0B), red (#EF4444)
- **Sparkline Charts:** Indigo (#4F46E5) stroke, 1.5px line width, no fill, no axes, 48-60px width inline
- **Message Bubbles:** 12px radius (sharper on sender's corner), sent: #4F46E5 bg + white text, received: #F7F7F8 bg + #1D1D1F text
- **Tabs:** No background, Inter 14px/500, inactive #6B7280, active #4F46E5 with 2px bottom indigo border, 1px full-width bottom border #E5E5E7
- **Badges:** Circular, red (#EF4444) background, white text, 12px font, min-width 18px

## 5. Layout Principles

- **Max content width:** 1200px centered (dashboard), 1440px full-bleed (split-pane views)
- **Split-pane pattern:** Fixed-width left panel (320-360px) with 1px right border, fluid right panel. Left panel scrolls independently.
- **Base spacing unit:** 8px. All margins and padding are multiples of 4px or 8px.
- **Section margins:** 24px between major sections, 16px between subsections, 8px between list items
- **Horizontal padding:** 24px desktop, 16px mobile
- **Navigation height:** 56px desktop, 52px mobile
- **Touch targets:** 44px minimum height on mobile, 36px on desktop
- **Mobile breakpoint:** 375px width, stacked single-column layout, floating action bar at bottom
- **Grid:** No explicit column grid — content flows with flex/auto layout within constrained widths

## 6. Design System Notes for Stitch Generation

When creating new screens for PetBase Concept 3:

- **Atmosphere:** "High-density command center with gallery-level restraint. Information-first, every pixel earns its place. Apple Health meets Linear. Premium through negative space, precise alignment, typographic hierarchy by weight."
- **Colors:** Pure White (#FFFFFF) background, Soft Gray (#F7F7F8) surfaces, Light Gray (#E5E5E7) borders, Muted Gray (#6B7280) secondary text, Near-Black (#1D1D1F) primary text, Indigo (#4F46E5) accent, Red (#EF4444) danger, Amber (#F59E0B) warning, Green (#10B981) success.
- **Shape:** "6px radius on all containers and buttons. 1px solid #E5E5E7 borders everywhere. Shadow: 0 1px 2px rgba(0,0,0,0.05) — barely there. No glassmorphism, no gradients. Alert cards use 3px colored left border."
- **Spacing:** "Dense 8px-based grid. 24px between major sections, 16px sub-sections, 8px items. Breathable despite density — whitespace is deliberate, not generous."
- **Typography:** Inter — hierarchy by weight (600 headers, 500 interactive, 400 body, uppercase 600 for labels). Sizes stay compact: 20px max heading, 14px body, 12px meta.
- **Interaction patterns:** "Split-pane navigation (Linear/Notion model). Selected items get indigo left border + gray background. Active tabs get 2px bottom indigo border. Hover states are subtle (#F7F7F8 bg shift)."
- **Data visualization:** "Inline sparklines (indigo stroke, no fill, 48-60px). Full charts use indigo line on light gray grid. Status dots (8px, green/amber/red) next to every entity."

## 7. Screen Inventory

| # | Screen Name | Device | Layout | Key Components |
|---|-------------|--------|--------|----------------|
| 1 | Unified Dashboard | Desktop | Single-column, 1200px | Nav bar, alert cards, task list, pet health cards with sparklines, activity timeline |
| 2 | Pet Detail | Desktop | Split-pane, 320+1120px | Pet list sidebar, stat cards, weight trend chart, health log table, tabbed interface |
| 3 | Messages | Desktop | Split-pane, 360+1080px | Thread list, conversation view, message bubbles, input bar with attachment |
| 4 | Mobile Dashboard | Mobile 375px | Stacked cards | Compact nav, stacked alerts, task checklist, pet cards, floating action bar |
