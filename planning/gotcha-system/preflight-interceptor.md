# Preflight Interceptor

## Purpose
Run fast preventative checks before command execution.

## Modes
- `off`
- `advisory`
- `assisted`
- `strict`

## Tiered Design
### Tier 1: always-on fast path
- command tokenization
- exact/rule lookup
- environment checks
- cached prerequisite checks

### Tier 2: selective checks for risky commands
Apply to command families such as:
- deploy
- publish
- migration
- delete/reset
- auth/config mutation

Tier 2 may include:
- recent workflow history
- prerequisite step validation
- ranked contextual rules

## Actions
### allow
Command proceeds unchanged.

### warn
Surface risk and suggested next step.

### suggest_fix
Recommend a prerequisite action.

### suggest_modified_command
Offer a safer equivalent, with approval where required.

### block
Prevent execution when strict-mode thresholds are met.

## Hard Rule
When `prevention_mode = off`, this layer returns `allow` without evaluating rules.
