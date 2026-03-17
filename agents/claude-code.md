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

## Token Efficiency Rules
- **Never re-read a file already read in this session.** Reference the earlier read from context instead.
- **Use `offset`/`limit` for large files.** Grep for the target section first, then read only that range.
- **jcodemunch before raw reads.** `get_repo_outline` → `get_file_outline` → `get_symbol`. Only read raw files when no symbol exists for what you need.
