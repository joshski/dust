# Dust Event Protocol

When `eventsUrl` is configured in `.dust/config/settings.json`, dust commands will HTTP POST events to that URL.

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
| `eventsUrl` | `string` | - | URL to POST events to. When set, all events including raw Claude streaming events are emitted. |

## Wire Format

Each event is posted as a JSON payload:

```typescript
interface EventPayload {
  sequence: number        // Monotonically increasing, starts at 1
  timestamp: string       // ISO 8601 format
  sessionId: string       // UUID identifying this dust session
  agentSessionId?: string // UUID identifying current agent run (for agent events)
  agentType?: string      // Agent type, e.g., "claude" (for agent events)
  event: DustWireEvent    // Strongly typed event object
}
```

## Session IDs

- **sessionId**: Generated once when a dust command starts. All events from that command invocation share this ID.
- **agentType**: Identifies the agent type (e.g., "claude"). Present only on agent-related events (`claude.*`).

## Event Types

Events are a discriminated union with a `type` field:

| Type | Fields | Description |
|------|--------|-------------|
| `loop.warning` | - | Permission skip warning |
| `loop.started` | `maxIterations: number` | Loop has started |
| `loop.syncing` | - | Git pull in progress |
| `loop.sync_skipped` | `reason: string` | Git pull failed |
| `loop.checking_tasks` | - | Checking for available tasks |
| `loop.no_tasks` | - | No tasks found, will sleep |
| `loop.tasks_found` | - | Tasks available, starting agent |
| `claude.started` | - | Claude session started |
| `claude.ended` | `success: boolean`, `error?: string` | Claude session ended |
| `claude.raw_event` | `rawEvent: object` | Raw Claude streaming event |
| `loop.iteration_complete` | `iteration: number`, `maxIterations: number` | Iteration finished |
| `loop.ended` | `maxIterations: number` | Loop completed |

## Example Payloads

Loop started event:
```json
{
  "sequence": 1,
  "timestamp": "2025-01-15T10:30:00.000Z",
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "event": { "type": "loop.started", "maxIterations": 10 }
}
```

Claude started event:
```json
{
  "sequence": 5,
  "timestamp": "2025-01-15T10:30:05.000Z",
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "agentType": "claude",
  "event": { "type": "claude.started" }
}
```

Claude ended event (success):
```json
{
  "sequence": 6,
  "timestamp": "2025-01-15T10:30:30.000Z",
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "agentType": "claude",
  "event": { "type": "claude.ended", "success": true }
}
```

Claude ended event (error):
```json
{
  "sequence": 6,
  "timestamp": "2025-01-15T10:30:30.000Z",
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "agentType": "claude",
  "event": { "type": "claude.ended", "success": false, "error": "Process exited with code 1" }
}
```

Claude raw event:
```json
{
  "sequence": 7,
  "timestamp": "2025-01-15T10:30:31.000Z",
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "agentType": "claude",
  "event": {
    "type": "claude.raw_event",
    "rawEvent": {
      "type": "assistant",
      "message": {
        "content": [{ "type": "text", "text": "Hello!" }]
      }
    }
  }
}
```

**Note:** Raw events are high-volume (many events per response) and contain response content.

## Delivery Semantics

- Fire-and-forget: Events are posted asynchronously without blocking
- No retries: Failed POSTs are logged to stderr but not retried
- Non-blocking: POST failures do not affect command execution
