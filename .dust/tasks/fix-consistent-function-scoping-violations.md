# Fix consistent-function-scoping Violations

Move or inline functions that don't capture variables from their parent scope. This fixes violations of oxlint's `consistent-function-scoping` rule.

## Context

The `consistent-function-scoping` rule flags ~25 violations. Functions that don't capture any variables from their enclosing scope can be moved to module level or inlined. This improves:
- Memory efficiency (no closure allocation per call)
- Testability (functions can be tested in isolation)
- Readability (clearer that function is stateless)

Most violations are in test files where helper functions are defined inside test blocks but don't capture any local variables. These can be extracted to the test file's module scope.

## Approach

1. Run `bunx oxlint -D suspicious --filter consistent-function-scoping` to list all violations
2. For each violation, either:
   - Move the function to module scope if it's reusable
   - Inline simple functions if they're one-liners
   - Add a captured variable if scope capture is actually needed (rare)
3. Run `bin/dust check` to verify tests still pass
4. Run `bunx oxlint -D suspicious --filter consistent-function-scoping` to confirm zero violations

## Principles

- [Lint Everything](../principles/lint-everything.md)
- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md)

## Blocked By

(none)

## Definition of Done

- [ ] All flagged functions moved to appropriate scope or inlined
- [ ] `bunx oxlint -D suspicious --filter consistent-function-scoping` reports zero violations
- [ ] `bin/dust check` passes
