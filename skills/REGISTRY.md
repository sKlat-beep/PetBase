# Skills Registry

This project keeps a local registry that points to external skills and local project skills.

## External Skills
See `skills/external.md`.

## Local Skills
- `skills/local/intake/SKILL.md` — Convert requests to structured tasks in planning/TODO.md
- `skills/local/privacy-check/SKILL.md` — Pre-flight privacy compliance audit
- `/ui-review` — Global skill (`~/.claude/commands/ui-review.md`). Stitch-powered visual review + a11y audit.
- `skills/local/handoff/SKILL.md` — Generate agent handoff prompts
- `.claude/commands/gotcha-registry.md` — Gotcha Registry: store, retrieve, rank, and update confidence for known failure patterns. Called by gotcha-monitor agent and claude-code.md orchestration. Data: `.claude/gotcha/registry.json`.
