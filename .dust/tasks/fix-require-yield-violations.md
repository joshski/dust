# Fix require-yield Violations

Add `yield` statements or convert generator functions that don't yield to comply with oxlint's `require-yield` rule from the suspicious category.

## Context

The `require-yield` rule flags 5 violations where generator functions (`function*` or `async *`) don't contain any `yield` expressions. A generator without `yield` is likely a mistake—the function could be a regular function or async function instead.

These violations appear in test mocks that simulate async iterators but don't actually yield any values (they just complete immediately or throw).

## Approach

1. Run `bunx oxlint -D suspicious --filter require-yield` to list all violations
2. For each violation, either:
   - Add a `yield` expression if the generator should produce values
   - Convert to a regular async function if iteration isn't needed
   - For empty iterators, add `yield* []` to explicitly yield nothing
3. Run `bin/dust check` to verify tests still pass
4. Run `bunx oxlint -D suspicious --filter require-yield` to confirm zero violations

## Principles

- [Lint Everything](../principles/lint-everything.md)
- [Stop the Line](../principles/stop-the-line.md)

## Blocked By

(none)

## Definition of Done

- [ ] All generator functions either yield values or are converted to regular functions
- [ ] `bunx oxlint -D suspicious --filter require-yield` reports zero violations
- [ ] `bin/dust check` passes
