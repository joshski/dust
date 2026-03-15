# Fix no-array-sort Violations

Replace all `Array#sort()` calls with `Array#toSorted()` to comply with oxlint's `no-array-sort` rule from the suspicious category.

## Context

The `no-array-sort` rule flags 32 violations across the codebase. The rule catches a common source of bugs: `sort()` mutates the original array in place, which can lead to unexpected side effects. The `toSorted()` method returns a new sorted array without modifying the original.

Current violations include:
- Test assertions using `.sort()` on arrays before comparison
- Utility functions sorting arrays in place
- Error message generation sorting keys

Each fix is mechanical: replace `.sort()` with `.toSorted()`. Since `toSorted()` returns a new array, no behavioral changes should occur in cases where the original array isn't reused.

## Approach

1. Run `bunx oxlint -D suspicious --filter no-array-sort` to list all violations
2. For each violation, replace `.sort()` with `.toSorted()`
3. Run `bin/dust check` to verify tests still pass
4. Run `bunx oxlint -D suspicious --filter no-array-sort` to confirm zero violations

## Principles

- [Lint Everything](../principles/lint-everything.md)
- [Stop the Line](../principles/stop-the-line.md)

## Blocked By

(none)

## Definition of Done

- [ ] All `.sort()` calls replaced with `.toSorted()` where flagged
- [ ] `bunx oxlint -D suspicious --filter no-array-sort` reports zero violations
- [ ] `bin/dust check` passes
