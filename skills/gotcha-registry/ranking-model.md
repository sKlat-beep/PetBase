# Ranking Model

## Goal
Return the most reliable gotcha first while suppressing noisy matches.

## Inputs
- deterministic_match_strength
- semantic_similarity_score
- context_match_score
- recurrence_count
- acceptance_rate
- fix_success_rate
- false_positive_rate
- recency_score
- override_rate

## Suggested Weighted Model
Use a weighted blend where deterministic evidence dominates, followed by context reliability and historical effectiveness.

Example conceptual weighting:
- deterministic strength: 0.35
- semantic similarity: 0.20
- context relevance: 0.15
- fix success rate: 0.15
- acceptance history: 0.10
- recency and recurrence: 0.05

Apply penalties for:
- false positives
- repeated overrides
- stale entries with poor recent outcomes

## Output Requirements
Each match result should include:
- `rank_score`
- `confidence`
- `confidence_band`
- `ranking_explanation`
- `suppressed` flag when applicable

## Confidence Bands
- low: < 0.45
- medium: 0.45 to < 0.75
- high: >= 0.75

## Suppression Guidance
Suppress or de-rank entries that:
- are repeatedly rejected
- have low fix success
- are frequently overridden in similar contexts
