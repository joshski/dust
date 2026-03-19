# Extract Message Effect Executor

Extract message-related effect execution from `executeEffects` in `bucket-worker.ts` into a testable, type-narrowed function.

## Context

The `executeEffects` function (lines 725-828) handles multiple effect categories in a single switch statement. Per the decision to "split by effect category," this task extracts message effects (`log`, `debugLog`, `syncUI`, `handleRepositoryList`, `signalTaskAvailable`, `storeToolDefinitions`, `connectionReady`, `connectionRejected`) into a dedicated executor.

The current function is excluded from coverage (`/* v8 ignore */`) because it mixes pure effect interpretation with side-effect execution. By extracting a narrower executor with explicit dependencies, the logic becomes testable without integration tests.

## Implementation

1. Define a union type `MessageEffect` covering the message-related effect types
2. Create `executeMessageEffect(effect: MessageEffect, dependencies: MessageEffectDeps): void`
3. The new function receives only the dependencies it needs (no token, no reconnect scheduling)
4. Update `executeEffects` to delegate message effects to the new function
5. Write unit tests that verify effect interpretation without WebSocket connections

## Out of Scope

- Lifecycle effects (`scheduleReconnect`) remain in `executeLifecycleEffects`
- Keypress effects remain in `executeKeypressEffects`
- The helper functions (`toRepositoryDependencies`, `signalTaskAvailable`) are not extracted in this task

## Blocked By

(none)

## Principles

- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md)
- [Design for Testability](../principles/design-for-testability.md)
- [Unit Test Coverage](../principles/unit-test-coverage.md)

## Definition of Done

- `executeMessageEffect` function exists with narrowed type signature
- Unit tests cover each message effect type
- Coverage exclusion removed from message effect handling code
- `bin/dust check` passes
