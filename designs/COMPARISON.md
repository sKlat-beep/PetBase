# PetBase Redesign: 3 Concept Comparison

## Status

All 3 concepts have been designed as **prompt-ready** specifications.
Each concept has: Design Spec JSON, Stitch-ready generation prompts, and a full DESIGN.md.

To generate actual Stitch screens, paste the prompts into [stitch.withgoogle.com](https://stitch.withgoogle.com) and apply the theme settings listed in each concept's stitch-prompts.md file.

---

## Side-by-Side Comparison

| Dimension | 1. Pet-Centric Hub | 2. Social-First Feed | 3. Minimal Command Center |
|-----------|-------------------|---------------------|--------------------------|
| **Theme** | Light, warm | Dark, immersive | Light, minimal |
| **Primary Color** | Terracotta #C4654A | Coral #FF6B6B | Indigo #4F46E5 |
| **Font** | Nunito Sans | DM Sans | Inter |
| **Roundness** | High (16-20px) | Medium (12px) | Low (6px) |
| **Density** | Comfortable | Comfortable | Compact |
| **Device Focus** | Mobile-first | Mobile-first | Desktop-first |
| **Navigation** | Pet switcher + bottom nav | 5-tab bottom nav (Instagram) | Horizontal top nav + split pane |
| **IA Paradigm** | Pet = world (each pet has sub-tabs) | Feed-centric (social stream) | Dashboard (all pets at a glance) |
| **Visual Metaphor** | Cozy pet journal | Premium photo magazine | Apple Health + Linear |
| **Screens** | 4 | 4 | 4 |

---

## Concept 1: Pet-Centric Hub

**Files:** `designs/pet-centric-hub/`

**Atmosphere:** Warm artisanal sanctuary with pet-forward organic warmth. Earth-tone palette of terracotta, sage, and warm sand. Photo-forward, generous breathing room, pillow-soft card edges.

**Palette:**
- Terracotta Clay (#C4654A) - primary accent, CTAs
- Garden Sage (#8B9E7E) - health-positive states
- Warm Sand (#E8D5B7) - elevated surfaces
- Morning Cream (#FFF8F0) - page canvas
- Kiln Charcoal (#2D2926) - text

**Screens:**
1. Pet Overview - avatar hero, health mini-cards, activity timeline
2. Health Dashboard - weight chart, mood calendar, vaccine countdown, medication toggles
3. Pet Switcher + Home - horizontal swipeable pet cards, selected pet world
4. Mobile Pet Profile - hero photo, story rings, stacked sections

**Who it serves:** Pet owners who think "pet-first" - they open the app thinking about Max or Luna, not about features. Especially good for multi-pet households.

**Tradeoffs:**
- (+) Intuitive mental model matching how owners think
- (+) Reduces navigation depth for pet-specific tasks
- (-) Community/messaging features feel secondary
- (-) Cross-pet views need dedicated aggregation

---

## Concept 2: Social-First Feed

**Files:** `designs/social-first-feed/`

**Atmosphere:** Bold, immersive dark experience. Cinematic near-black canvases create a stage for vivid photography and pulsing accent colors. Energetic, youthful, premium photo magazine for pets.

**Palette:**
- Coral Flame (#FF6B6B) - primary accent, love/urgency
- Electric Teal (#4ECDC4) - health data, ratings, links
- Vivid Violet (#7C5CFC) - gradient rings, decorative flair
- Void Black (#121212) - page background
- Midnight Navy (#1A1A2E) - card surfaces

**Screens:**
1. Social Feed - stories bar, unified post feed with paw-print reactions
2. Explore/Discover - trending groups, nearby services, popular pets grid
3. Pet Profile - hero photo, stats row, Instagram-style photo grid
4. Create Action Sheet - bottom sheet with quick actions

**Who it serves:** Social pet owners who want to share, connect, and discover. People who already use Instagram for pet photos but want integrated health tracking.

**Tradeoffs:**
- (+) Highly engaging daily-use experience
- (+) Community and social features shine
- (+) Familiar mental model (Instagram/TikTok)
- (-) Health management feels tucked away
- (-) Power features (cards, household, E2EE) harder to discover
- (-) Risk of feeling "less serious" for medical record keeping

---

## Concept 3: Minimal Command Center

**Files:** `designs/minimal-command-center/`

**Atmosphere:** High-density command center with gallery-level restraint. Information-first, every pixel earns its place. Premium through negative space, precise alignment, typographic hierarchy by weight. No decoration, no gradients, no glassmorphism.

**Palette:**
- Pure White (#FFFFFF) - page background
- Soft Gray (#F7F7F8) - card surfaces
- Indigo Accent (#4F46E5) - all interactive elements
- Danger Red (#EF4444) - overdue alerts
- Warning Amber (#F59E0B) - upcoming alerts
- Success Green (#10B981) - healthy status

**Screens:**
1. Unified Dashboard - alerts, today tasks, per-pet health cards with sparklines
2. Pet Detail (Split Pane) - pet list sidebar + detail panel with charts
3. Messages (Split Pane) - thread list + conversation side-by-side
4. Mobile Dashboard - stacked cards, floating action bar

**Who it serves:** Organized, efficiency-minded pet owners. Multi-pet households needing at-a-glance status. Power users who find glass aesthetic "too much."

**Tradeoffs:**
- (+) Maximum information density
- (+) Fast, scannable, productivity-focused
- (+) Scales well for 5+ pets
- (-) Less emotionally engaging, may feel "clinical"
- (-) Social/community features feel utilitarian
- (-) Photos and pet personality de-emphasized

---

## Recommendation

| If you want... | Choose... |
|----------------|-----------|
| Maximum emotional connection to pets | **Pet-Centric Hub** |
| Daily engagement and social growth | **Social-First Feed** |
| Efficiency and multi-pet management | **Minimal Command Center** |
| Hybrid approach | Mix Pet-Centric Hub's IA with Command Center's density |

**Next step:** Paste prompts into [stitch.withgoogle.com](https://stitch.withgoogle.com) to generate actual high-fidelity screens, then evaluate visually.
