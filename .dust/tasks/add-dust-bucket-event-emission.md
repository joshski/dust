# Add `dust bucket` event emission

Implement event emission for the bucket command so dustbucket can track worker status.

## Requirements

1. Define bucket-specific event types:
   - `bucket.connected` - WebSocket connection established
   - `bucket.disconnected` - WebSocket connection lost
   - `bucket.repository_added` - New repository loop started
   - `bucket.repository_removed` - Repository loop stopped
   - `bucket.iteration_started` - A dust iteration began for a repo
   - `bucket.iteration_completed` - A dust iteration finished (with success/failure)
   - `bucket.error` - An error occurred (e.g., clone failed, subprocess crashed)
2. Send events via the WebSocket connection to dustbucket
3. Follow the existing `DustWireEvent` pattern for event structure

## Event Structure

```typescript
interface BucketEvent {
  type: 'bucket.connected' | 'bucket.disconnected' | ...
  timestamp: string
  sessionId: string
  sequence: number
  repository?: string  // git URL for repo-specific events
  details?: unknown    // event-specific payload
}
```

## Implementation Notes

- Events sent directly via WebSocket (not to eventsUrl)
- Include session tracking for event sequencing
- Fire-and-forget (don't block on event delivery)
- Format events to console for local visibility (similar to loop.ts)

## Testing

- Unit tests for event formatting
- Test event emission on connection/disconnection
- Test event emission during repository lifecycle

## Goals

- [Dependency Injection](../goals/dependency-injection.md)
- [Unit Test Coverage](../goals/unit-test-coverage.md)
- [Traceable Decisions](../goals/traceable-decisions.md)

## Blocked By

- [Add `dust bucket` entry point command](./add-dust-bucket-entry-point-command.md)

## Definition of Done

- [ ] Bucket events are defined with proper TypeScript types
- [ ] Events sent via WebSocket during key lifecycle moments
- [ ] Events formatted and logged to console
- [ ] Unit tests cover event emission
