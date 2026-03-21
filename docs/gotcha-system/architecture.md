# Gotcha System Architecture

## Repo-Aligned Placement
- `agents/gotcha-monitor/` for post-execution reasoning
- `skills/gotcha-registry/` for storage, retrieval, ranking, and learning
- `planning/gotcha-system/` for preflight and workflow orchestration
- `docs/gotcha-system/` for schemas and canonical design docs
- `.claude/configs/` for runtime settings

## High-Level Flow
1. User or workflow requests a command.
2. Planning layer builds a preflight event.
3. Registry evaluates preventative rules.
4. Command is allowed, warned, modified, or blocked.
5. If executed, post-execution event is sent to the monitor agent.
6. Monitor queries registry for ranked matches.
7. Guidance is shown and learning signals are recorded.
