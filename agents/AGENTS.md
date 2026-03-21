# Agent Entry Point

All agents must start here:
1. `docs/INDEX.md`
2. `docs/SYSTEM_RULES.md`
3. `docs/WORKFLOW.md`

## Implementation Agents
- `agents/claude-code.md` — Primary implementation; code changes, Firestore, functions
- `agents/ui-builder.md` — UI/UX design and component implementation; glass design system
- `agents/privacy-auditor.md` — Privacy compliance gate; pre-flight before any data-touching code ships
- `agents/firebase-deployer.md` — Controlled deployment; Firebase hosting, functions, rules
- `agents/test-validator.md` — Build and type safety gate; must pass before review or deploy

## Strategy & Planning Agents (no code writes without user approval)
- `agents/antigravity.md` — Architecture and strategy
- `agents/gemini.md` — Research and alternative approaches
- `agents/chatgpt.md` — Research, planning, and documentation

## Skills (invoke with /skill-name)

### Local Project Skills
- `/intake` — Create a new task in planning/TODO.md
- `/privacy-check` — Run privacy compliance audit on modified files
- `/ui-review` — Validate modified UI components against design contract (Stitch visual + WCAG a11y)
- `/handoff` — Produce a ready-to-paste handoff prompt for the next agent

### CE Workflow Skills (compound-engineering plugin)
- `/ce:plan` — Interactive planning with parallel research agents; produces a dated plan doc
- `/ce:work` — Structured work execution framework (use for all implementation tasks)
- `/ce:brainstorm` — Collaborative ideation before planning; produces a brainstorm doc
- `/deepen-plan` — Enhance plan sections with parallel best-practices and framework-docs research

### Superpowers Skills
- `/systematic-debugging` — Structured debugging methodology when root cause is unclear
- `/subagent-driven-development` — Dispatch parallel agents for independent task groups
- `/verification-before-completion` — Run verification commands before claiming a task done
- `/using-git-worktrees` — Create isolated git worktrees for parallel feature development
- `/brainstorming` — Collaborative ideation (alternative to ce:brainstorm)

### Stitch-Kit Design Skills
- `stitch-orchestrator` — Master design workflow entry point for new screens or major redesigns
- `stitch-a11y` — WCAG 2.1 AA accessibility audit (auto-invoked inside /ui-review)
- `stitch-react-components` — Convert a Stitch design screen to Vite + React components
- `stitch-ui-design-spec-generator` — Generate a design spec from plain-text requirements
- `stitch-mcp-generate-screen-from-text` — Text-to-UI prototyping via Stitch MCP
- `stitch-mcp-upload-screens-from-images` — Upload screenshots for Stitch visual analysis
