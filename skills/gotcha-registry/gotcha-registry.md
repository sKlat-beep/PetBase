# Gotcha Registry Skill

## Purpose
The Gotcha Registry is the shared memory and retrieval layer for known workflow issues, preventative rules, confidence data, and ranking metadata.

## Responsibilities
- Store approved gotcha entries.
- Maintain deterministic and semantic indexes.
- Return ranked matches for post-execution events.
- Return preventative-rule decisions for preflight events.
- Update confidence and effectiveness metrics over time.
- Support suppression of noisy or low-value entries.

## Core Operations
### 1. `search_matches(event)`
Returns ranked match candidates for post-execution analysis.

### 2. `evaluate_preflight(preflight_event, prevention_mode)`
Returns allow/warn/suggest/block decisions.

### 3. `store_gotcha(entry)`
Stores a user-approved gotcha entry.

### 4. `update_learning(outcome)`
Updates confidence, effectiveness, rank features, recency, and suppression state.

### 5. `list_preventative_rules(command_family, environment)`
Returns active rules relevant to a command family and context.

## Matching Strategy
1. Deterministic match
   - exact command fragments
   - regex patterns
   - token fingerprints
2. Semantic similarity
   - embedding or stack-native equivalent
3. Context scoring
   - tool
   - phase
   - environment
   - command family
4. Historical weighting
   - prior correctness
   - fix success rate
   - recurrence rate
   - false positive suppression

## Rank Formula Requirements
Rank scores should combine:
- deterministic strength
- semantic similarity
- context relevance
- acceptance history
- fix success history
- recency
- recurrence
- false positive penalty

## Returned Match Result
```json
{
  "matched": true,
  "matches": [
    {
      "gotcha_id": "gtc-001",
      "name": "Expired Registry Token",
      "rank_score": 0.93,
      "confidence": 0.91,
      "confidence_band": "high",
      "match_type": "deterministic",
      "recommended_fix": "Refresh registry credentials",
      "preventative_rule": {},
      "ranking_explanation": "Exact signature match with strong prior fix success"
    }
  ]
}
```

## Learning Requirements
Each gotcha entry must maintain:
- acceptance_count
- rejection_count
- fix_success_count
- fix_failure_count
- prevention_warning_accepted_count
- prevention_warning_ignored_count
- override_count
- false_positive_count
- recurrence_count
- last_seen_at
- last_success_at
- suppression_state

## Safety Rules
- Do not surface low-confidence preventative blocks in developer workflows by default.
- In strict mode, only block when rule severity and confidence both exceed configured thresholds.
- Preserve version history on gotcha updates.
