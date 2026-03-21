# /handoff Skill

**Purpose:** Produce a minimal, ready-to-paste prompt for handing off to the next agent
(Claude Opus, Gemini, Antigravity, ChatGPT, or another Claude Code session).
Enforces SYSTEM_RULES.md §11.

---

## Steps

1. **Read `planning/dev-log.md`** for today's session context, then **read `planning/TODO.md`** for the current in-progress task.

2. **Find the current in-progress task** in `planning/TODO.md`
   (Status: in-progress). If multiple: use the most recently updated.

3. **Read the relevant contract(s)** listed in the task entry.
   Extract only the constraints that apply to the next step.

4. **Determine the target agent** (if specified):
   - `claude-code` — primary implementation; include jcodemunch rules
   - `claude-opus` — complex refactor; include full system rules reminder
   - `gemini` / `antigravity` / `chatgpt` — strategy/planning only; omit jcodemunch, include approval gate
   - Default: `claude-code`

5. **Construct the handoff prompt** using this template:

```
## Handoff — [TASK-ID]: [Title]
Date: [YYYY-MM-DD]
From: [current agent]
To: [target agent]

### What Was Just Completed
[1-30 sentences from dev-log. No code snippets. No file contents.]

### Current Task
[Task title, ID, and status]

### Next Step
[The single next action to take. 1-3 sentences. Action-first.]

### Files to Read First (max 3)
- [file path] — [why it's needed]
- [file path] — [why it's needed]

### Critical Rules
- All PII encrypted client-side before Firestore writes (app/src/lib/crypto.ts)
- No git push — Firebase deploy only
[If target is claude-code:] - Use jcodemunch get_repo_outline before any file navigation
[If target is gemini/chatgpt:] - Planning and strategy only; no code writes without user approval

### Acceptance Criteria (remaining)
- [ ] [criterion not yet met]
- [ ] [criterion not yet met]

### Verification Commands
- cd app && npm run build
- [any task-specific commands]
```

6. **Output** the completed prompt as a single fenced markdown block.

---

## Rules
- No code snippets, file contents, or implementation history in the handoff prompt.
- Total prompt must be readable in under 60 seconds. If it exceeds ~300 words, trim.
- Do not include more than 3 "Files to Read First" — force prioritization.
- If there is no in-progress task, output: "No active task found. Check planning/TODO.md."
