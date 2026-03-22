# Add Trace ID Correlation

Add trace IDs to events so agents can correlate events from one operation across multiple processes.

## Background

When `dust loop` spawns an agent, and that agent runs commands like `dust check`, the resulting events cannot be correlated. The `agentSessionId` exists in the loop process but is not passed to child processes. An agent debugging a failing check cannot easily answer "which check failure corresponds to which iteration?"

## Implementation

Following the [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md) principle, trace ID generation is pure and propagation happens at the shell boundary.

### Generate Trace ID

In `lib/loop/loop.ts`, after generating `agentSessionId`, create a matching `traceId` using the same UUID:

```typescript
agentSessionId = crypto.randomUUID()
const traceId = agentSessionId  // Reuse agentSessionId as trace ID
```

### Propagate via Environment

When spawning the agent in `lib/loop/iteration.ts`, set `DUST_TRACE_ID`:

```typescript
const env = { ...process.env, DUST_TRACE_ID: traceId }
```

### Include in Events

In `lib/cli/commands/emit-event.ts` (or wherever command events are emitted), read `DUST_TRACE_ID` and include it in the event payload:

```typescript
const traceId = process.env.DUST_TRACE_ID
if (traceId) {
  payload.traceId = traceId
}
```

### Update Event Types

Add optional `traceId` field to `EventMessage` in `lib/agent-events.ts`:

```typescript
interface EventMessage {
  // ...existing fields
  traceId?: string
}
```

## Principles

- [Development Traceability](../principles/development-traceability.md)
- [Debugging Tooling](../principles/debugging-tooling.md)
- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md)

## Blocked By

(none)

## Definition of Done

- `DUST_TRACE_ID` is set when `dust loop` spawns agents
- Commands invoked by the agent include `traceId` in emitted events
- Events from the same loop iteration share the same `traceId`
- Unit tests verify trace ID propagation
- The `dust-event-protocol.md` fact is updated to document `traceId`
