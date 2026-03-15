# Enable oxlint suspicious Category

Add `-D suspicious` to the oxlint check configuration to enable the suspicious rule category in CI.

## Context

After all suspicious category violations have been fixed by prior tasks, the category can be enabled. This adds ~50 additional lint rules that catch common code quality issues, improving static analysis coverage.

The change involves updating the oxlint command in the check configuration to include `-D suspicious`.

## Approach

1. Verify `bunx oxlint -D suspicious` reports zero violations
2. Update the check configuration to add `-D suspicious` to the oxlint command
3. Run `bin/dust check` to verify the linter passes with the new rules enabled

## Principles

- [Lint Everything](../principles/lint-everything.md)
- [Fast Feedback Loops](../principles/fast-feedback-loops.md)
- [Stop the Line](../principles/stop-the-line.md)

## Blocked By

- [Fix no-array-sort Violations](fix-no-array-sort-violations.md)
- [Fix prefer-add-event-listener Violations](fix-prefer-add-event-listener-violations.md)
- [Fix consistent-function-scoping Violations](fix-consistent-function-scoping-violations.md)
- [Fix no-shadow Violations](fix-no-shadow-violations.md)
- [Fix require-yield Violations](fix-require-yield-violations.md)
- [Fix no-control-regex Violations](fix-no-control-regex-violations.md)
- [Fix no-unsafe-optional-chaining Violations](fix-no-unsafe-optional-chaining-violations.md)
- [Fix Remaining suspicious Violations](fix-remaining-suspicious-violations.md)

## Definition of Done

- [ ] `-D suspicious` added to oxlint configuration
- [ ] `bin/dust check` passes with suspicious category enabled
