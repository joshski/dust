# Replace Fixed Delays with vi.waitFor()

Replace fixed delay patterns with `vi.waitFor()` in test files where the delay waits for an async condition.

## Context

Several test files use fixed delays (5-200ms) to wait for async operations. This pattern is flaky on slower machines, slow (always waits the full delay), and non-deterministic across environments.

The fix is straightforward: use Vitest's `vi.waitFor()` which polls until a condition is met, failing with a clear message if the timeout expires.

## Locations

| File | Line | Delay | Replacement |
|------|------|-------|-------------|
| `lib/bucket/repository.test.ts` | 567 | 50ms | `await vi.waitFor(() => expect(sleepCalled).toBe(true))` |
| `lib/bucket/repository.test.ts` | 619 | 10ms polling | Convert existing polling loop to `vi.waitFor()` |
| `lib/bucket/repository.test.ts` | 664 | 50ms | `await vi.waitFor(() => expect(repoState.wakeUp).toBeDefined())` |
| `lib/bucket/repository.test.ts` | 792, 799 | 50ms | `await vi.waitFor()` for sleep resolver conditions |
| `lib/cli/commands/bucket-worker.test.ts` | 861 | 10ms | `await vi.waitFor(() => expect(connectionAttempts).toBe(2))` |
| `lib/cli/commands/bucket-worker.test.ts` | 1332 | 50ms | `await vi.waitFor()` for stderr assertion |
| `lib/cli/commands/bucket-worker.test.ts` | 1439 | 30ms | `await vi.waitFor()` for lifecycle assertion |
| `lib/cli/commands/bucket-worker.test.ts` | 1527 | 50ms | `await vi.waitFor()` for wokenUp assertion |
| `lib/loop/loop.test.ts` | 971 | 5ms polling | Convert existing polling loop to `vi.waitFor()` |
| `system-tests/bucket-worker-rpc.test.ts` | 131 | 200ms | `await vi.waitFor()` for event forwarding |

## Principles

- [Environment-Independent Tests](../principles/environment-independent-tests.md)
- [Reproducible Checks](../principles/reproducible-checks.md)
- [Fast Feedback](../principles/fast-feedback.md)

## Blocked By

(none)

## Definition of Done

- All fixed delays listed above are replaced with `vi.waitFor()`
- Existing polling loops are simplified to use `vi.waitFor()`
- All tests pass
- No new flakiness introduced
