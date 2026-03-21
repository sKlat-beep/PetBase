# Auto-Prevention Mode

## Supported Modes
- `off`
- `advisory`
- `assisted`
- `strict`

## Recommended Rollout
1. Start with `advisory`.
2. Promote proven high-confidence rules to `assisted`.
3. Reserve `strict` for CI/CD or production-sensitive paths.

## Performance Principle
Keep preflight deterministic-first and low latency. Deep reasoning belongs post-execution.
