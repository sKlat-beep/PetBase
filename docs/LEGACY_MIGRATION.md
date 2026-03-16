# Legacy Migration Map

This file maps legacy rules/artifacts to their new locations.

| Legacy Source | Legacy Rule or Artifact | New Location |
|---|---|---|
| rollback CLAUDE.md | Core directives + system instructions | docs/SYSTEM_RULES.md + agents/claude-code.md |
| rollback petbase-system-instructions.md | No-Cloud PII policy, jcodemunch rules, testing protocol, fallback roles | docs/SYSTEM_RULES.md |
| prebrainbackup CLAUDE.md | Legacy system instructions and tool mandates | docs/SYSTEM_RULES.md + agents/claude-code.md |
| privacy-contract (logs) | Full privacy field dictionaries + tokenization rules | contracts/privacy-contract.md |
| jcodemunch-contract (logs) | Indexing contract and repo ID update procedure | contracts/jcodemunch-contract.md |
| unified-ui-design (logs) | Unified UI constraints (desktop + mobile) | contracts/unified-ui-design.md |
| .brainfile/ board + logs | Task orchestration, kanban board, task history | planning/TODO.md + planning/dev-log.md |
| brainfile-intake skill | Task intake and contract mapping | skills/local/intake/SKILL.md |
| privacy-audit skill | Privacy compliance verification | skills/local/privacy-check/SKILL.md |
| ui-consistency skill | UI contract enforcement | skills/local/ui-review/SKILL.md |
| docs/WORKFLOW.md (Brainfile YAML) | Orchestration YAML, contract pickup/deliver flows | docs/WORKFLOW.md (plain workflow) |
