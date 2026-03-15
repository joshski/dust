# Fix no-unsafe-optional-chaining Violations

Remove unsafe optional chaining in type assertions to comply with oxlint's `no-unsafe-optional-chaining` rule from the suspicious category.

## Context

The `no-unsafe-optional-chaining` rule flags 2 violations where optional chaining is used in contexts that would throw if the value is `undefined`. Specifically, using `?.` on a value that's then immediately cast or accessed unsafely defeats the purpose of optional chaining.

The violations are in test assertions in `lib/loop/loop.test.ts`:
- `(claudeEvent?.event as {...}).rawEvent` - would throw if `claudeEvent` is undefined
- `(sessionStarted?.event as {...}).title` - would throw if `sessionStarted` is undefined

Since these are test assertions where the values should always be defined, the fix is to assert they exist first using `expect().toBeDefined()` and then access without optional chaining.

## Approach

1. Run `bunx oxlint -D suspicious --filter no-unsafe-optional-chaining` to list all violations
2. For each violation:
   - Add an assertion that the value is defined
   - Remove the optional chaining `?.` since we've asserted it exists
3. Run `bin/dust check` to verify tests still pass
4. Run `bunx oxlint -D suspicious --filter no-unsafe-optional-chaining` to confirm zero violations

## Principles

- [Lint Everything](../principles/lint-everything.md)
- [Comprehensive Assertions](../principles/comprehensive-assertions.md)

## Blocked By

(none)

## Definition of Done

- [ ] Unsafe optional chaining patterns replaced with proper assertions
- [ ] `bunx oxlint -D suspicious --filter no-unsafe-optional-chaining` reports zero violations
- [ ] `bin/dust check` passes
