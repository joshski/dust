# Hunt down memory leaks

Running `dust bucket` will eventually use all memory. This idea explores identifying and fixing the memory leaks that cause unbounded memory growth during long-running bucket sessions.

## Context

The `dust bucket` command (`lib/cli/commands/bucket.ts`) is a long-running process that:

1. Connects to a dustbucket server via WebSocket
2. Manages multiple repository loops concurrently
3. Each repository runs a continuous loop (`lib/bucket/repository-loop.ts`) that picks tasks and runs Claude sessions
4. Uses a terminal UI with log buffers to display output

Several patterns in the current implementation may cause memory accumulation over extended runs.

### Identified Leak Candidate: Unresolved Sleep Promises in Repository Loop

In `lib/bucket/repository-loop.ts:168-182`, when `no_tasks` is returned:

```typescript
await new Promise<void>(resolve => {
  repoState.wakeUp = () => {
    repoState.wakeUp = undefined
    resolve()
  }
  sleep(FALLBACK_TIMEOUT_MS).then(() => {
    if (repoState.wakeUp) {
      repoState.wakeUp = undefined
      resolve()
    }
  })
})
```

The `sleep(300000)` Promise creates a `.then()` callback that holds references to `repoState.wakeUp` and `resolve` for 5 minutes. When `wakeUp()` is called early (e.g., by a `task-available` message), the Promise resolves, but the sleep callback continues to hold references until its timeout fires. With many repositories and frequent task-available signals, these dangling callbacks accumulate.

### Identified Leak Candidate: WebSocket Handler Accumulation

In `lib/cli/commands/bucket.ts:448-611`, the `connectWebSocket` function assigns handlers (`ws.onopen`, `ws.onclose`, `ws.onerror`, `ws.onmessage`) directly. On reconnection, new handlers are assigned, but if the old WebSocket object persists briefly, old handlers with captured closures may retain state.

### Well-Managed Patterns

Some patterns that might appear risky are actually well-managed:

- **Log buffers** use a ring buffer with bounded size (max 5000 lines, trims to 3000)
- **Repository Maps** are cleaned up during `syncTUI` and shutdown
- **Signal handlers** are properly removed via cleanup functions
- **Render interval** is cleared on cleanup

## Implementation Considerations

### Fixing the Sleep Promise Leak

Use an `AbortController` to cancel the sleep Promise when `wakeUp` is called:

```typescript
const abortController = new AbortController()
await new Promise<void>(resolve => {
  repoState.wakeUp = () => {
    repoState.wakeUp = undefined
    abortController.abort()
    resolve()
  }
  sleep(FALLBACK_TIMEOUT_MS, { signal: abortController.signal })
    .then(() => { /* ... */ })
    .catch(() => { /* aborted, ignore */ })
})
```

This requires modifying the `sleep` function signature to accept an abort signal.

### Memory Profiling

Before fixing, we should profile to confirm these are actual leaks and measure their impact:

- Node.js `--inspect` flag with Chrome DevTools heap snapshots
- Compare heap snapshots at startup vs. after running for extended period
- Track object counts for Promises, closures, and Map entries

This relates to the [Stop the Line](../goals/stop-the-line.md) goal — identifying resource exhaustion before it causes failures.

## Open Questions

### How should we measure memory usage to confirm the leak?

#### Automated memory monitoring during tests

Add integration tests that run `dust bucket` for a simulated period, periodically sampling `process.memoryUsage()`. Fail if heap usage grows beyond expected bounds. This catches regressions but requires realistic test scenarios.

#### Manual profiling session

Run `dust bucket` with `--inspect`, take heap snapshots at intervals, and analyze growth patterns manually. This gives detailed insight but is time-consuming and not automated.

#### Emit memory metrics to external monitoring

Add periodic logging of `process.memoryUsage()` that could be scraped by monitoring systems. Useful for production visibility but doesn't directly confirm the fix worked.

### Should the `sleep` function support abort signals?

#### Yes, add AbortController support to the existing sleep

Modify the `sleep` helper to accept an optional `{ signal: AbortSignal }` option. When aborted, the Promise rejects immediately. This is the standard pattern for cancellable async operations.

#### Use a different cancellation pattern

Instead of AbortController, use a simple `cancelled` boolean flag or a custom cancellation token. This avoids the AbortController API but is non-standard.

#### Refactor to avoid needing cancellable sleep

Restructure the wait logic to not require a timeout at all — e.g., use a shared event emitter pattern where the loop simply awaits a `'wake'` event with no fallback timeout. This is a larger refactor but may be cleaner.

### What is the acceptable memory growth rate for a long-running bucket session?

#### Bounded memory with steady state

Memory should reach a steady state based on the number of active repositories and log buffer sizes. Growth beyond this steady state indicates a leak.

#### Growth proportional to work done

Some growth is acceptable if proportional to cumulative work (e.g., total tasks completed). Unbounded growth while idle is unacceptable.

#### Strict no-growth policy

After initial warmup, memory usage should not increase. Any persistent growth, however small, should be treated as a bug.

### Should we add memory-related instrumentation to dustbucket server monitoring?

#### Yes, emit memory metrics in agent events

Include `heapUsed` and `heapTotal` in periodic heartbeat events sent to the server. This enables server-side alerting on memory issues across the fleet.

#### No, keep it local

Memory monitoring should be a local concern. Agents can log warnings locally if memory exceeds thresholds, but don't need to report to the server.

#### Optional, configurable per-agent

Add a setting to enable/disable memory telemetry. Some deployments may want visibility; others may prefer minimal event traffic.
