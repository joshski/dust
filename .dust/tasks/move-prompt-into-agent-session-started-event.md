# Move prompt into agent-session-started event

Add `prompt`, `agentType`, and `purpose` fields to the `agent-session-started` event. Remove the local-only `loop.start_agent` event which currently carries the prompt but is never sent over the wire.

## Goals

- [Development Traceability](../goals/development-traceability.md)

## Blocked By

(none)

## Definition of Done

- The `agent-session-started` event type includes `prompt: string`, `agentType: string` (e.g. `'claude'`), and `purpose: string` (e.g. `'task'` or `'git-conflict'`)
- The `LoopStartAgentEvent` / `loop.start_agent` event type is removed
- Both emission sites in `runOneIteration` (git conflict and task paths) emit the updated `agent-session-started` with the new fields
- All existing tests pass with updated assertions
- Event protocol documentation is updated
