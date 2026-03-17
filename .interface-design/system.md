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
| Primary | `sky-500` | `sky-400` |
| Primary hover | `sky-600` | `sky-300` |
| Surface | `white/60` | `neutral-900/60` |
| Border (glass) | `white/20` | `white/10` |
| Border (structural) | `neutral-200` | `neutral-700` |
| Text primary | `neutral-900` | `neutral-50` |
| Text secondary | `neutral-500` | `neutral-400` |
| Text muted | `neutral-400` | `neutral-600` |
| Danger | `red-500` | `red-400` |
| Success | `emerald-500` | `emerald-400` |
| Warning | `amber-500` | `amber-400` |

- No hardcoded hex colors — Tailwind scale or CSS vars only
- No `style={{ color: '...' }}` inline styles

### Accent Color System
Six palettes available via `data-accent` attribute on `<html>`: `emerald` (default), `sky`, `violet`, `rose`, `amber`, `indigo`. CSS custom properties `--accent-50` through `--accent-700` are defined in `app/src/index.css` and switch automatically with the attribute. Use `var(--accent-*)` for accent-colored surfaces and text — never hardcode a single palette color.

## Typography
- Body: `text-sm` (14px) mobile, `text-base` (16px) desktop
- Headings: use weight (`font-semibold`, `font-bold`) not just size
- Labels: `text-xs font-medium tracking-wide text-neutral-500 dark:text-neutral-400 uppercase`
- Minimum `text-sm` for interactive elements

## Motion

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

- Always use `motion-safe:` Tailwind prefix
- Use `motion` library (Framer Motion successor) for 3+ step sequences
- Max 400ms for interactive feedback

## Shadows
- `shadow-xl shadow-black/10 dark:shadow-black/30` for elevation depth
- Borders: `border border-white/20 dark:border-white/10` for glass edge

## Spacing
- Tailwind scale only (`gap-4`, `p-6`, etc.) — no arbitrary `px-[13px]`

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

## Accessibility (WCAG 2.2+)
- Contrast: ≥4.5:1 body text, ≥3:1 large text/UI components
- Focus: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2`
- Touch targets: `min-h-[44px] min-w-[44px]`
- Modals: `role="dialog"` + `aria-labelledby`
- Icon buttons: `aria-label` required
- Forms: `<label htmlFor>` for every input
- Errors: `role="alert"` or `aria-live="polite"`

## PetBase-Specific
- RESTRICTED_PII fields masked by default (`*****` or `••••••`) with eyeball toggle
- Avatar images use `tokenService.getAvatarUrl()` — never raw Storage URLs
- No internal scrollbars — pagination, load-more, or virtual scroll
- Full light/dark theme parity on every component
