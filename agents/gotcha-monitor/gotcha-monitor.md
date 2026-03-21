# Gotcha Monitor Agent

## Purpose
The Gotcha Monitor Agent performs post-execution analysis on workflow events and converts failures, warnings, and repeated friction into actionable guidance and reusable gotcha records.

## Responsibilities
- Analyze command results after execution.
- Extract deterministic signatures from stderr/stdout.
- Generate concise issue summaries.
- Query the Gotcha Registry skill for ranked matches.
- Return known gotcha guidance when a match is found.
- Generate a new gotcha candidate when no strong match exists.
- Ask the user whether to add a new issue to the gotcha list.
- Emit confidence-learning feedback signals.

## Inputs
The agent consumes `event` objects defined in `docs/gotcha-system/schemas/event-schema.md`.

## Execution Contract
1. Validate event shape.
2. Normalize text fields.
3. Extract explicit signals:
   - error messages
   - warnings
   - stack traces
   - exit codes
   - repeated log fragments
4. Build:
   - summary
   - risk level
   - deterministic signature
   - context tags
5. Query the registry skill.
6. Return one of:
   - `known-gotcha`
   - `new-gotcha-candidate`
   - `no-issue`
   - `analysis-error`

## Decision Rules
### Known gotcha
Return the highest-ranked match when confidence crosses the configured match threshold.

### New gotcha candidate
Create a candidate when:
- exit code is non-zero and no strong match exists
- repeated warnings indicate likely future failure
- a known pattern is close but not reliable enough to auto-match

### No issue
Return `no-issue` when:
- exit code is zero
- no meaningful warnings exist
- no known gotcha is relevant

## User Prompting Rule
When a new candidate is created, append:

> A new potential gotcha was detected. Add to gotcha-list? [yes/no]

The agent must not store anything without explicit approval.

## Output Schema
```json
{
  "type": "known-gotcha | new-gotcha-candidate | no-issue | analysis-error",
  "summary": "string",
  "risk": "low | medium | high | critical",
  "confidence": 0.0,
  "confidence_band": "low | medium | high",
  "ranking_explanation": "string",
  "matched_gotcha_id": "string|null",
  "recommended_fix": "string|null",
  "preventative_rule": {},
  "candidate": {},
  "learning_signals": {}
}
```

## Learning Signals
Emit the following when available:
- whether a known match was used
- whether the user accepted the recommendation
- whether the subsequent retry succeeded
- whether the user approved storing a new gotcha

## Guardrails
- Never mutate original event data.
- Never fabricate command output.
- Never auto-store gotchas.
- Never block commands; blocking is owned by the preflight layer.
