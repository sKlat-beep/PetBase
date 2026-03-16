# PetBase System Rules (Canonical)

This file is the single source of truth for all agent and developer rules.

## 1. Onboarding and Getting Started
- If a new core feature is introduced, add a corresponding item to the Getting Started checklist.
- Advanced features should use Recommendation Banners, not block onboarding.

## 2. Privacy and Zero-Trust
- All PII must be encrypted client-side using AES-256-GCM with a PBKDF2-derived key before any Firestore write.
- Use `app/src/lib/crypto.ts` for all encryption/decryption.
- Plaintext must be decrypted immediately after fetch, before entering React state or rendering.
- No-Cloud PII policy: medical records, expense data, and address fields are stored client-side only; Firestore writes are prohibited until compliance review.
- Data Classification Contract is authoritative; if a field is not in the dictionary, treat it as RESTRICTED_PII.
- Public visibility exposes ONLY display name, pet types for non-private pets, and total non-private pet count.
- Tokenized fields must never be resolved client-side.

## 3. Documentation Discipline
- `planning/TODO.md` is the authoritative task board. Use `/intake` to create tasks.
- `planning/implementation_plan.md` is the single source of truth for strategy.
- `planning/PetBase-Roadmap.md` is a checklist only.
- `planning/dev-log.md` entries are required at Start, Complete, Verified only (no PII).
- Dev-log format: `## [YYYY-MM-DD] Title`.

## 4. jcodemunch Rules
- Repo ID: `local/PetBase` (last indexed: 2026-03-14).
- Index the entire project root: `C:\Admin\Projects\PetBase`.
- Ignore patterns: `node_modules/`, `dist/`, `lib/`, `.firebase/`, `.git/`.
- Use `get_repo_outline` at session start.
- If you know a symbol, use `get_symbol`; otherwise use `get_file_outline` then `get_symbol`.
- Never read entire files when a symbol exists in the index.
- Use `search_symbols` before `search_text`.
- No automatic re-indexing; user-initiated only.
- After re-index, update the repo ID across docs and `contracts/jcodemunch-contract.md`.

## 5. MCP Usage
- Indexed search must use `jcodemunch`.
- Pencil MCP server must be used for UI design/planning and for reading `.pen` files.
- Task tracking uses `planning/TODO.md` — no MCP dependency.

## 6. Source Control
- Never run `git push` automatically.

## 7. Testing
- No code changes during test/diagnostic phases.

## 8. Token and Subagent Discipline
- Edit blocks must not exceed 50 lines.
- No code blocks in subagent prompts.
- Parallel independent reads required.
- Avoid redundant builds/deploys.

## 9. Conversation Compaction
- Limit tool noise.
- Read the last 10-20 lines of dev-log at session start.

## 10. LLM Fallback Roles
- Gemini / Antigravity: strategy and planning; code writes allowed only with user approval.
- Claude Sonnet: small fixes (<= 50-line edits).
- Claude Opus: complex refactors; full dev-log + roadmap updates required.
- ChatGPT: research/strategy/planning; code writes allowed only with user approval.

## 11. Handoff Prompt Rule
- When handing off to Claude Code, provide a ready-to-paste, detailed but minimal prompt. Ensure all critical tasks are outlined while avoiding unnecessary token usage.

