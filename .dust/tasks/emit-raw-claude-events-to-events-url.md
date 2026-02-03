# Emit Raw Claude Events to Events URL

Currently, `dust loop claude` only emits high-level events (`claude.started`, `claude.ended`) to the configured `eventsUrl`. The raw streaming events from Claude Code (text deltas, tool uses, tool results, etc.) are consumed internally for stdout display but never forwarded to the events URL.

This limits observability for external systems that want to monitor agent activity in real-time.

## Problem

The event flow currently looks like this:

```
spawnClaudeCode → yields RawEvent → streamEvents → stdout display
                                         ↓
                              events are CONSUMED here
                              (never forwarded to eventsUrl)
```

The `run()` function in `lib/claude/run.ts` has no mechanism to accept an event callback:

```typescript
export async function run(prompt, options, dependencies) {
  const events = dependencies.spawnClaudeCode(prompt, options)
  const sink = dependencies.createStdoutSink()
  await dependencies.streamEvents(events, sink)  // ← No event posting
}
```

## Solution

Wire raw Claude events through to the event posting system so that observers can see streaming activity.

### Files to Modify

1. **`lib/claude/types.ts`** - Add `RawEventCallback` type
2. **`lib/claude/run.ts`** - Accept optional `onRawEvent` callback in `SpawnOptions` or as a parameter
3. **`lib/claude/streamer.ts`** - Call the callback for each raw event before/during processing
4. **`lib/cli/commands/loop.ts`** - Add `claude.raw_event` to `DustWireEvent` union and wire up the callback
5. **`.dust/facts/dust-event-protocol.md`** - Document the new event type

### New Event Type

Add a new event type that wraps raw Claude events:

```typescript
export interface ClaudeRawEvent {
  type: 'claude.raw_event'
  rawEvent: RawEvent  // The original event from Claude Code
}
```

### Design Considerations

- Raw events may be high-volume (many text deltas per response)
- Consider making raw event emission opt-in via settings (e.g., `emitRawEvents: true`)
- Privacy: raw events contain response content - document this in the protocol

## Goals

- [Human-AI Collaboration](../goals/human-ai-collaboration.md) - Enables real-time visibility into agent work

## Blocked by

(none)

## Definition of done

- [ ] `run()` function accepts an optional callback for raw events
- [ ] `streamEvents()` invokes the callback for each raw event
- [ ] `loop.ts` defines `claude.raw_event` in the `DustWireEvent` union
- [ ] `loopClaude` wires the callback to emit raw events to `eventsUrl`
- [ ] Raw event emission is opt-in via `emitRawEvents` setting in `.dust/config/settings.json`
- [ ] `.dust/facts/dust-event-protocol.md` documents the new event type
- [ ] Tests cover the new event emission path
- [ ] Existing tests continue to pass
