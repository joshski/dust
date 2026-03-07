# Migrate Runtime IO Double Casts To Typed Stubs

Complete the rollout by removing remaining test-side double casts in runtime IO boundaries. Use typed helpers for TTY, process streams, and adjacent environment seams, then tighten lint so no unsuppressed `as unknown as` remains in tests.

## Principles

- [Keep Unit Tests Pure](../principles/keep-unit-tests-pure.md)
- [Test Isolation](../principles/test-isolation.md)
- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md)
- [Boy Scout Rule](../principles/boy-scout-rule.md)

## Facts

- [Vitest Testing](../facts/vitest-testing.md)
- [Biome Custom Rules](../facts/biome-custom-rules.md)

## Blocked By

- [Migrate Process Double Casts To Typed Stubs](./migrate-process-double-casts-to-typed-stubs.md)

## Definition of Done

- [ ] Remaining runtime-IO test double casts are removed or replaced with typed seams
- [ ] Suppressions that are no longer needed are deleted
- [ ] The lint rule is enforced with only intentionally documented exceptions
- [ ] Full `bin/dust check` passes
