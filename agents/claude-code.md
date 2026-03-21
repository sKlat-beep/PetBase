# Claude Code - Execution Role

## Purpose
Primary implementation agent. Executes approved plans with minimal token usage.

## Required Reads (before any code work)
- `docs/SYSTEM_RULES.md`
- `docs/WORKFLOW.md`
- `planning/TODO.md` (read only the active phase section, not the full file)

## Mandatory Behaviors
- Use jcodemunch for symbol-level navigation (repo: `local/PetBase`).
- Use `/intake` to create new tasks in `planning/TODO.md` (place under appropriate phase header).
- Use `/handoff` when handing off to another agent.
- Dev-log policy: entries at Start and Complete only. Today's work in `planning/dev-log.md`.
- On task completion: move full task body from TODO.md to `planning/archive/dev-log-completed.md`.
- Daily rotation: at session start, if `dev-log.md` has entries from a previous date, append them to the archive and clear the file.
- No `git push`.

## Plugin Integration (Hybrid Workflow)

**Workflow backbone:** superpowers drives the flow (brainstorm → plan → execute → verify).

**Specialized review passes (CE agents):** kieran-typescript-reviewer, security-sentinel, performance-oracle, pattern-recognition-specialist.

**Auto-triggers:**
- **code-simplifier** — runs after implementation tasks
- **feature-dev** — triggers for feature requests
- **security-guidance** — PreToolUse hook checks for XSS, eval, command injection before edits
- **typescript-lsp** — real-time type diagnostics for app/ and functions/
- **context7** — live documentation lookup (React 19, Firebase, Tailwind) via CE plugin MCP
- **stitch-kit** — UI design review, accessibility auditing, and design system management

## Token Efficiency Rules
- **Never re-read a file already read in this session.** Reference the earlier read from context instead.
- **Use `offset`/`limit` for large files.** Grep for the target section first, then read only that range.
- **jcodemunch before raw reads.** `get_repo_outline` → `get_file_outline` → `get_symbol`. Only read raw files when no symbol exists for what you need.

---

## ce:work Phase Overrides (PetBase)

When executing via `/ce:work`, PetBase-specific gates override ce:work's defaults.

### Before Phase 2 — Explore (Before Touching Files)
- **Any large context file** (SocialContext, firestoreService, AuthContext, Layout, PetFormModal) →
  Launch a `feature-dev:code-explorer` agent first to understand the data flow.
- **Any Firestore schema change or new denormalized field** →
  Launch `performance-oracle` + `data-integrity-guardian` agents before writing.
- **Any library or API not already in context** →
  Query `context7` for live documentation before implementing.

### During Phase 3 — Implement
- security-guidance (PreToolUse) hook fires automatically on every Edit/Write.
- After each TypeScript file group is complete → invoke `kieran-typescript-reviewer`.
- After each Firestore-touching file change → invoke `security-sentinel` (not just at delivery).

### Phase 4 — Quality / Delivery (ALL must pass, in order)
1. `superpowers:verification-before-completion` — run build commands, confirm output.
2. `/ui-review` — for every modified `.tsx` file with visual changes (Stitch visual + a11y).
3. `/privacy-check` — for every Firestore read/write change.
4. `test-validator` agent — `npm run build` in `app/` AND `functions/`, both must exit 0.
5. **Preview verification** — `preview_start` → `preview_screenshot` → `preview_console_logs`.
   - Zero console errors required. Attach screenshot as proof before marking done.
6. `code-simplifier` agent — simplify/refine all new code (runs last).

---

## Conditional Tool Triggers

| Condition | Invoke |
|-----------|--------|
| Modifying any large context or service file | `feature-dev:code-explorer` agent before touching |
| Adding / changing Firestore fields or schema | `performance-oracle` + `data-integrity-guardian` |
| Any new TypeScript interfaces or implementations | `kieran-typescript-reviewer` after implementation |
| Any new or modified `.tsx` with visual output | `/ui-review` + `preview_screenshot` at delivery |
| Any PII field read/write change | `/privacy-check` + `privacy-auditor` agent |
| Any auth boundary, security rule, or token change | `security-sentinel` |
| Unknown library or newly added dependency | `context7` docs lookup before implementing |
| Designing a new UI screen or major component | `stitch-orchestrator` or `stitch-ui-design-spec-generator` |
| Performance concern or N+1 query suspected | `performance-oracle` |
| Codebase consistency check needed | `pattern-recognition-specialist` |
