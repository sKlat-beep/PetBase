# Prevention Orchestrator

## Purpose
Coordinate prevention mode, thresholds, and routing between planning hooks and the registry skill.

## Responsibilities
- Read config.
- Decide whether preflight is enabled.
- Route preflight events to registry evaluation.
- Apply advisory, assisted, or strict behavior.
- Enforce user-confirmation requirements for modifications.
- Record outcome signals for confidence learning.

## Recommended Defaults
Developer workflow:
- prevention_mode: advisory
- preflight_enabled: true
- minimum_confidence_to_warn: medium
- minimum_confidence_to_block: very_high

CI or production:
- prevention_mode: strict
- preflight_enabled: true
- minimum_confidence_to_warn: medium
- minimum_confidence_to_block: high
