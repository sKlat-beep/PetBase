# Confidence Learning

## Purpose
Continuously improve gotcha quality, ranking, and preventative-rule reliability from observed outcomes.

## Learning Signals
- match accepted
- match rejected
- fix attempted
- fix succeeded
- fix failed
- warning accepted
- warning ignored
- block overridden
- issue recurred
- issue resolved after guidance

## Update Rules
### Increase confidence when
- a fix is applied and the next run succeeds
- a preflight warning prevents a repeat failure
- the same signature repeatedly resolves with the same guidance

### Decrease confidence when
- the user rejects the match
- the suggested fix fails repeatedly
- a warning is shown but repeatedly ignored because it is irrelevant
- the entry causes false positives

## Persistence
Store per-gotcha:
- confidence_profile
- effectiveness_metrics
- learning_history summary
- timestamps for last_seen and last_success

## Output Requirement
Every post-execution and preflight result should declare whether learning state changed.
