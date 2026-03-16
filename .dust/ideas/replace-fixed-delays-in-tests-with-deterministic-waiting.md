# Replace Fixed Delays in Tests with Deterministic Waiting

Replace `await new Promise(r => setTimeout(r, N))` patterns in test files with deterministic waiting strategies.

## Current State

Several test files use fixed delays (10-200ms) to wait for async operations. This pattern is:

- **Flaky**: May fail on slower machines or under CI load
- **Slow**: Always waits the full delay even when the operation completes early
- **Non-deterministic**: Timing varies across environments

### Locations

| File | Line | Delay | Context |
|------|------|-------|---------|
| `lib/bucket/repository.test.ts` | 567, 664, 792, 799 | 50ms | Waiting for async state changes in repository loop tests |
| `lib/bucket/repository.test.ts` | 619 | 10ms | Polling loop with condition check |
| `lib/cli/commands/bucket-worker.test.ts` | 861, 1332, 1527 | 10-50ms | Waiting for async message handling |
| `lib/cli/commands/bucket-worker.test.ts` | 1439 | 30ms | Waiting for task-available restart |
| `lib/cli/commands/bucket-worker.test.ts` | 2100, 2112, 2129 | 150ms | Waiting for TUI render ticks |
| `lib/loop/loop.test.ts` | 971 | 5ms | Polling for event arrival |
| `system-tests/bucket-worker-rpc.test.ts` | 131 | 200ms | Waiting for proxy event forwarding |

### Patterns in Use

The codebase already uses several better patterns in other places:

1. **`setTimeout(r, 0)`** - Yields to event loop without arbitrary delay (acceptable)
2. **Polling with condition** - `for (let i = 0; i < 100 && !condition(); i++)` (reasonable but verbose)
3. **Injected sleep dependency** - Tests control timing via `loopDependencies.sleep` (ideal)

## Open Questions

### Which replacement strategy should be preferred?

#### Use vi.waitFor() from Vitest

Vitest's `vi.waitFor()` polls until a condition is met, failing with a clear message if the timeout expires. This is concise and integrates with the test framework:

```typescript
// Before
await new Promise(r => setTimeout(r, 50))
expect(state.lifecycle.type).toBe('running')

// After
await vi.waitFor(() => expect(state.lifecycle.type).toBe('running'))
```

This is best for simple state checks.

#### Use vi.useFakeTimers() for time-dependent code

For code that depends on actual time progression (like render loops or reconnect timers), fake timers provide deterministic control:

```typescript
vi.useFakeTimers()
// ...trigger async operation...
vi.advanceTimersByTime(150)
expect(frames.length).toBeGreaterThan(0)
vi.useRealTimers()
```

This is best for the TUI render tests (lines 2100, 2112, 2129).

#### Keep polling pattern for complex conditions

The existing polling pattern with short intervals is acceptable when the condition is complex:

```typescript
for (let i = 0; i < 100 && !hasExpectedEvents(); i++) {
  await new Promise(r => setTimeout(r, 5))
}
```

This avoids tight loops while providing a timeout. Could be extracted to a helper.

### Should we create a waitForCondition helper?

#### Create shared waitForCondition helper

A shared helper could standardize the polling pattern:

```typescript
async function waitForCondition(
  condition: () => boolean,
  options?: { timeoutMs?: number; intervalMs?: number }
): Promise<void>
```

This would replace ad-hoc polling loops and provide consistent timeout behavior. Tests would import and use a single well-tested utility instead of inline loops.

#### Use vi.waitFor() exclusively

Vitest's built-in `vi.waitFor()` already provides this functionality. Creating a custom helper adds maintenance burden without significant benefit. The syntax `await vi.waitFor(() => expect(x).toBe(y))` is concise and framework-native.

## Related

- [More Emulators](more-emulators.md) — Covers TimeEmulator concept but focuses on `Date.now()` spying rather than fixed delays
- [Stubs Over Mocks](../principles/stubs-over-mocks.md) — Injecting controllable time dependencies aligns with this principle
