# External Skills

These skills live in the user-scope Claude Code plugin cache and are invoked via `/skill-name`.

## Compound Engineering Skills
Installed at: `~/.claude/plugins/cache/compound-engineering-plugin/compound-engineering/2.40.0/skills/`

- `/ce:plan` — Interactive planning with research agents; produces a dated plan file in `docs/plans/`
- `/ce:work` — Structured work execution; use for all implementation tasks
- `/ce:brainstorm` — Collaborative ideation before planning; produces a brainstorm doc
- `/deepen-plan` — Enhance plan sections with parallel best-practices + framework-docs research
- `orchestrating-swarms` — Swarm mode for plans with 5+ independent workstreams
- `git-worktree` — Create an isolated git worktree for safe parallel development

## Superpowers Skills
Installed at: `~/.claude/plugins/cache/claude-plugins-official/superpowers/5.0.5/skills/`

- `/systematic-debugging` — Structured debugging methodology when root cause is unclear
- `/subagent-driven-development` — Dispatch parallel agents for independent task groups
- `/verification-before-completion` — Run verification commands before claiming a task done
- `/using-git-worktrees` — Git worktree management for parallel feature branches
- `/brainstorming` — Collaborative ideation (alternative to /ce:brainstorm)
- `/executing-plans` — Execute a written plan with structured review checkpoints

## Stitch-Kit Design Skills
Installed at: `~/.claude/plugins/cache/stitch-kit/stitch-kit/1.8.0/skills/`

- `stitch-orchestrator` — Master design workflow for new screens or major redesigns
- `stitch-a11y` — WCAG 2.1 AA accessibility audit (invoked inside /ui-review)
- `stitch-react-components` — Convert a Stitch design screen to Vite + React components
- `stitch-ui-design-spec-generator` — Generate a design spec from requirements
- `stitch-mcp-generate-screen-from-text` — Text-to-UI prototyping via Stitch MCP
- `stitch-mcp-upload-screens-from-images` — Upload screenshots for Stitch visual analysis
