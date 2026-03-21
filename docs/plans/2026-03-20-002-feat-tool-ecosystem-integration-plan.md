---
title: Tool Ecosystem Integration — Close the Gap Between Available and Used
type: feat
status: completed
date: 2026-03-20
---

# Tool Ecosystem Integration — Close the Gap Between Available and Used

## Overview

PetBase has a rich tool ecosystem (95+ skills, 14 plugins, 5 gate agents, 4 MCP servers) that is
partially documented but inconsistently invoked. During the last session, `ce:work` did all
implementation work without invoking any specialized agents, preview tools, or review gates.

This plan audits every available tool and maps concrete changes to the workflow docs so that
every tool fires at the right moment — automatically or as an enforced gate.

---

## What's Available (Full Inventory)

### MCP Servers
| Server | Purpose | Status |
|--------|---------|--------|
| `jcodemunch` | Symbol-level codebase navigation — always before raw reads | Used correctly |
| `context7` | Live docs for React 19, Firebase, Tailwind, any library | **Rarely invoked** |
| `stitch-kit` | UI design review, WCAG audit, design system mgmt | **Never invoked** |
| `Claude Preview` | Dev server + screenshot + snapshot + console logs | **Invoked only after stop hook** |

### Gate Agents (project-defined, `agents/` directory)
| Agent | Gate | Status |
|-------|------|--------|
| `test-validator` | `npm run build` in app/ and functions/ — must exit 0 | **Not run last session** |
| `privacy-auditor` | PII encryption + tokenized avatar contract | **Not run last session** |
| `ui-builder` | Glass design system implementation | Listed but rarely dispatched |
| `firebase-deployer` | Production deploy — only after all gates pass | Correct — not deployed |

### CE Specialized Review Agents
| Agent | When | Status |
|-------|------|--------|
| `feature-dev:code-explorer` | Before touching complex context files (SocialContext, firestoreService) | **Never used** |
| `feature-dev:code-architect` | Designing features with data flow implications | **Never used** |
| `kieran-typescript-reviewer` | After TypeScript implementation | **Never used** |
| `security-sentinel` | Before any Firestore-touching code ships | **Never used** |
| `performance-oracle` | Before schema changes or denormalization decisions | **Never used** |
| `pattern-recognition-specialist` | Checking codebase consistency | **Never used** |
| `code-simplifier` | Auto-runs after implementation | Listed as auto-trigger; not invoked |
| `compound-engineering:review:data-integrity-guardian` | DB migrations / data model changes | **Never used** |

### Superpowers Skills
| Skill | Purpose | Status |
|-------|---------|--------|
| `superpowers:brainstorming` | Collaborative ideation before planning | Replaced by ce:brainstorm |
| `superpowers:executing-plans` | Structured plan execution with review checkpoints | Listed in WORKFLOW.md but not invoked |
| `superpowers:subagent-driven-development` | Dispatch parallel agents for independent tasks | **Never used** |
| `superpowers:systematic-debugging` | Structured debugging methodology | **Never used** |
| `superpowers:verification-before-completion` | Pre-completion verification commands | **Never used** |
| `superpowers:using-git-worktrees` | Isolated parallel development | Listed in WORKFLOW.md; not used |
| `superpowers:writing-plans` | Transform specs to plans | Replaced by ce:plan |
| `superpowers:code-reviewer` | Review after major steps | **Never used** |

### CE Workflow Skills (compound-engineering plugin)
| Skill | Purpose | Status |
|-------|---------|--------|
| `/ce:plan` | Planning — interactive, research-backed | Active |
| `/ce:work` | Work execution framework | Active |
| `/ce:brainstorm` | Ideation | Available |
| `/deepen-plan` | Enhance plan with parallel research agents | Available but unused |
| `ce:resolve-pr-parallel` | Parallel PR comment resolution | Available but unused |
| `orchestrating-swarms` | Multi-agent swarm for large plans | Available but unused |

### Stitch-Kit Skills (design)
| Skill | Purpose | Status |
|-------|---------|--------|
| `stitch-orchestrator` | Master design workflow entry | Available |
| `stitch-mcp-generate-screen-from-text` | Text-to-UI generation | Available |
| `stitch-a11y` | WCAG 2.1 AA audit | Available (invoked via /ui-review) |
| `stitch-react-components` | Convert design to React/Vite components | Available |
| `stitch-ui-design-spec-generator` | Spec from requirements | Available |
| `stitch-mcp-upload-screens-from-images` | Upload screenshots for review | Used in /ui-review |

### Local Project Skills
| Skill | File | Status |
|-------|------|--------|
| `/intake` | `skills/local/intake/SKILL.md` | Documented; should be used for every new task |
| `/privacy-check` | `skills/local/privacy-check/SKILL.md` | Documented; gate not enforced |
| `/ui-review` | `~/.claude/commands/ui-review.md` | Documented; gate not enforced |
| `/handoff` | `skills/local/handoff/SKILL.md` | Documented |

---

## Gap Analysis — Root Causes

### 1. `ce:work` overwrites PetBase workflow gates
`ce:work` has its own quality checklist (tests + linting + reviewer agents).
PetBase's custom gates (`/ui-review`, `/privacy-check`, `test-validator` agent) are NOT part of
ce:work's default flow. When following ce:work, the PetBase-specific gates get silently skipped.

**Fix:** `agents/claude-code.md` must map PetBase gates onto `ce:work` phases explicitly.

### 2. "Auto-trigger" tools don't actually auto-trigger
`agents/claude-code.md` lists `code-simplifier`, `feature-dev`, `context7`, `stitch-kit` as
"auto-triggers" — but there is no hook that fires them. They run only if I explicitly invoke them.

**Fix:** Change "auto-triggers" to explicit gate rules with conditions and mandatory invocation.

### 3. No "before you touch X, invoke Y" rules
There's no rule like: "before reading/modifying `firestoreService.ts`, launch a
`feature-dev:code-explorer` agent to understand the data flow." Without these conditional
triggers, exploration agents never get invoked.

**Fix:** Add a conditional trigger table to `agents/claude-code.md`.

### 4. Preview verification is not in the workflow
`docs/WORKFLOW.md` delivery step doesn't mention preview verification. It mentions `/ui-review`
which builds the app — but not starting a live preview, taking screenshots, checking console logs.

**Fix:** Add preview verification as a mandatory delivery step for UI tasks.

### 5. Performance/schema gates missing
When denormalizing Firestore data (as was done for public crest fields), there's no checkpoint
that fires `performance-oracle` or `data-integrity-guardian`. This is a silent risk.

**Fix:** Add a Firestore schema change gate to WORKFLOW.md.

### 6. Skills registry is incomplete
`skills/REGISTRY.md` and `skills/external.md` only list 4 local skills and 2 stale Codex
references. The 95+ available skills from CE, Superpowers, and Stitch-Kit are undiscovered.

**Fix:** Add a complete skills quick-reference or at minimum cross-reference `agents/AGENTS.md`.

### 7. `project_plugin_integration.md` referenced in MEMORY.md but doesn't exist
MEMORY.md mentions `project_plugin_integration.md` as the "full plugin integration config."
That file is missing.

**Fix:** Create it.

---

## Detailed Changes Required

### Change 1 — `agents/claude-code.md`: Map PetBase gates onto `ce:work` phases

Add a section that explicitly overrides `ce:work` defaults with PetBase-specific gates:

```markdown
## ce:work Phase Overrides (PetBase)

When executing via ce:work, these PetBase rules apply within each phase:

### Before Phase 2 (Explore / Before Touching Files)
- **SocialContext, firestoreService, AuthContext, any context file** →
  Launch `feature-dev:code-explorer` agent first.
- **Any Firestore schema change or denormalization** →
  Launch `performance-oracle` agent + `data-integrity-guardian` before writing.
- **Any library unfamiliar or newly used** →
  Query `context7` for live documentation.

### During Phase 3 (Implement)
- security-guidance hook fires automatically (PreToolUse on Edit/Write).
- After each TypeScript file group is complete → invoke `kieran-typescript-reviewer`.
- After each Firestore-touching file → invoke `security-sentinel` (not just at the end).

### Phase 4 (Quality / Delivery) — ALL must pass, in order:
1. `superpowers:verification-before-completion` — run build, check output.
2. `/ui-review` — for every modified .tsx file with visual changes.
3. `/privacy-check` — for every Firestore read/write change.
4. `test-validator` agent — `npm run build` in app/ AND functions/, both exit 0.
5. Preview verification:
   - `preview_start` → `preview_screenshot` → `preview_console_logs`
   - Must show no console errors. Share screenshot as proof.
6. `code-simplifier` agent — simplify/refine all new code.
```

### Change 2 — `agents/claude-code.md`: Add conditional trigger table

```markdown
## Conditional Tool Triggers

| Condition | Invoke |
|-----------|--------|
| Modifying SocialContext.tsx | feature-dev:code-explorer on social + auth layers |
| Modifying firestoreService.ts | feature-dev:code-explorer; performance-oracle if schema changes |
| Adding/changing Firestore fields | data-integrity-guardian; performance-oracle |
| Any new TypeScript files/interfaces | kieran-typescript-reviewer after implementation |
| Any new .tsx UI files | /ui-review + preview_screenshot as delivery gates |
| Any PII fields touched | /privacy-check + privacy-auditor agent |
| Any security boundary (auth, rules) | security-sentinel |
| Unknown library / new API | context7 docs lookup first |
| Design new UI component from scratch | stitch-orchestrator or stitch-ui-design-spec-generator |
| Performance concern suspected | performance-oracle |
```

### Change 3 — `docs/WORKFLOW.md`: Add preview verification to delivery

In Section 2 Delivery, after step 3 (test-validator), add:

```markdown
4. **Preview verification** — for any `.tsx` visual change:
   - `preview_start` (if not running) → reload → `preview_screenshot`.
   - Check `preview_console_logs` — zero errors required.
   - Attach screenshot to task completion note.
```

### Change 4 — `docs/WORKFLOW.md`: Add Firestore schema change gate

In Section 5 Rules, under Privacy & Security, add:

```markdown
- Any new Firestore field or schema denormalization MUST pass:
  - `performance-oracle` review (read/write cost, index implications).
  - `data-integrity-guardian` review (migration safety, constraint gaps).
```

### Change 5 — `agents/AGENTS.md`: Add full skills list

The current skills section only lists 4 local skills. Add:

```markdown
## CE Workflow Skills (invoke with /skill-name)
- `/ce:plan` — Interactive planning with research agents
- `/ce:work` — Structured work execution (use for all implementation tasks)
- `/ce:brainstorm` — Collaborative ideation before planning
- `/deepen-plan` — Enhance plan sections with parallel research

## Superpowers Skills (invoke with /skill-name)
- `/systematic-debugging` — Structured debugging when root cause is unclear
- `/subagent-driven-development` — Parallel agents for independent task groups
- `/verification-before-completion` — Run verification before claiming done
- `/using-git-worktrees` — Isolated parallel development branches
- `/brainstorming` — Collaborative ideation (alternative to ce:brainstorm)

## Stitch-Kit Design Skills
- `stitch-orchestrator` — Master design workflow (new UI screens or major redesigns)
- `stitch-a11y` — WCAG 2.1 AA accessibility audit (auto-invoked by /ui-review)
- `stitch-react-components` — Convert design screen to React/Vite component
- `stitch-ui-design-spec-generator` — Generate design spec from requirements
- `stitch-mcp-generate-screen-from-text` — Text-to-UI prototyping
```

### Change 6 — `skills/external.md`: Update stale Codex references, add CE refs

Replace the stale `.codex` paths with current plugin paths:

```markdown
## Compound Engineering Skills
- ce:plan — `~/.claude/plugins/cache/compound-engineering-plugin/.../skills/ce-plan/`
- ce:work — `~/.claude/plugins/cache/compound-engineering-plugin/.../skills/ce-work/`
- ce:brainstorm — `~/.claude/plugins/cache/compound-engineering-plugin/.../skills/ce-brainstorm/`
- deepen-plan — `~/.claude/plugins/cache/compound-engineering-plugin/.../skills/deepen-plan/`
- systematic-debugging — `~/.claude/plugins/cache/claude-plugins-official/superpowers/.../systematic-debugging/`
```

### Change 7 — Create `project_plugin_integration.md`

Referenced in MEMORY.md but missing. Document the hybrid workflow:

```markdown
# Plugin Integration — Hybrid Workflow

## Backbone: ce:work + superpowers
- All implementation tasks use `/ce:work` as the execution framework.
- Superpowers skills (executing-plans, verification-before-completion) integrate inside ce:work phases.

## Specialized Review: CE Review Agents
Invoked as blocking gates at Phase 4 (Quality):
- kieran-typescript-reviewer (TypeScript implementation)
- security-sentinel (Firestore/auth changes)
- performance-oracle (schema/query changes)
- data-integrity-guardian (migration/model changes)
- code-simplifier (all new code — runs last)

## Auto-hooks (fires on every Edit/Write)
- security-guidance: PreToolUse — XSS/eval/injection check

## Design: Stitch-Kit
- /ui-review invokes Stitch for visual + a11y review.
- New screens: stitch-orchestrator first, then implement.

## Disabled Plugins
- interface-design: disabled, replaced by stitch-kit
- frontend-design: disabled, replaced by stitch-kit
```

### Change 8 — `docs/WORKFLOW.md` Section 4: Add missing tools to tables

The MCP Servers table is missing `Claude Preview`. The Skills table is missing CE skills.
The Specialized Review Agents table is missing `feature-dev:code-explorer`,
`feature-dev:code-architect`, `data-integrity-guardian`.

---

## Acceptance Criteria

- [x] `agents/claude-code.md` has explicit `ce:work` phase overrides section
- [x] `agents/claude-code.md` has conditional trigger table (10 rows minimum)
- [x] `docs/WORKFLOW.md` delivery step includes preview verification
- [x] `docs/WORKFLOW.md` includes Firestore schema change gate
- [x] `agents/AGENTS.md` lists all CE, Superpowers, and Stitch-Kit skills
- [x] `skills/external.md` updated to remove stale Codex refs, add CE refs
- [x] `project_plugin_integration.md` created with hybrid workflow documented
- [x] `docs/WORKFLOW.md` tools tables include Claude Preview + missing CE agents
- [x] MEMORY.md `project_plugin_integration.md` reference is valid (file exists)

---

## Priority Order

1. **`agents/claude-code.md`** — highest impact; this is what I read at every session start
2. **`docs/WORKFLOW.md`** — delivery gates + preview verification
3. **`project_plugin_integration.md`** — fixes missing MEMORY.md reference
4. **`agents/AGENTS.md`** — skills discovery
5. **`skills/external.md`** — cleanup
6. **`docs/WORKFLOW.md` tables** — documentation completeness

---

## Sources

- Agent rules: `agents/claude-code.md`, `agents/AGENTS.md`
- Workflow: `docs/WORKFLOW.md`, `docs/SYSTEM_RULES.md`
- Skills: `skills/REGISTRY.md`, `skills/external.md`, `skills/local/`
- Global command: `~/.claude/commands/ui-review.md`
- Plugin inventory: `~/.claude/settings.json` (14 plugins, 95+ skills)
- Memory: `~/.claude/projects/C--Admin-Projects-PetBase/memory/MEMORY.md`
