# PetBase Design System

## Direction
Glass-inspired, modal-oriented, non-technical-user-first. Premium frosted-glass aesthetic with translucent surfaces, soft blur, depth-driven lighting, and generous whitespace.

## Surface Hierarchy

| Layer | Use Case | Classes |
|-------|----------|---------|
| Base | Page background | `bg-neutral-50 dark:bg-neutral-950` |
| Surface | Cards, panels | `bg-white/60 dark:bg-neutral-900/60 backdrop-blur-md border border-white/20 dark:border-white/10` |
| Elevated | Modals, dropdowns | `bg-white/75 dark:bg-neutral-900/75 backdrop-blur-xl border border-white/25 dark:border-white/15` |
| Overlay | Bottom sheets, toasts | `bg-white/90 dark:bg-neutral-900/90 backdrop-blur-2xl` |
| Backdrop | Modal dimming | `bg-black/40 backdrop-blur-sm` |

### Glass Rules
- `backdrop-filter` only on elevated elements — never root `<html>` or `<body>`
- Max 2 blurred layers in same z-axis region
- `will-change: transform` only during animation, remove via `onAnimationEnd`
- Mobile: reduce blur 25% (`backdrop-blur-lg` → `backdrop-blur-md`)
- `prefers-reduced-motion: reduce` → disable blur transitions, keep static surfaces

## Color Tokens

| Token | Light | Dark |
|-------|-------|------|
| Primary | `emerald-600` | `emerald-400` |
| Primary hover | `emerald-700` | `emerald-300` |
| Surface | `white/60` | `neutral-900/60` |
| Border (glass) | `white/20` | `white/10` |
| Border (structural) | `neutral-100` | `neutral-700` |
| Text primary | `neutral-900` | `neutral-100` |
| Text secondary | `neutral-500` | `neutral-400` |
| Text muted | `neutral-400` | `neutral-600` |
| Danger | `rose-600` | `rose-400` |
| Success | `emerald-500` | `emerald-400` |
| Warning | `amber-500` | `amber-400` |
| Info | `sky-500` | `sky-400` |
| Mood/Alt | `violet-500` | `violet-400` |

- No hardcoded hex colors — Tailwind scale or CSS vars only
- No `style={{ color: '...' }}` inline styles
- Exception: Recharts components require inline hex (use named constants: `CHART_EMERALD = '#10b981'`)

### Accent Color System
Six palettes available via `data-accent` attribute on `<html>`: `emerald` (default), `sky`, `violet`, `rose`, `amber`, `indigo`. CSS custom properties `--accent-50` through `--accent-700` are defined in `app/src/index.css` and switch automatically with the attribute. Use `var(--accent-*)` for accent-colored surfaces and text — never hardcode a single palette color.

### Semantic Color Map (extracted)
| Color | Semantic Use | Frequency |
|-------|-------------|-----------|
| Emerald | Primary CTA, success, active states | 567x |
| Neutral | Structural, text, borders | dominant |
| Rose | Danger, delete, alerts, love reactions | 159x |
| Amber | Warnings, notifications, cautions | 89x |
| Violet | Mood logs, alternative actions | 82x |
| Sky/Blue | Info, medical, vaccine status, focus ring | 68x |
| Orange | Lost pet alerts | 14x |

## Typography (extracted)

| Size | Frequency | Use |
|------|-----------|-----|
| `text-xs` | 405x | Meta info, timestamps, secondary text |
| `text-sm` | 319x | Body text, button labels, card content |
| `text-lg` | 33x | Section headers |
| `text-xl` | 16x | Modal titles, focus points |
| `text-2xl` | 6x | Page titles |

- Body: `text-sm` (14px) mobile, `text-base` (16px) desktop
- Headings: use weight (`font-semibold`, `font-bold`) not just size
- Labels: `text-xs font-medium tracking-wide text-neutral-500 dark:text-neutral-400 uppercase`
- Minimum `text-sm` for interactive elements
- The design is compact — 72% of typography is xs/sm

## Spacing (extracted)

### Padding
| Pattern | Frequency | Use |
|---------|-----------|-----|
| `px-3 py-2` | most common | Standard button/interactive element |
| `px-4 py-3` | secondary | Larger buttons, inputs |
| `p-4` / `p-5` | 91x / 29x | Card interiors |
| `p-3` | 37x | Dense lists |
| `p-6` | 31x | Modal headers/footers |

### Gap
| Class | Frequency | Use |
|-------|-----------|-----|
| `gap-2` | 187x | Standard flex layouts |
| `gap-1` | 135x | Compact spacing |
| `gap-3` | 80x | Comfortable spacing |
| `gap-4` | 23x | Wide spacing |

- Tailwind scale only — no arbitrary `px-[13px]`
- Base unit: 4px (Tailwind default)

## Border Radius (extracted)

| Class | Frequency | Use |
|-------|-----------|-----|
| `rounded-xl` | 250x | Primary — cards, buttons, inputs |
| `rounded-full` | 174x | Avatars, badges, status indicators |
| `rounded-lg` | 153x | Secondary buttons, smaller components |
| `rounded-2xl` | ~27x | Main cards, panels |
| `rounded-3xl` | 3x | Full-screen modals only |

- Never use `rounded-sm` or `rounded` (none found in codebase)
- Strong preference for medium-to-large radius

## Shadows & Depth (extracted)

**Strategy: Border-primary** (245 borders vs 84 shadows = 3:1 ratio)

| Shadow | Frequency | Use |
|--------|-----------|-----|
| No shadow (border only) | ~150x | Flat cards, default state |
| `shadow-sm` | 28x | Hover elevation, interactive states |
| `shadow-lg` | 13x | Modals, panels |
| `shadow-xl` | 19x | Full-screen overlays, QR modals |
| `backdrop-blur-*` | 47x | Glass surfaces, modal overlays |

- Glass edge: `border border-white/20 dark:border-white/10`
- Elevation depth: `shadow-xl shadow-black/10 dark:shadow-black/30`
- Backdrop blur adds layered depth without shadow overload

## Icon Sizing (extracted)

| Size | Frequency | Use |
|------|-----------|-----|
| `w-4 h-4` | 181x | Inline/button icons (primary) |
| `w-3 h-3` | 163x | Badge icons, small indicators |
| `w-5 h-5` | 65x | Nav items, section headers |
| `w-6 h-6` | 31x | Header navigation, FABs |
| `w-8 h-8` | 29x | Avatar fallback circles |
| `w-10 h-10` | 25x | Large avatar circles, modal headers |

Icon library: `lucide-react`

## Button Patterns (extracted)

### Variants
1. **Primary:** `bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-3 py-2`
2. **Secondary:** `bg-neutral-100 dark:bg-neutral-700 text-neutral-700 hover:bg-neutral-200 rounded-xl`
3. **Outlined:** `border border-neutral-200 text-neutral-600 hover:bg-neutral-50 rounded-xl`
4. **Icon-only:** `p-2 rounded-xl text-neutral-500 hover:bg-neutral-100`
5. **Danger:** `bg-rose-50 dark:bg-rose-950/30 text-rose-700 rounded-lg px-3 py-1.5`
6. **FAB:** `rounded-full p-4 shadow-2xl`

- All buttons use `transition-colors` (no transform on hover)
- Touch target: `min-h-[44px]` (19 explicit declarations)

## Card Patterns (extracted)

### Standard Card
```
bg-white dark:bg-neutral-800/80 backdrop-blur-sm rounded-2xl
border border-neutral-100 dark:border-neutral-700 p-5
```

### Dense Card
```
bg-white dark:bg-neutral-800 rounded-xl
border border-neutral-100 dark:border-neutral-700 p-3
```

- Border color: `neutral-100` (light) / `neutral-700` (dark)
- Padding: `p-4` or `p-5` standard, `p-3` dense
- Radius: `rounded-2xl` main cards, `rounded-xl` smaller

## Motion (extracted)

| Animation | Timing |
|-----------|--------|
| Modal enter | `opacity 0→1 + scale 0.95→1.0` · 150ms ease-out |
| Modal exit | `opacity 1→0 + scale 1.0→0.95` · 100ms ease-in |
| Bottom-sheet enter | `translateY(100%)→0` · 250ms ease-out |
| Bottom-sheet exit | `translateY(0)→100%` · 200ms ease-in |
| Hover lift | `translateY(0→-1px)` · 100ms ease-out |
| Toast enter | `opacity 0→1 + translateY(8→0)` · 200ms ease-out |
| Toast exit | `opacity 1→0` · 150ms ease-in |
| Skeleton pulse | `opacity 0.5↔1.0` · 1200ms ease-in-out infinite |

- `transition-colors`: 318x across all interactive elements
- `animate-pulse`: ~20x for loading/skeleton states
- `motion-safe:` prefix: 22 occurrences
- Motion library: `motion/react` (Framer Motion) for multi-step sequences
- Max 400ms for interactive feedback

## Patterns

### Modal Anatomy
- One modal = one decision
- Header: back nav + progress indicator + close button
- Body: clear task framing + single focus area
- Footer: max 2 actions, primary right (filled), secondary text-only
- Mobile: bottom-sheet with drag handle, `max-h-[90dvh]`, swipe-to-dismiss

### Empty States
- Large muted icon (`w-16 h-16 text-neutral-300`)
- Friendly heading ("No pets added yet")
- One-sentence explanation
- Primary CTA ("Add Your First Pet")

### Loading States
- Skeleton screens for page loads (not spinners)
- Inline spinner (`animate-spin w-4 h-4`) inside buttons for actions
- Disable triggering button during load

### Feedback
- Success: green toast with `CheckCircle`, 3s auto-dismiss
- Error: red inline message below field (not alert modal)
- Destructive: confirmation modal with consequence text + red confirm button

### Layout
- `flex items-center justify-between` — standard header pattern
- `flex items-start gap-2` — icon + text combinations
- `flex-1 min-w-0` — responsive with overflow truncation
- `grid-cols-2` (35x) for album/stats grids
- `grid-cols-3` (20x) for media galleries

## Accessibility (WCAG 2.2+)
- Contrast: ≥4.5:1 body text, ≥3:1 large text/UI components
- Focus: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2`
- Touch targets: `min-h-[44px] min-w-[44px]`
- Modals: `role="dialog"` + `aria-labelledby`
- Icon buttons: `aria-label` required
- Forms: `<label htmlFor>` for every input
- Errors: `role="alert"` or `aria-live="polite"`
- Dark mode: 93% component coverage (92/99 components)

## PetBase-Specific
- RESTRICTED_PII fields masked by default (`*****` or `••••••`) with eyeball toggle
- Avatar images use `tokenService.getAvatarUrl()` — never raw Storage URLs
- No internal scrollbars — pagination, load-more, or virtual scroll
- Full light/dark theme parity on every component
