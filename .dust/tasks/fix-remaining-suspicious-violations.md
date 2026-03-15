# Fix Remaining suspicious Violations

Fix any remaining violations from oxlint's suspicious category not covered by other tasks.

## Context

After fixing the major violation categories, a few miscellaneous violations remain:
- `no-array-reverse`: 1 violation - Use `toReversed()` instead of `reverse()`
- `no-unused-vars`: 1 violation - Variable declared but never used
- `no-useless-spread`: 1 violation - Unnecessary spread operator
- `no-new-array`: 1 violation - Avoid `new Array(n)` syntax

These are minor fixes that don't warrant individual tasks.

## Approach

1. Run `bunx oxlint -D suspicious` to see all remaining violations
2. Fix each violation:
   - Replace `.reverse()` with `.toReversed()`
   - Remove or prefix unused variables with `_`
   - Remove unnecessary spread operators
   - Replace `new Array(n)` with `Array.from({length: n})` or appropriate alternative
3. Run `bin/dust check` to verify tests still pass
4. Run `bunx oxlint -D suspicious` to confirm only known rule violations remain

## Principles

- [Lint Everything](../principles/lint-everything.md)
- [Stop the Line](../principles/stop-the-line.md)

## Blocked By

(none)

## Definition of Done

- [ ] All miscellaneous suspicious violations fixed
- [ ] `bin/dust check` passes
