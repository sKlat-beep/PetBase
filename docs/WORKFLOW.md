# PetBase App Workflow — Full Documentation

`planning/TODO.md` is the authoritative task board.

---

## 1. Session Startup

Every conversation begins with:
1. **Read `planning/dev-log.md`** — check for yesterday's entries. If found, archive them to `planning/archive/dev-log-completed.md` and clear the file.
2. **Read `agents/claude-code.md`** + **`docs/SYSTEM_RULES.md`** + **`docs/WORKFLOW.md`** — reload all rules.
3. **Read only the active phase section of `planning/TODO.md`** — never the full file (token discipline).
4. **Check MEMORY.md** — load relevant memories (user prefs, feedback, project context).
5. **jcodemunch `get_repo_outline`** — establish symbol-level awareness of the codebase without reading raw files.

---

## 2. Task Lifecycle (Single Task)

### Task Status Values
`intake` → `in-progress` → `review` → `done` | `blocked`

### Pickup
1. Set task status to `in-progress` in `TODO.md`.
2. Read any contracts referenced in the task entry (`contracts/` directory).
3. Write a dev-log entry: `## [YYYY-MM-DD] TASK-XX: Title [START]`

### Implementation
1. **jcodemunch first** — `get_repo_outline` → `get_file_outline` → `get_symbol`. Only read raw files when no symbol exists.
2. **Edit blocks ≤ 50 lines** — enforced by system rules.
3. **Parallel independent reads** — if I need to read 3 unrelated files, I issue all 3 Read calls in one message.
4. **Never re-read files** already in context — reference earlier reads instead.

### Auto-Triggers During Implementation
These fire automatically as I work:
- **Semgrep** (PostToolUse hook) — scans every `.ts/.tsx/.js/.jsx` file after Edit/Write for p/typescript rules.
- **Security-guidance** (PreToolUse hook) — checks for XSS, eval, command injection before edits are applied.
- **TypeScript LSP** — real-time type diagnostics for `app/` and `functions/`.
- **code-simplifier** — runs after implementation tasks complete to simplify/refine code.

### Delivery
1. **`/ui-review`** on all modified `.tsx` files (if any).
2. **`/privacy-check`** on all Firestore-touching files (if any).
3. **test-validator** — `npm run build` in both `app/` and `functions/`. Both must exit 0.
4. **Preview verification** — for any `.tsx` visual change:
   - `preview_start` (if not running) → reload → `preview_screenshot`.
   - Check `preview_console_logs` — zero errors required.
   - Attach screenshot to task completion note as proof.
5. Set task status to `review` in `TODO.md`.
6. Write dev-log entry: `## [YYYY-MM-DD] TASK-XX: Title [COMPLETE]`

### Completion (after PM approval)
1. Remove task from `TODO.md`.
2. Dev-log entry stays in `dev-log.md` for today.
3. Archive to `dev-log-completed.md` happens **only during next-day rotation** — never directly.

### Blocked
Set Status to `blocked` with a reason note inline. Do not attempt to proceed without
resolving the dependency. Flag to the user.

---

## 3. Multi-Phase Plan Execution

When you ask me to create and execute a multi-phase plan, here's exactly what happens:

### Phase 1: Understanding (Explore)
- I launch **up to 3 Explore agents in parallel** (single message, multiple tool calls).
- Each agent gets a specific search focus: existing implementations, related components, testing patterns, etc.
- Goal: understand the codebase area, find reusable functions/utilities, identify patterns.
- **Tools used:** Glob, Grep, Read, jcodemunch MCP (search_symbols, get_file_outline, get_symbol).

### Phase 2: Cooperative Design (Interactive)
**This is a dialogue, not a monologue.** Instead of writing a complete plan and asking for blanket approval:
- After each major discovery or design decision, I **prompt you with options** via `AskUserQuestion`.
- Decisions are made incrementally — architecture, data flow, UI changes, tradeoffs — each surfaced as they come up.
- I use **Plan agents** for complex design work, but surface their recommendations to you as decision points rather than final answers.
- Context7 MCP for live docs (React 19, Firebase, Tailwind) when needed.

### Phase 3: Collaborative Review
- I read critical files identified during exploration.
- Instead of a single "does this look right?" — I surface **specific concerns, edge cases, or ambiguities** as individual questions.
- The plan builds up incrementally through our dialogue.

### Phase 4: Final Plan
- I write the consolidated plan to a plan file with:
  - **Context** section (why this change)
  - Decisions made during our dialogue (with rationale)
  - File paths to modify
  - Reusable functions/utilities found
  - Verification steps
- I call `ExitPlanMode` to confirm we're ready to execute.

### Phase 5: Automated Execution
**Once approved, execution is mostly autonomous.** I only pause for:
- Clarifying questions on items missed during planning.
- Genuinely ambiguous situations that weren't anticipated.

Execution tools:
1. **Executing Plans** (`superpowers:executing-plans`) — implements with review checkpoints.
2. **Subagent-Driven Development** (`superpowers:subagent-driven-development`) — for plans with independent tasks, dispatches parallel agents.
3. **Verification Before Completion** (`superpowers:verification-before-completion`) — runs verification commands, confirms output before claiming success.

### Parallel Agent Dispatch
When a plan has independent tasks:
- I use `superpowers:dispatching-parallel-agents` to identify independent work items.
- Each agent gets launched with `isolation: "worktree"` for safe parallel execution.
- Agents work on isolated git worktrees, changes are merged back.

### Mistake Recovery Protocol
When I make a mistake (rule skipped, tokens wasted, wrong approach):
1. I flag what went wrong and why.
2. I **propose a permanent fix** — a new hook, memory entry, rule update, or guard — to prevent recurrence.
3. I ask you whether to implement the fix.
4. If approved, I implement the prevention mechanism immediately before continuing.

---

## 4. Tools I Engage

### Core Tools (every task)
| Tool | Purpose |
|------|---------|
| **Read** | Read files (with offset/limit for large files) |
| **Edit** | Modify files (≤ 50 line blocks) |
| **Write** | Create new files (only when necessary) |
| **Glob** | Find files by pattern |
| **Grep** | Search file contents |
| **Bash** | Shell commands (builds, git, npm) |
| **Agent** | Spawn specialized subagents |

### MCP Servers
| Server | Purpose |
|--------|---------|
| **jcodemunch** | Symbol-level codebase navigation (always first before raw reads) |
| **context7** | Live documentation lookup (React 19, Firebase, Tailwind, any library) |
| **stitch-kit** | UI design review, accessibility auditing, and design system management |
| **Claude Preview** | Dev server lifecycle, screenshots, console logs, DOM snapshots for UI verification |

### Skills (invoked via `/command`)
| Skill | Trigger |
|-------|---------|
| `/intake` | Creating a new task in TODO.md |
| `/ui-review` | Any `.tsx` file modified (Stitch visual + WCAG a11y gate) |
| `/privacy-check` | Any Firestore read/write changed |
| `/handoff` | Handing off to another agent |
| `/commit` | Creating git commits |
| `/ce:plan` | Planning new features interactively with research agents |
| `/ce:work` | Structured execution of a plan (use for all implementation tasks) |
| `/ce:brainstorm` | Collaborative ideation before planning |
| `/deepen-plan` | Enhance plan sections with parallel research agents |
| `/systematic-debugging` | Structured debugging when root cause is unclear |
| `/subagent-driven-development` | Dispatch parallel agents for independent task groups |
| `/verification-before-completion` | Run verification commands before claiming done |

### Specialized Review Agents (CE)
| Agent | When |
|-------|------|
| `feature-dev:code-explorer` | Before touching complex context or service files |
| `feature-dev:code-architect` | Designing features with data flow implications |
| `kieran-typescript-reviewer` | After TypeScript implementation |
| `security-sentinel` | Security audit before deploy; also after any Firestore-touching change |
| `performance-oracle` | Performance concerns; required for Firestore schema changes |
| `data-integrity-guardian` | Any data model change, migration, or denormalization |
| `pattern-recognition-specialist` | Codebase consistency checks |
| `code-simplifier` | After implementation — simplify/refine all new code |

### Gate Agents (Delivery)
| Agent | Gate |
|-------|------|
| `test-validator` | Build + type safety (both app/ and functions/) |
| `privacy-auditor` | PII encryption and tokenized avatars |
| `ui-builder` | UI design with glass design system |
| `firebase-deployer` | Production deploy (only after all gates pass) |

---

## 5. Rules I Follow Every Time

### Privacy & Security
- All PII encrypted client-side (AES-256-GCM) before any Firestore write.
- All PII fields (including medical records, expenses, addresses) MAY be stored in Firestore if encrypted before write.
- Tokenized avatar URLs never resolved client-side.
- Unknown fields treated as RESTRICTED_PII.
- User's real name / login email never publicly displayed — only `displayName` is viewable.
- Semgrep + security-guidance hooks run on every code edit.
- **Any new Firestore field, schema denormalization, or data model change MUST pass:**
  - `performance-oracle` review (read/write cost, index implications).
  - `data-integrity-guardian` review (migration safety, constraint gaps).

### Token Discipline
- jcodemunch before raw file reads (always).
- Never re-read files already in context.
- Use offset/limit for large files.
- Read only active phase section of TODO.md.
- Edit blocks ≤ 50 lines.
- No code blocks in subagent prompts.

### Documentation Discipline
- TODO.md is the authoritative task board (open tasks only).
- Dev-log entries at Start and Complete only.
- Task completion: dev-log entry → remove from TODO.md. That's it.
- Archive happens during next-day rotation only.
- Dev-log format: `## [YYYY-MM-DD] TASK-XX: Title — STATUS`

### Source Control
- No `git push` without asking for approval.
- No destructive git operations without confirmation.
- Commits use proper Co-Authored-By attribution.

### Shell Commands
- Never chain `cd` + git with `&&` or `;` — use `git -C /path` or absolute paths.
- No compound `cd && command` patterns — use `npm --prefix` or absolute paths.
- Avoid approval-gating commands.

### Hooks (Automated)
- **PreToolUse** (security-guidance): Checks for XSS, eval, command injection before any Edit/Write.

---

## 6. Workflow Diagram (Task Lifecycle)

```
intake → in-progress → [implement] → /ui-review → /privacy-check → test-validator → review → [PM approval] → done
                                                                                         ↓
                                                                                      blocked (with reason)
```

## 7. Memory System

I maintain persistent memory across conversations in `~/.claude/projects/.../memory/`:
- **User memories** — your role, preferences, expertise level
- **Feedback memories** — corrections you've given me (shell commands, task handoff, token efficiency)
- **Project memories** — plugin config, ongoing initiatives, deadlines
- **Reference memories** — external system pointers

These load at conversation start and guide my behavior so you don't repeat instructions.
