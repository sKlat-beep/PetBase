# Stitch Generation Prompts — PetBase Concept 3: Minimal Command Center

These prompts are ready to paste into [stitch.withgoogle.com](https://stitch.withgoogle.com).

**Project name:** `PetBase Redesign — Minimal Command Center`

---

## Screen 1: Unified Dashboard

```
Desktop High-Fidelity unified dashboard for PetBase, a privacy-first pet health and community platform. Minimal, precise, information-dense, professional aesthetic. Light mode. Background: Pure white (#FFFFFF). Surface: Soft gray (#F7F7F8). Borders: Light gray (#E5E5E7). Primary accent: Indigo (#4F46E5). Danger: Red (#EF4444). Warning: Amber (#F59E0B). Success: Green (#10B981). Font: Inter. Clean, data-forward command center — Apple Health meets Linear. No glassmorphism. Flat surfaces, subtle 1px borders (#E5E5E7), minimal box-shadow (0 1px 2px rgba(0,0,0,0.05)). Corner radius: 6px on all containers. Dense but breathable with precise 8px-based spacing.

Top: compact horizontal navigation bar (height 56px, white background, 1px bottom border #E5E5E7). Left: "PetBase" wordmark logo in Inter 600 weight, #1D1D1F. Center: tab navigation — Home (active, indigo #4F46E5 text with 2px bottom indigo border), Pets, Community, Messages, More — in Inter 14px/500, #6B7280 default. Right: notification bell icon with small red (#EF4444) circular badge showing "3", 32px circular user avatar.

Main content area (max-width 1200px, centered, 24px horizontal padding). First section: alert banner area with two compact alert cards side by side. Left card: red left border (3px #EF4444), white background, 6px radius — icon, "Overdue: Max's rabies vaccine (2 days ago)" in Inter 14px/500 #1D1D1F, small "Schedule now" link in indigo. Right card: amber left border (3px #F59E0B), same styling — "Upcoming: Luna's annual checkup (5 days)" with "View details" link.

Second section: "Today" header in Inter 13px/600 uppercase tracking-wide #6B7280, followed by a clean task list. Each row: checkbox (unchecked, 6px radius border), task text in Inter 14px/400 #1D1D1F, time in #6B7280 on the right. Tasks: "Vet visit — Max @ Downtown Animal Clinic" at "2:30 PM", "Evening medication — Luna's joint supplement" at "7:00 PM", "Weigh-in — Record Buddy's weekly weight" at "8:00 PM".

Third section: "Health Snapshot" header same style. Horizontal row of 3 pet mini-cards (equal width, 6px radius, 1px #E5E5E7 border, white background). Card 1: 28px circular avatar placeholder, "Max" in Inter 14px/600, "Golden Retriever" in 12px/400 #6B7280, mini sparkline chart (indigo line, 60px wide, showing slight upward weight trend), green status dot with "Healthy" label. Card 2: "Luna" / "Siamese Cat" / sparkline (flat trend) / amber dot "Checkup due". Card 3: "Buddy" / "Labrador" / sparkline (downward trend) / green dot "Healthy".

Fourth section: "Recent Activity" header. Compact timeline list, each entry: small gray dot (6px), activity text in Inter 13px/400 #1D1D1F, relative timestamp in #6B7280 right-aligned. Entries: "Max's weight recorded: 68.2 lbs" — "2 hours ago", "Luna's flea medication administered" — "Yesterday", "Buddy added to Seattle Dog Owners group" — "2 days ago", "Vaccination record uploaded for Max" — "3 days ago".
```

---

## Screen 2: Pet Detail (Split Pane)

```
Desktop High-Fidelity pet detail screen with split-pane layout (1440px wide) for PetBase, a privacy-first pet health platform. Minimal, precise, information-dense, professional aesthetic. Light mode. Background: Pure white (#FFFFFF). Surface: Soft gray (#F7F7F8). Borders: Light gray (#E5E5E7). Primary accent: Indigo (#4F46E5). Font: Inter. Flat surfaces, 1px borders, minimal shadows. Corner radius: 6px. Dense 8px-based spacing. No glassmorphism.

Left panel (width 320px, full viewport height, white background, 1px right border #E5E5E7). Top: "Pets" header in Inter 16px/600 #1D1D1F with a "+" add button (indigo ghost icon button) right-aligned, 16px padding. Below: vertical list of pet rows. Each row: 16px vertical padding, 16px horizontal padding. Content: 36px circular avatar, pet name in Inter 14px/500 #1D1D1F, breed in Inter 12px/400 #6B7280, and a small status dot (8px) on the far right. Rows: "Max" / "Golden Retriever" / green dot (selected — has 3px indigo #4F46E5 left border, background #F7F7F8), "Luna" / "Siamese Cat" / amber dot, "Buddy" / "Labrador Mix" / green dot, "Pepper" / "Border Collie" / green dot. Hover state: #F7F7F8 background.

Right panel (width 1120px, white background). Top section (64px height, 24px padding, 1px bottom border): "Max" in Inter 20px/600 #1D1D1F, inline "Golden Retriever, 4 years old" in Inter 14px/400 #6B7280. Right side: "Edit" ghost button (indigo text, 6px radius, 1px indigo border) and "Share Card" primary button (indigo #4F46E5 background, white text, 6px radius).

Tab bar below: 4 tabs — Overview (active, indigo text, 2px bottom indigo border), Health, Records, Cards — in Inter 14px/500, #6B7280 inactive, 1px bottom border #E5E5E7 full width.

Overview tab content (24px padding). Top: 4-column stat row, each stat in a compact card (1px border #E5E5E7, 6px radius, 16px padding). Stat 1: "Weight" label in Inter 12px/500 #6B7280, "68.2 lbs" value in Inter 20px/600 #1D1D1F, small green upward arrow with "+0.4" in Inter 12px/400 #10B981. Stat 2: "Next Vaccine" / "Mar 25" / "Rabies booster" subtext in #6B7280. Stat 3: "Mood" / "Happy" with a subtle smile indicator. Stat 4: "Medications" / "2 active" / "View all" link in indigo.

Below stats: "Weight Trend" section. Clean line chart (full width, 280px height, white background, 1px border, 6px radius). X-axis: months (Oct, Nov, Dec, Jan, Feb, Mar) in Inter 11px #6B7280. Y-axis: weight in lbs (64-70 range). Single indigo (#4F46E5) line showing gradual increase from 66.8 to 68.2. Light gray (#F7F7F8) grid lines. No fill under line.

Below chart: "Recent Health Log" table. Header row: Date, Type, Notes, Recorded By — in Inter 12px/600 #6B7280 uppercase, 1px bottom border. Data rows in Inter 13px/400 #1D1D1F: "Mar 15" / "Weight" / "68.2 lbs — post-walk" / "You", "Mar 10" / "Medication" / "Heartworm preventive administered" / "You", "Mar 3" / "Vet Visit" / "Annual checkup — all clear" / "Dr. Patel", "Feb 28" / "Vaccine" / "Bordetella booster" / "Downtown Animal Clinic".
```

---

## Screen 3: Messages (Split Pane)

```
Desktop High-Fidelity messaging screen with split-pane layout (1440px wide) for PetBase, a privacy-first pet health platform. Minimal, precise, information-dense, professional aesthetic. Light mode. Background: Pure white (#FFFFFF). Surface: Soft gray (#F7F7F8). Borders: Light gray (#E5E5E7). Primary accent: Indigo (#4F46E5). Font: Inter. Flat surfaces, 1px borders, minimal shadows. Corner radius: 6px. Dense 8px-based spacing. No glassmorphism. End-to-end encrypted messaging indicated by a small lock icon.

Left panel (width 360px, full viewport height, white background, 1px right border #E5E5E7). Top: "Messages" header in Inter 16px/600 #1D1D1F, compose new message icon button (indigo) right-aligned, 16px padding, 1px bottom border. Search input below: light gray (#F7F7F8) background, placeholder "Search conversations" in Inter 13px/400 #6B7280, 6px radius, 12px padding.

Thread list below. Each thread row: 16px padding, 1px bottom border #E5E5E7. Content: 40px circular avatar, name in Inter 14px/500 #1D1D1F, last message preview in Inter 13px/400 #6B7280 (single line, truncated with ellipsis), timestamp in Inter 11px/400 #6B7280 top-right. Thread 1 (selected — #F7F7F8 background, indigo left border 3px): "Sarah" avatar, "Sarah (about Max)", preview "That's great news about his checkup!", "2:15 PM". Thread 2: group avatar, "Seattle Dog Owners", preview "Anyone know a good groomer near Capitol Hill?", "Yesterday", blue unread badge "4". Thread 3: "Dr. Patel (Vet)", preview "Max's lab results are ready for pickup", "Mon", blue unread badge "1". Thread 4: "Emma (Pet Sitter)", preview "Confirmed for this Saturday, 9 AM", "Mar 12".

Right panel (width 1080px). Top bar (64px height, 16px padding, 1px bottom border #E5E5E7): "Sarah (about Max)" in Inter 16px/600 #1D1D1F, small green online dot (8px), "Active now" in Inter 12px/400 #6B7280. Right side: phone icon button, search icon button, more options (three-dot) icon button — all in #6B7280, hover indigo.

Message area (flex-grow, 24px padding, #FFFFFF background, vertical scroll). Messages with 8px vertical gap. Received message: left-aligned, light gray (#F7F7F8) bubble with 12px radius (sharper on bottom-left), #1D1D1F text in Inter 14px/400, timestamp below bubble in Inter 11px #6B7280. Sent message: right-aligned, indigo (#4F46E5) bubble with 12px radius (sharper on bottom-right), white text.

Conversation flow: Received "Hey! How did Max's vet appointment go yesterday?" at "1:45 PM". Sent "It went really well! Dr. Patel said he's in great shape. Weight is up slightly but within healthy range." at "1:52 PM". Received "That's great news about his checkup! Did they do the rabies booster?" at "2:05 PM". Sent "Not yet — it's scheduled for next week. They did the bordetella one though." at "2:10 PM". Received "Perfect. Want to do a park playdate this weekend? Bella would love to see Max" at "2:15 PM".

Input bar at bottom (72px height, 16px padding, 1px top border #E5E5E7, white background): attachment paperclip icon button left (#6B7280), text input field (flex-grow, #F7F7F8 background, 6px radius, placeholder "Type a message..." in Inter 14px), indigo send arrow button right (32px circle, #4F46E5 background, white arrow icon).
```

---

## Screen 4: Mobile Dashboard

```
Mobile High-Fidelity dashboard screen (375px width, 812px height) for PetBase, a privacy-first pet health and community platform. Minimal, precise, information-dense, professional aesthetic. Light mode. Background: Pure white (#FFFFFF). Surface: Soft gray (#F7F7F8). Borders: Light gray (#E5E5E7). Primary accent: Indigo (#4F46E5). Danger: Red (#EF4444). Warning: Amber (#F59E0B). Font: Inter. Flat surfaces, 1px borders, minimal shadows. Corner radius: 6px. Dense but mobile-optimized spacing. No glassmorphism. Scannable and information-dense.

Status bar: standard iOS status bar (time, signal, battery). Top navigation bar (52px height, white background, 1px bottom border #E5E5E7): "PetBase" wordmark left in Inter 18px/600 #1D1D1F, notification bell icon right with red badge "3" (#EF4444).

Scrollable content area (16px horizontal padding). First: alert card — white background, red left border (3px #EF4444), 6px radius, 12px padding. Red exclamation icon, "Overdue: Max's rabies vaccine" in Inter 14px/500 #1D1D1F, "2 days overdue" in Inter 12px/400 #EF4444, "Schedule now" right-aligned link in indigo. Below: amber alert card same structure — amber left border (#F59E0B), "Upcoming: Luna's annual checkup" / "In 5 days".

Second section: "Today" label in Inter 12px/600 uppercase tracking-wide #6B7280, 12px top margin. Task checklist: compact rows with 44px touch height. Each: circular checkbox (18px, #E5E5E7 border), task text Inter 14px/400 #1D1D1F, time right in #6B7280. "Vet visit — Max" / "2:30 PM". "Medication — Luna" / "7:00 PM". "Weigh-in — Buddy" / "8:00 PM".

Third section: "Your Pets" label same style. Stacked pet cards (full width, 1px border #E5E5E7, 6px radius, white background, 12px padding, 8px gap between cards). Each card: left 36px avatar, center column with name Inter 14px/600 #1D1D1F and breed Inter 12px/400 #6B7280, right side: mini sparkline (48px wide, indigo line) and status dot. Card 1: Max avatar, "Max" / "Golden Retriever", upward sparkline, green dot. Card 2: Luna, "Luna" / "Siamese Cat", flat sparkline, amber dot. Card 3: Buddy, "Buddy" / "Labrador Mix", slight downward sparkline, green dot.

Fourth section: "Recent" label. Compact activity list, 3 entries: gray dot (4px), text Inter 13px/400, timestamp right #6B7280. "Max weighed: 68.2 lbs" — "2h ago". "Luna medication given" — "Yesterday". "Buddy joined group" — "2d ago".

Fixed bottom floating action bar: 64px from bottom, centered, auto-width (fits content + 24px padding each side), white background, 1px border #E5E5E7, 24px radius (pill shape), subtle shadow (0 2px 8px rgba(0,0,0,0.08)). Three icon buttons with labels: "Add Pet" (plus icon), "Log Event" (pencil icon), "Find Vet" (map pin icon) — all in Inter 11px/500 #6B7280, icons 20px, indigo on tap. 24px gap between buttons.
```

---

## Variant Generation Notes

After generating Screen 1 (Unified Dashboard), generate 2 variants using `generate_variants`:
- **Creativity level:** 0.7 (EXPLORE)
- **Aspects to vary:** LAYOUT, COLOR_SCHEME
- This produces alternative dashboard arrangements while keeping the Minimal Command Center identity.

---

## Usage Instructions

1. Go to [stitch.withgoogle.com](https://stitch.withgoogle.com)
2. Create a new project titled "PetBase Redesign — Minimal Command Center"
3. Apply theme: Font **Inter**, Roundness **Low**, Color **#4F46E5** (Indigo), Mode **Light**
4. Paste each prompt block into the text generation field
5. Use the Variants feature on the dashboard screen with Explore creativity
