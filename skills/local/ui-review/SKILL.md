# /ui-review Skill

**Purpose:** Enforce the PetBase unified UI contract and glass-design system on all
new or modified components. Run before any UI task transitions to `review`.

---

## Design System Reference

The ui-builder agent system prompt is the single source of truth for all glass surface, color token, motion timing, and accessibility standards. All those rules apply here — do not re-read them; use what is already in context.

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
