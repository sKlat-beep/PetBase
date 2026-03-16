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
- `/intake` — Create a new task in planning/TODO.md
- `/privacy-check` — Run privacy compliance audit on modified files
- `/ui-review` — Validate modified UI components against design contract
- `/handoff` — Produce a ready-to-paste handoff prompt for the next agent
