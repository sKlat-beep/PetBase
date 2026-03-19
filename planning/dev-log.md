# Dev Log — Today's Session

> This file tracks work done in the current day's session(s).
> At the start of each new day, move yesterday's entries to
> `planning/archive/dev-log-completed.md`, then clear this file back to the header.
>
> Entry format — one line per task transition:
> ```
> ## [YYYY-MM-DD] TASK-XX: Title — STATUS
> One-line summary of what was done. No PII.
> ```
>
> Statuses: START, COMPLETE
> When a task is COMPLETE, also update its status in TODO.md and move it to the archive.

---

## [2026-03-18] TASK-91: Fix tsc --noEmit --strict type errors — COMPLETE
Fixed 3 errors (not 9 — others were resolved during TASK-92): widened Recharts Tooltip formatter params in ExpenseChart.tsx and WeightTrendChart.tsx, added 'audio' to sendDm media type in firestoreService.ts and MessagingContext.tsx. Verified: `tsc --noEmit --strict` = 0 errors, Vite build passes.
