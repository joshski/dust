# Less frequent heartbeat events

The `agent-session-activity` heartbeat event is emitted for every `stream_event` from Claude. This happens very frequently during streaming — often tens or hundreds of times per agent response — creating unnecessary network traffic when events are sent to a remote server.

## Context

When `eventsUrl` is configured or when running via `dust bucket`, every raw event from Claude is converted to an `AgentSessionEvent` via `rawEventToAgentEvent()` in `lib/agent-events.ts`:

```typescript
if (typeof rawEvent.type === 'string' && rawEvent.type === 'stream_event') {
  return { type: 'agent-session-activity' }
}
```

This means each `stream_event` (which includes `message_start`, `content_block_start`, `content_block_delta`, etc.) generates a heartbeat. In a typical agent response, there can be 50-100+ stream events. For example, the fixture `lib/claude/fixtures/write-read-echo.json` contains 84 `stream_event` occurrences.

The `agent-session-activity` event serves as a heartbeat to indicate the agent is still working. However, the current implementation sends far more heartbeats than necessary. A heartbeat every few seconds would be sufficient to indicate liveness; one per streaming chunk is excessive.

## Related Code

- `lib/agent-events.ts:45-52` — `rawEventToAgentEvent()` converts every `stream_event` to `agent-session-activity`
- `lib/cli/commands/loop.ts:504-506` — `onRawEvent` callback that sends events when `eventsUrl` is configured
- `lib/bucket/repository-loop.ts:267-269` — `onRawEvent` callback in bucket mode
- `.dust/facts/dust-event-protocol.md` — Documents that `agent-session-activity` is a heartbeat and not stored

## Implementation Considerations

The fix involves throttling how often `agent-session-activity` events are emitted. The core question is where to implement this throttling:

**Option A: Throttle in `rawEventToAgentEvent()`**

Modify the function to track the last heartbeat time and return `null` (or a new "skip" type) if a heartbeat was sent recently. This keeps the logic centralized but requires adding state to what is currently a pure function.

**Option B: Throttle at the event sender level**

Keep `rawEventToAgentEvent()` pure and add throttling logic where events are sent (in `loop.ts` and `repository-loop.ts`). This duplicates some logic but preserves function purity.

**Option C: Drop heartbeats and rely on other signals**

Instead of throttling, stop sending `agent-session-activity` entirely. The server could infer activity from `claude-event` messages (which are also high-volume but contain useful content). However, this changes the protocol semantics.

## Open Questions

### How often should heartbeats be sent?

#### Every 5 seconds

Send at most one heartbeat per 5-second window. This is frequent enough to detect a stalled agent promptly while dramatically reducing event volume (from 50-100+ per response to perhaps 2-4).

#### Every 30 seconds

A more aggressive reduction. This may be too infrequent for UI responsiveness — a user watching the dashboard might wonder if the agent is working during long operations.

#### Configurable interval

Allow the heartbeat interval to be configured via settings. This adds flexibility but increases complexity.

### Should the last heartbeat time be per-session or global?

#### Per agent session

Track the last heartbeat time for each `agentSessionId`. This ensures each session gets its own heartbeat cadence, even if multiple sessions are running concurrently (e.g., in bucket mode with multiple repos).

#### Global

Use a single global timestamp. This is simpler and still achieves the goal of reducing event volume, but concurrent sessions might "steal" each other's heartbeat slots.
