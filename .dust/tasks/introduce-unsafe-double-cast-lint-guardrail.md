# Introduce Unsafe Double-Cast Lint Guardrail

Add a lint rule that flags `as unknown as` in test files and supports narrowly scoped, line-level suppressions for unavoidable interop boundaries.

## Principles

- [Lint Everything](../principles/lint-everything.md)
- [Make Changes with Confidence](../principles/make-changes-with-confidence.md)
- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md)
- [Small Units](../principles/small-units.md)

## Facts

- [Biome Custom Rules](../facts/biome-custom-rules.md)
- [Vitest Testing](../facts/vitest-testing.md)

## Blocked By

(none)

## Definition of Done

- [ ] A Biome rule reports `as unknown as` in `*.test.ts` files
- [ ] The rule supports explicit, local suppressions (no broad directory-level disable)
- [ ] Existing unavoidable cases are suppressed with short rationale comments
- [ ] Lint and tests pass with the new guardrail enabled
