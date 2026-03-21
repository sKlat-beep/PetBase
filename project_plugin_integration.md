# Plugin Integration — Hybrid Workflow

This document describes how all installed plugins, agents, skills, and MCP servers integrate
into the PetBase development workflow. The authoritative workflow rules live in
`docs/WORKFLOW.md` and `agents/claude-code.md`.

---

## Workflow Backbone: ce:work + Superpowers

All implementation tasks use `/ce:work` as the execution framework.
PetBase-specific gates (defined in `agents/claude-code.md`) override ce:work's defaults.

```
/ce:plan (interactive planning)
    → /ce:work (execution)
        → feature-dev:code-explorer (before complex files)
        → implement (semgrep + security-guidance auto-hooks)
        → kieran-typescript-reviewer (after TS implementation)
        → /ui-review (modified .tsx files)
        → /privacy-check (Firestore changes)
        → test-validator (build gate)
        → preview verification (screenshot + console check)
        → code-simplifier (final pass)
```

---

## Auto-Hooks (fire on every Edit/Write)

| Hook | Trigger | What it does |
|------|---------|-------------|
| `semgrep` | PostToolUse on `.ts/.tsx/.js/.jsx` | Scans for p/typescript rule violations |
| `security-guidance` | PreToolUse on Edit/Write | Checks for XSS, eval, command injection |
| `typescript-lsp` | Real-time | Type diagnostics for `app/` and `functions/` |

---

## Specialized Review Agents (CE)

Invoked as blocking gates during delivery. Run in parallel where independent.

| Agent | When to invoke |
|-------|---------------|
| `feature-dev:code-explorer` | Before touching SocialContext, firestoreService, AuthContext, Layout |
| `feature-dev:code-architect` | Designing features with cross-cutting data flow |
| `kieran-typescript-reviewer` | After any TypeScript implementation |
| `security-sentinel` | After any Firestore/auth change; before deploy |
| `performance-oracle` | Any Firestore schema change or suspected N+1 |
| `data-integrity-guardian` | Any data model change, denormalization, migration |
| `pattern-recognition-specialist` | Codebase consistency checks |
| `code-simplifier` | After all implementation — runs last, always |

---

## Gate Agents (project-defined, in `agents/`)

| Agent | Gate condition | Must pass before |
|-------|---------------|-----------------|
| `test-validator` | `npm run build` in app/ + functions/ (both exit 0) | Task → `review` |
| `privacy-auditor` | PII encryption + tokenized avatar contract | Task → `review` (Firestore tasks) |
| `ui-builder` | Glass design system implementation | New UI screens |
| `firebase-deployer` | Production deploy | Only after all other gates pass |

---

## Design: Stitch-Kit

- `/ui-review` invokes Stitch for visual review + WCAG 2.1 AA audit on every `.tsx` change.
- New screens or major redesigns: use `stitch-orchestrator` first to generate/review designs.
- Design-to-code: use `stitch-react-components` to convert Stitch screens to Vite + React.

---

## MCP Servers

| Server | Usage pattern |
|--------|--------------|
| `jcodemunch` | Always before raw file reads. `get_repo_outline` → `get_file_outline` → `get_symbol` |
| `context7` | Before implementing with any library — get live docs first |
| `stitch-kit` | UI design review and accessibility. Invoked via `/ui-review` |
| `Claude Preview` | After any UI change — `preview_start` → `preview_screenshot` → `preview_console_logs` |

---

## Disabled Plugins

| Plugin | Reason |
|--------|--------|
| `interface-design` | Superseded by stitch-kit |
| `frontend-design` | Superseded by stitch-kit |

---

## Skills Quick Reference

See `skills/REGISTRY.md` for local skills and `skills/external.md` for CE/Superpowers/Stitch refs.
See `agents/AGENTS.md` for the full skills list organized by category.
