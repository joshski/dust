# Migrate Process Double Casts To Typed Stubs

Refactor process-execution tests (`spawn`, `ChildProcess`, `readline`) to use typed factories. The factories should model only the required contract and avoid `as unknown as`.

## Principles

- [Dependency Injection](../principles/dependency-injection.md)
- [Stubs Over Mocks](../principles/stubs-over-mocks.md)
- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md)
- [Readable Test Data](../principles/readable-test-data.md)

## Facts

- [Vitest Testing](../facts/vitest-testing.md)
- [Biome Custom Rules](../facts/biome-custom-rules.md)

## Blocked By

- [Migrate Network Double Casts To Typed Stubs](./migrate-network-double-casts-to-typed-stubs.md)

## Definition of Done

- [ ] Process-execution tests replace double casts with typed stubs/factories
- [ ] Shared helpers are extracted where patterns repeat across command tests
- [ ] Any temporary suppressions for this dependency category are removed
- [ ] Focused tests and full lint pass
