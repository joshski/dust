# Migrate Network Double Casts To Typed Stubs

Remove unsafe double casts from the network boundary slice. Introduce typed test helpers for fetch-like dependencies and replace the production `defaultCreateWebSocket` double-cast with a typed adapter.

## Principles

- [Dependency Injection](../principles/dependency-injection.md)
- [Stubs Over Mocks](../principles/stubs-over-mocks.md)
- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md)
- [Make Changes with Confidence](../principles/make-changes-with-confidence.md)

## Facts

- [Vitest Testing](../facts/vitest-testing.md)
- [Biome Custom Rules](../facts/biome-custom-rules.md)

## Blocked By

- [Introduce Unsafe Double-Cast Lint Guardrail](./introduce-unsafe-double-cast-lint-guardrail.md)

## Definition of Done

- [ ] Network-related tests (`fetch`/WebSocket seams) no longer rely on `as unknown as`
- [ ] `defaultCreateWebSocket` no longer uses double-cast assertions
- [ ] Any temporary suppressions for this dependency category are removed
- [ ] Focused tests and full lint pass
