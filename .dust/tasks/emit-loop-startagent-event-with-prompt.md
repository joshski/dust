# Emit loop.start_agent event with prompt

Add a new `loop.start_agent` event that includes the exact prompt passed to Claude when starting an agent session. This gives observers visibility into what the agent is being asked to do before it starts working.

The event should be emitted just before calling `run()` in `runOneIteration`, and should include:
- The full prompt string that will be passed to Claude

This event is local-only (not sent over the wire to `eventsUrl`) since it contains potentially large prompt content and is primarily useful for debugging and observability of the loop.

## Goals

- [Context Window Efficiency](../goals/context-window-efficiency.md)

## Blocked By

(none)

## Definition of Done

- [ ] New `loop.start_agent` event type added to LoopEvent union
- [ ] Event emitted with `prompt` field in `runOneIteration` before calling `run()`
- [ ] Event formatted for console output in `formatLoopEvent`
- [ ] Tests verify the event is emitted with correct prompt content
