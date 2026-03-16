---
id: jcodemunch-contract
title: jCodeMunch Index - Maintenance and Agent Search Contract
description: |-
  Standing maintenance contract for the jCodeMunch index. This task is activated whenever re-indexing is needed
  (triggered manually by the user). Defines the canonical indexing command, repo ID update procedure, and search
  usage rules for all agents, LLMs, and skills.

  Current index state:
  - Repo ID: local/PetBase
  - Indexed: 2026-03-14
  - Scope: C:\Admin\Projects\PetBase (entire project root)

  Re-index command (run from project root):
  index_folder(
    path: C:\Admin\Projects\PetBase,
    incremental: false,
    use_ai_summaries: true,
    extra_ignore_patterns: []
  )

  After re-indexing:
  1. Note the new repo ID from the response
  2. Update this contract block with the new ID and date
  3. Update the repo ID in docs and contracts/jcodemunch-contract.md
priority: medium
tags:
  - dx
  - tooling
  - jcodemunch
  - maintenance
createdAt: "2026-03-09T21:44:47.009Z"
contract:
  status: delivered
  deliverables:
    - type: docs
      path: planning/dev-log.md
      description: Entry noting new repo ID and index stats after each re-index
  constraints:
    - CURRENT REPO ID: local/PetBase
    - NEVER call index_folder automatically; re-indexing is user-initiated only
    - All agents must use get_repo_outline first to orient before any file-level lookups
    - Use get_file_outline then get_symbol to locate code; do not read raw files when a symbol exists
    - Use search_symbols for cross-file queries; use search_text only when symbol search returns no results
    - Context minimization: request only the symbols you need; do not bulk-load entire files
    - The index covers the entire project root; expect results for app, functions, docs, tools, and configs
updatedAt: "2026-03-14T14:35:11.792Z"
assignee: any
relatedFiles:
  - docs/SYSTEM_RULES.md
  - planning/TODO.md
---

## Description
Standing maintenance contract for the jCodeMunch index. Activated whenever re-indexing is needed (manual only).

Current index state:
- Repo ID: local/PetBase
- Indexed: 2026-03-10
- Scope: C:\Admin\Projects\PetBase (entire project root)

Re-index command (run from project root):
index_folder(
  path: C:\Admin\Projects\PetBase,
  incremental: false,
  use_ai_summaries: true,
  extra_ignore_patterns: []
)

After re-indexing:
1. Note the new repo ID from the response
2. Update the repo ID in this contract and docs/SYSTEM_RULES.md
