# Fix agentSessionId not being populated from stream events

`agentSessionId` is never populated from `stream_event` type events. The `onRawEvent` handler in `lib/cli/commands/loop.ts` (lines 397-408) only captures `session_id` from events where `rawEvent.type === 'result'`, but `session_id` is also present on `stream_event` type events.

## Changes

### `lib/cli/commands/loop.ts`

In the `onRawEvent` handler (around line 398), change:

```typescript
// Extract session_id from result events
if (
  rawEvent.type === 'result' &&
  typeof rawEvent.session_id === 'string' &&
  rawEvent.session_id
) {
  agentSessionId = rawEvent.session_id
}
```

to:

```typescript
// Extract session_id from any event that has it
if (
  typeof rawEvent.session_id === 'string' &&
  rawEvent.session_id
) {
  agentSessionId = rawEvent.session_id
}
```

### `lib/cli/commands/loop.test.ts`

- Rename the test at line 1117 from `'includes agentSessionId in events after session_id is extracted from result raw event'` to `'includes agentSessionId in events after session_id is extracted from a raw event'`.
- Change the simulated event in that test (line 1138) from `{ type: 'result', session_id: 'claude-session-xyz' }` to `{ type: 'stream_event', session_id: 'claude-session-xyz' }` to verify non-result events work.
- In the `'resets agentSessionId between iterations'` test (line 1179), change the simulated event from `{ type: 'result', session_id: 'session-1' }` to `{ type: 'stream_event', session_id: 'session-1' }`.

## Goals

- [Make Changes with Confidence](../goals/make-changes-with-confidence.md)
- [Unit Test Coverage](../goals/unit-test-coverage.md)

## Blocked By

(none)

## Definition of Done

- [ ] The `rawEvent.type === 'result'` condition is removed from the session_id extraction in `lib/cli/commands/loop.ts`
- [ ] Tests updated to verify `session_id` is captured from non-result event types
- [ ] All existing tests pass
