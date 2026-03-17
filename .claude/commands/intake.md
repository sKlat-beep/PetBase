# /intake Skill

**Purpose:** Convert a human feature request or bug report into a structured task entry
in `planning/TODO.md`. No MCP dependency — pure file reads and writes.

---

## Steps

1. **Parse the request** into:
   - A short title (≤10 words, action-first: "Add X", "Fix Y", "Refactor Z")
   - A precise one-paragraph description of the problem or feature

2. **Assign tags** from this domain list (one or more):
   `privacy | ui | ux | mobile | desktop | firebase | functions | release | performance | dx | feature | bug`

3. **Map tags to contracts** using `contracts/CONTRACT_MAP.yaml`.
   List all matched contracts in the task entry.

4. **Map tags to skills** using `skills/SKILL_MAP.yaml`.
   List all matched skills in the task entry.

5. **Write acceptance criteria** — 2–5 specific, testable conditions.
   Each must be verifiable without ambiguity (avoid "looks good", use "button is visible", "build exits 0", etc.)

6. **Write verification commands** — the exact shell commands that confirm the task is done.
   Always include `cd app && npm run build` and `cd functions && npm run build` if code was changed.

7. **Assign a TASK-ID:**
   - Read `planning/TODO.md`
   - Find the highest existing TASK-XX number
   - Increment by 1

8. **Append the task** to `planning/TODO.md` under `## Open Tasks` using this exact format:

```
### [TASK-ID] Title
Tags: <comma-separated tags>
Contracts: <comma-separated contract names>
Skills: <comma-separated skill names>
Status: intake

**Description:**
<description>

**Acceptance Criteria:**
- [ ] <criterion 1>
- [ ] <criterion 2>

**Verification:**
- <command 1>
- <command 2>

---
```

9. **Write a dev-log entry** in `planning/dev-log.md`:
   ```
   ## [YYYY-MM-DD] TASK-ID: <title> — START
   Task created via /intake. <one-line description>
   ```

---

## Notes
- Never assign Status: in-progress at intake. Tasks start as `intake` only.
- Do not fill in implementation details or solutions in the description — only the problem and desired outcome.
- If the request is ambiguous, ask one clarifying question before creating the task.
- If the request spans multiple independent concerns, split into separate tasks.
