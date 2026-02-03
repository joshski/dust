# Emit raw Claude events via wire protocol

Currently, `dust loop claude` only emits high-level events (`loop.*`, `claude.started`, `claude.ended`) to the configured `eventsUrl`. The raw streaming events from Claude Code (text deltas, tool uses, tool results, etc.) are consumed internally for console output but not forwarded to the wire protocol.

## Problem

When monitoring a dust loop session via the events sink, observers only see coarse-grained events like "Claude started" and "Claude ended". They cannot see:
- What text Claude is generating
- Which tools Claude is invoking
- Tool execution results
- Cost and turn information from the result event

## Solution

Add a new event type `claude.event` that wraps raw Claude events and emits them via the existing wire protocol.

### Files to modify

1. **`lib/cli/commands/loop.ts`**
   - Add `ClaudeEventEvent` type to `DustWireEvent` union:
     ```typescript
     export interface ClaudeEventEvent {
       type: 'claude.event'
       event: RawEvent  // The raw JSON from Claude Code
     }
     ```
   - Pass an event callback to `run()` that emits `claude.event` for each raw event

2. **`lib/claude/run.ts`**
   - Add optional `onRawEvent?: (event: RawEvent) => void` callback to `run()` signature
   - Call the callback for each event yielded by `spawnClaudeCode()` before passing to `streamEvents()`

3. **`lib/claude/types.ts`**
   - Export `RawEvent` type (already exported, just ensure it's suitable)

4. **`.dust/facts/dust-event-protocol.md`**
   - Document the new `claude.event` type in the event types table
   - Add example payload showing a raw event wrapper

### Wire format

```json
{
  "sequence": 7,
  "timestamp": "2025-01-15T10:30:05.123Z",
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "agentSessionId": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  "agentType": "claude",
  "event": {
    "type": "claude.event",
    "event": {
      "type": "assistant",
      "message": {
        "content": [
          { "type": "text", "text": "Let me help with that." }
        ]
      }
    }
  }
}
```

## Goals

- [Human-AI Collaboration](../goals/human-ai-collaboration.md)

## Blocked by

(none)

## Definition of done

- [ ] `claude.event` events are emitted for every raw event from Claude Code
- [ ] Events include full raw JSON payload without modification
- [ ] Events are associated with the correct `agentSessionId`
- [ ] Wire protocol documentation is updated with new event type
- [ ] Unit tests verify raw events flow through to the event poster
- [ ] Integration test confirms events arrive at a mock HTTP endpoint
