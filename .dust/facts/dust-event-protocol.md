# Dust Event Protocol

When `eventsUrl` is configured in `.dust/config/settings.json`, dust commands will HTTP POST events to that URL. The same event format is used over WebSocket connections from dustbucket.

## Configuration

```json
{
  "dustCommand": "npx dust",
  "eventsUrl": "https://example.com/events"
}
```

### Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `eventsUrl` | `string` | - | URL to POST events to. Only agent session events are sent; loop lifecycle events are local-only. |

## Wire Format

Both HTTP and WebSocket transports use the same `EventMessage` envelope:

```typescript
interface EventMessage {
  sequence: number          // Monotonically increasing, starts at 1
  timestamp: string         // ISO 8601 format
  sessionId: string         // UUID identifying this dust session
  repository: string        // Repository name
  agentSessionId?: string   // UUID identifying current agent run
  event: AgentSessionEvent  // Strongly typed event object
}
```

## Session IDs

- **sessionId**: Generated once when a dust command starts. All events from that command invocation share this ID.
- **agentSessionId**: Extracted from Claude's streaming events (`session_id` field). Identifies a single agent run within a loop iteration. Present on all events once known.

## Event Types

Events are a discriminated union with a `type` field. Only these 4 types are sent over the wire:

```typescript
type AgentSessionEvent =
  | { type: 'agent-session-started' }
  | { type: 'agent-session-ended'; success: boolean; error?: string }
  | { type: 'agent-session-activity' }
  | { type: 'claude-event'; rawEvent: Record<string, unknown> }
```

| Type | Fields | Description |
|------|--------|-------------|
| `agent-session-started` | - | An agent run has started |
| `agent-session-ended` | `success: boolean`, `error?: string` | An agent run has ended |
| `agent-session-activity` | - | Heartbeat indicating the agent is active (not stored) |
| `claude-event` | `rawEvent: object` | Raw Claude streaming event |

### Local-only events

The following event categories exist in the codebase but are never sent over the wire:

- **`loop.*` events** (`loop.started`, `loop.syncing`, `loop.no_tasks`, etc.) — formatted for local console output only
- **`bucket.*` events** (`bucket.connected`, `bucket.disconnected`, `bucket.repository_added`, etc.) — local UI lifecycle state only

## Event Mapping

The `mapToAgentEvent()` function in `lib/agent-events.ts` converts internal `DustWireEvent` types to wire events:

| Internal Event | Wire Event | Notes |
|---------------|------------|-------|
| `claude.started` | `agent-session-started` | |
| `claude.ended` | `agent-session-ended` | Preserves `success` and `error` fields |
| `claude.raw_event` (stream_event) | `agent-session-activity` | When `rawEvent.type === 'stream_event'` |
| `claude.raw_event` (other) | `claude-event` | All other raw events |
| `loop.*` | *(not sent)* | Returns `null` — local console only |

## Example Payloads

Agent session started:
```json
{
  "sequence": 1,
  "timestamp": "2025-01-15T10:30:00.000Z",
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "repository": "my-repo",
  "event": { "type": "agent-session-started" }
}
```

Agent session ended (success):
```json
{
  "sequence": 5,
  "timestamp": "2025-01-15T10:30:30.000Z",
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "repository": "my-repo",
  "agentSessionId": "abc123",
  "event": { "type": "agent-session-ended", "success": true }
}
```

Agent session ended (error):
```json
{
  "sequence": 5,
  "timestamp": "2025-01-15T10:30:30.000Z",
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "repository": "my-repo",
  "agentSessionId": "abc123",
  "event": { "type": "agent-session-ended", "success": false, "error": "Process exited with code 1" }
}
```

Claude event (raw streaming):
```json
{
  "sequence": 3,
  "timestamp": "2025-01-15T10:30:05.000Z",
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "repository": "my-repo",
  "agentSessionId": "abc123",
  "event": {
    "type": "claude-event",
    "rawEvent": {
      "type": "assistant",
      "message": {
        "content": [{ "type": "text", "text": "Hello!" }]
      }
    }
  }
}
```

**Note:** `claude-event` payloads are high-volume (many events per response) and contain response content. `agent-session-activity` events are heartbeats and are not stored.

## Delivery Semantics

- Fire-and-forget: Events are posted asynchronously without blocking
- No retries: Failed POSTs are logged to stderr but not retried
- Non-blocking: POST failures do not affect command execution
