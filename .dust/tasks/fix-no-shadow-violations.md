# Fix no-shadow Violations

Rename variables that shadow outer scope declarations to comply with oxlint's `no-shadow` rule from the suspicious category.

## Context

The `no-shadow` rule flags 12 violations where inner variables shadow outer ones. Variable shadowing can lead to bugs when the programmer intends to reference the outer variable but accidentally references the inner one, or vice versa.

Current violations include:
- `options` shadowed in nested functions
- `b` shadowed in sort comparators
- `audit`, `resolve`, `check`, `readdir` shadowed in various contexts

## Approach

1. Run `bunx oxlint -D suspicious --filter no-shadow` to list all violations
2. For each violation, rename the inner variable to avoid shadowing:
   - Use more specific names (e.g., `loggerOptions` instead of `options`)
   - Use different letters in sort comparators (e.g., `x, y` instead of `a, b`)
3. Run `bin/dust check` to verify tests still pass
4. Run `bunx oxlint -D suspicious --filter no-shadow` to confirm zero violations

## Principles

- [Lint Everything](../principles/lint-everything.md)
- [Naming Matters](../principles/naming-matters.md)

## Blocked By

(none)

## Definition of Done

- [ ] All shadowed variables renamed to unique names
- [ ] `bunx oxlint -D suspicious --filter no-shadow` reports zero violations
- [ ] `bin/dust check` passes
