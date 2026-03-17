# /ui-review Skill

**Purpose:** Enforce the PetBase unified UI contract and glass-design system on all
new or modified components. Run before any UI task transitions to `review`.

---

## Design System Reference

PetBase UI follows a **glass-inspired, modal-oriented, non-technical-user-first** design
philosophy. Every component must satisfy both the contract checklist and the design
system principles below.

### Glass Design System Principles

**Surfaces:**
- Primary surfaces: `backdrop-blur-md` (12px) with `bg-white/60 dark:bg-neutral-900/60`
- Elevated surfaces (modals, cards): `backdrop-blur-xl` (24px) with `bg-white/75 dark:bg-neutral-900/75`
- Overlays/sheets: `backdrop-blur-2xl` with `bg-white/90 dark:bg-neutral-900/90`
- Never use pure white or pure black backgrounds — always semi-transparent with blur
- Borders: `border border-white/20 dark:border-white/10` for glass edge definition
- Shadows: `shadow-xl shadow-black/10 dark:shadow-black/30` for elevation depth

**Performance rules for glass:**
- Only apply `backdrop-filter` to elements that are actually elevated (modals, nav, cards)
- Never stack more than 2 blurred layers in the same viewport region
- Use `will-change: transform` only during animation, remove after
- Prefer CSS `backdrop-filter` over JS-driven blur — never use a blurred screenshot hack

**Color tokens (Tailwind + CSS vars):**
- `--color-primary`: brand accent (map to Tailwind `sky-500` / `sky-400` dark)
- `--color-surface`: glass surface base (white/60 light, neutral-900/60 dark)
- `--color-border`: glass edge (white/20 light, white/10 dark)
- `--color-text-primary`: `neutral-900` light / `neutral-50` dark
- `--color-text-secondary`: `neutral-500` light / `neutral-400` dark
- `--color-danger`: `red-500` / `red-400` dark
- `--color-success`: `emerald-500` / `emerald-400` dark
- All interactive states must use these tokens — never hardcode hex colors

**Motion:**
- Modal enter: `opacity-0 scale-95` → `opacity-100 scale-100`, duration 150ms, `ease-out`
- Modal exit: `opacity-100 scale-100` → `opacity-0 scale-95`, duration 100ms, `ease-in`
- Bottom-sheet enter (mobile): `translateY(100%)` → `translateY(0)`, duration 250ms, `ease-out`
- Micro-interactions: hover `translate-y-[-1px]`, duration 100ms
- Always wrap motion in `motion-safe:` Tailwind prefix to respect `prefers-reduced-motion`
- Use `motion` (Framer Motion successor) library already in app/package.json for complex sequences

---

## Checklist

Run this checklist against every modified `.tsx` file. Each item must be PASS.

### Layout & Scrolling
- [ ] No internal scrollbars — use pagination, load-more, or virtual scroll for overflow
- [ ] No fixed pixel heights on content containers — use `min-h`, `max-h`, and flex/grid
- [ ] Spacing uses Tailwind scale only (`gap-4`, `p-6`, etc.) — no arbitrary `px-[13px]`

### Modal & Sheet Behavior
- [ ] Modal uses glass surface (`backdrop-blur-xl bg-white/75 dark:bg-neutral-900/75`)
- [ ] Modal adapts to bottom-sheet on mobile: full-width, rounded-t-2xl, swipe-to-dismiss
- [ ] Modal traps focus (Tab cycles within modal, Escape closes)
- [ ] Modal backdrop is `bg-black/40 backdrop-blur-sm` — not pure black
- [ ] Multi-step modals use a progress indicator (dots or step counter)

### Responsiveness
- [ ] All layouts use `sm:` / `md:` breakpoints — no mobile-only or desktop-only components
- [ ] Touch targets ≥ 44×44px on mobile (Tailwind `min-h-[44px] min-w-[44px]`)
- [ ] Text is legible at 375px viewport width without horizontal scroll

### Theme Parity
- [ ] Every `bg-*` class has a paired `dark:bg-*`
- [ ] Every `text-*` class has a paired `dark:text-*`
- [ ] Glass surfaces maintain depth in both themes (check blur + opacity values)
- [ ] No visual artifacts when switching theme (no flash of unstyled content)

### Privacy & Security
- [ ] RESTRICTED_PII fields masked by default (`*****` or `••••••`)
- [ ] Masked fields have an eyeball toggle icon (Lucide `Eye` / `EyeOff`)
- [ ] All avatar images use `tokenService.getAvatarUrl()` — never raw Storage URLs

### Accessibility (WCAG 2.2+)
- [ ] Contrast ratio ≥ 4.5:1 for normal text, ≥ 3:1 for large text (both themes)
- [ ] All interactive elements have visible focus rings (`focus-visible:ring-2 ring-sky-500`)
- [ ] Buttons have descriptive `aria-label` if icon-only
- [ ] Modals have `role="dialog"` and `aria-labelledby` pointing to their title
- [ ] Form fields have associated `<label>` elements (not just placeholder text)
- [ ] Error messages use `role="alert"` for screen reader announcement

### Intuitiveness (Non-Technical User Test)
- [ ] Every action has a plain-language label (no jargon — "Save" not "Commit", "Share" not "Publish token")
- [ ] Destructive actions (delete, revoke) require a confirmation step with clear consequence text
- [ ] Empty states have a friendly message and a primary CTA (not just a blank area)
- [ ] Loading states show a skeleton or spinner — never a blank screen
- [ ] Success feedback is visible (toast notification or inline confirmation)
- [ ] Error states explain what went wrong and what the user can do (not just "Error 500")

### Performance
- [ ] Heavy modals use `React.lazy` + `Suspense` — not imported at page level
- [ ] Images specify `width` and `height` attributes to prevent layout shift
- [ ] `backdrop-filter` only on elevated elements — not entire page backgrounds
- [ ] No `useEffect` chains for data that could be derived from existing state

---

## Steps

1. **Identify all modified `.tsx` files** from the task description.

2. **Run `interface-design:audit`** to check modified files against `.interface-design/system.md` for spacing, depth, color, and pattern violations.

3. **For each modified file:** use jcodemunch `get_file_outline` to locate components,
   then run through the checklist above.

4. **Output a review report:**
   ```
   ## UI Review Report — TASK-ID
   Date: YYYY-MM-DD

   File: app/src/components/Foo.tsx
   - [PASS] No internal scrollbars
   - [FAIL] Modal missing dark:bg variant on line 42
   - [PASS] Focus rings present

   Result: PASS / FAIL
   Violations: <file:line for each FAIL>
   ```

5. **If any FAIL:**
   - Do NOT transition the task to `review`.
   - Return the violations list. The task stays `in-progress` until violations are resolved.

6. **If PASS:**
   - Append the report summary to the task entry in `planning/TODO.md`.
   - The task may transition to `review`.
