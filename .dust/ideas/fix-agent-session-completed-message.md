# Fix "Agent session completed" message

Session completion messages should show the specific agent name ("Claude session completed") instead of generic "Agent session completed".

## Background

Agent session events follow a start/end lifecycle:

1. `agent-session-started` includes `agentType: string` identifying the agent (`'claude'` or `'codex'`)
2. `agent-session-ended` only includes `success: boolean` and optional `error?: string`

The `formatAgentEvent()` function in `lib/agent-events.ts` formats these for display:

```typescript
case 'agent-session-started': {
  const name = agentDisplayName(event.agentType)
  return `Starting ${name}: ${event.title}`
}
case 'agent-session-ended':
  return event.success
    ? 'Agent session ended (success)'
    : `Agent session ended (error: ${event.error})`
```

When the dustbucket server displays events with pagination, only the current page of events is available. If `agent-session-started` is on a previous page, the agent type is unknown when rendering the `agent-session-ended` event.

## Context

### Event structure (from `lib/agent-events.ts`)

```typescript
export type AgentSessionEvent =
  | {
      type: 'agent-session-started'
      title: string
      prompt: string
      agentType: string  // 'claude' or 'codex'
      purpose: string
      machineName: string
      cwd: string
      platform: string
      dustVersion: string
      runtimeVersion: string
    }
  | { type: 'agent-session-ended'; success: boolean; error?: string }
```

### Session identification

Events are grouped by `agentSessionId` in the `EventMessage` envelope (see `lib/agent-events.ts`):

```typescript
export interface EventMessage {
  sequence: number
  timestamp: string
  sessionId: string
  repository: string
  repoId?: number
  agentSessionId?: string
  event: AgentSessionEvent
}
```

### Current agent type usage

The `agentDisplayName()` helper in `lib/agent-events.ts` converts agent types to display names:

```typescript
function agentDisplayName(agentType?: string): string {
  if (agentType === 'codex') return 'Codex'
  return 'Claude'
}
```

## Open Questions

### Where should the agent type be stored for session end messages?

#### Include agentType in agent-session-ended events

Add `agentType: string` to the `agent-session-ended` event type. The client already knows the agent type when emitting the end event (it's set when the agent session starts), so it can simply include it.

This keeps event data self-contained, requiring no server-side lookups. The server can format the message correctly using only the event itself.

This is a wire protocol change but is additive (new field). Older servers that don't use `agentType` will continue to work.

#### Store agentType on the server per agentSessionId

The dustbucket server extracts and stores `agentType` from `agent-session-started` events, keyed by `agentSessionId`. When rendering any event for that session, the server looks up the agent type.

This avoids changing the wire protocol but requires server-side state and lookups. If the session metadata is lost or the started event wasn't received, the server falls back to "Agent".

#### Derive agentType from the provider field on agent-event

Raw agent events include `provider: string` (e.g., `'claude'`). The server could infer agent type from the most recent `agent-event` in the session.

This is fragile: `provider` may not map directly to display names, and sessions without `agent-event` messages would have no agent type available.
