# Gotcha Registry Skill (Minimal)

## Purpose
Store gotchas, return ranked matches, and update confidence over time.

## Required Capabilities
- deterministic matching
- semantic fallback
- context scoring
- preflight rule evaluation
- learning updates

## Core APIs
- `search_matches(event)`
- `evaluate_preflight(preflight_event, prevention_mode)`
- `store_gotcha(entry)`
- `update_learning(outcome)`
