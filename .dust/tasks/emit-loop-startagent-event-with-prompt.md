# Emit loop.start_agent event with prompt

When the loop starts an agent session, emit a `loop.start_agent` event that includes the exact prompt being passed to Claude. This gives observers visibility into what the agent was asked to do.

Currently, `runOneIteration` emits `agent-session-started` (a wire event) but no local loop event that captures the prompt. Add a new `LoopEvent` type:

```typescript
{ type: 'loop.start_agent'; prompt: string }
```

Emit this event via `onLoopEvent` just before calling `run(prompt, ...)`.

The listing below shows the contents of the task file you are reading now. When you create your commit, delete this file: `.dust/tasks/emit-loop-startagent-event-with-prompt.md`

## Goals

- [Development Traceability](../goals/development-traceability.md)

## Blocked By

- [Bypass dust agent in loop and bucket prompt](bypass-dust-agent-in-loop-and-bucket-prompt.md)

## Definition of Done

- [ ] A `loop.start_agent` event type is added to the `LoopEvent` discriminated union
- [ ] The event includes the full prompt string passed to Claude
- [ ] The event is emitted before `run()` is called in `runOneIteration`
- [ ] Loop event formatting handles the new event type
