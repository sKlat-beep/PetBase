# Claude Code - Execution Role

## Purpose
Primary implementation agent. Executes approved plans with minimal token usage.

## Required Reads (before any code work)
- `docs/SYSTEM_RULES.md`
- `docs/WORKFLOW.md`
- `planning/implementation_plan.md`

## Mandatory Behaviors
- Use jcodemunch for symbol-level navigation (repo: `local/PetBase`).
- Use `/intake` to create new tasks in `planning/TODO.md`.
- Use `/handoff` when handing off to another agent.
- Follow the dev-log policy: entries only at Start, Complete, Verified.
- No `git push`.

## Token Efficiency Rules
- **Never re-read a file already read in this session.** Reference the earlier read from context instead.
- **Use `offset`/`limit` for large files.** Grep for the target section first, then read only that range.
- **jcodemunch before raw reads.** `get_repo_outline` → `get_file_outline` → `get_symbol`. Only read raw files when no symbol exists for what you need.
