# Throttle Heartbeat Events

Reduce the frequency of `agent-session-activity` heartbeat events from once-per-stream-event to at most once per 5 seconds per agent session.

## Why

The current implementation emits a heartbeat for every `stream_event` from Claude — often 50-100+ per agent response. This creates unnecessary network traffic when events are sent to a remote server. A heartbeat every 5 seconds is sufficient to indicate agent liveness.

## Implementation

Create a `createHeartbeatThrottler()` factory function in `lib/agent-events.ts` that returns an `onRawEvent` callback with built-in throttling. The throttler:

1. Tracks the last heartbeat timestamp per agent session
2. Returns `agent-session-activity` at most once per 5 seconds
3. Forwards all other events (non-stream events become `claude-event`)

```typescript
export function createHeartbeatThrottler(
  onAgentEvent: (event: AgentSessionEvent) => void,
  options?: { intervalMs?: number; now?: () => number }
): (rawEvent: Record<string, unknown>) => void
```

The `options.now` parameter enables deterministic testing. Default interval is 5000ms.

Update both `loop.ts` and `repository-loop.ts` to use the throttler instead of calling `rawEventToAgentEvent()` directly.

Keep `rawEventToAgentEvent()` as a pure function — the throttling state lives in the factory-created closure.

## Principles

- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md)
- [Unit Test Coverage](../principles/unit-test-coverage.md)

## Blocked By

(none)

## Definition of Done

- [ ] `createHeartbeatThrottler()` factory function is added to `lib/agent-events.ts`
- [ ] Factory accepts optional `intervalMs` and `now` parameters for testing
- [ ] `loop.ts` uses the throttler instead of `rawEventToAgentEvent()` directly
- [ ] `repository-loop.ts` uses the throttler instead of `rawEventToAgentEvent()` directly
- [ ] Unit tests verify throttling behavior (heartbeat sent, subsequent suppressed within interval, sent again after interval)
- [ ] Existing `rawEventToAgentEvent()` function remains unchanged (pure)
