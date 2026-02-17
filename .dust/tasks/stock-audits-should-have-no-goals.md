# Stock Audits Should Have No Goals

Add a test to ensure that all stock audits have just "(none)" as the goals section. Stock audits are designed to be used in downstream projects, so they should not link to dust-specific goals.

## Goals

- [Comprehensive Test Coverage](../goals/comprehensive-test-coverage.md)

## Blocked By

(none)

## Definition of Done

- [ ] Test in `lib/cli/commands/audit.test.ts` verifies all stock audit templates have `(none)` in their Goals section
- [ ] Test fails with the current stock audit templates
- [ ] Stock audit templates in `lib/audits/stock-audits.ts` updated to use `(none)` for Goals
- [ ] Test passes after the update
