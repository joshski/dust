# Create TimeEmulator for TUI Render Tests

Replace fixed delays in TUI render tests with a dependency-injected TimeEmulator that provides deterministic control over time progression.

## Context

The TUI render tests in `bucket-worker.test.ts` use 150ms delays to wait for render loop ticks. These delays are testing time-dependent behavior (render frames accumulating over time), which requires different treatment than simple async state waiting.

Per project decisions:
- Use our own fake timers implementation via dependency injection (not `vi.useFakeTimers()` globals)
- Aligns with [Stubs Over Mocks](../principles/stubs-over-mocks.md) and [Dependency Injection](../principles/dependency-injection.md)

## Locations

| File | Line | Delay | Purpose |
|------|------|-------|---------|
| `lib/cli/commands/bucket-worker.test.ts` | 2100 | 150ms | Wait for render frames |
| `lib/cli/commands/bucket-worker.test.ts` | 2112 | 150ms | Verify render stopped |
| `lib/cli/commands/bucket-worker.test.ts` | 2129 | 150ms | Verify no frames while shutting down |

## Implementation Approach

1. Create `TimeEmulator` with `advance(ms)` method that controls `setTimeout`/`setInterval` registered via dependency
2. Add `createTimeout`/`createInterval` to `BucketDependencies`
3. Update `setupTUI` to use injected timer functions
4. Update tests to use `TimeEmulator.advance()` instead of fixed delays

## Principles

- [Dependency Injection](../principles/dependency-injection.md)
- [Stubs Over Mocks](../principles/stubs-over-mocks.md)
- [Environment-Independent Tests](../principles/environment-independent-tests.md)
- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md)

## Blocked By

(none)

## Definition of Done

- TimeEmulator exists with `advance(ms)` method
- TUI render loop uses injected timer dependency
- Tests use TimeEmulator instead of fixed 150ms delays
- All tests pass deterministically
