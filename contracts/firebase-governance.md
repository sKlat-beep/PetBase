# Firebase Governance Contract

## Scope
Firestore rules, Storage rules, Functions, and environment configuration.

## Constraints
- Validate Firebase configuration and rules against local files and emulator; do not guess or assume defaults.
- No secrets in repo or client bundle.
- Rules updates must be reviewed and tested in emulator before release.
- Functions must validate auth and input.
- Deploy only after Ready Release approval.

