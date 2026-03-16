# Release Quality Contract

## Required Checks
- `cd app && npm run build`
- `cd functions && npm run build`
- `tsc --noEmit` if applicable

## Constraint
- Release is blocked if any required check fails.
