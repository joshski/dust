# Pipe command events from spawned Claude via DUST EVENTS FD

Set `DUST_EVENTS_FD` when spawning Claude/Codex so dust commands emit events back to the parent.

When `dust bucket worker` or `dust loop` spawns an agent process, the env var causes dust commands run by the agent (e.g. `dust check`, `dust next`) to write structured `CommandEvent`s to a pipe file descriptor readable by the parent.

## Background

The `DUST_EVENTS_FD` back channel protocol already exists: dust commands check for the env var, and if set, write newline-delimited JSON (`CommandEventMessage`) to that file descriptor. Tests validate this works (`DUST_EVENTS_FD=3 dust check 3>events.jsonl`), but nothing currently sets the env var in production.

The spawned Claude process doesn't need to know about `DUST_EVENTS_FD` — it just inherits the env var and passes it through to any dust subprocesses it runs.

## Proposed Behaviour

1. In `spawn-claude-code.ts`, add an extra entry to the `stdio` array (e.g. `'pipe'` at index 3) to create a readable pipe
2. Set `DUST_EVENTS_FD=3` in the `env` passed to the spawned process
3. Read newline-delimited JSON from the pipe in the parent process
4. Parse each line as a `CommandEventMessage` and forward it to a callback

The callback would be threaded through from `repository-loop.ts` (for bucket worker) or `loop.ts` (for dust loop), where it can be wrapped into an `EventMessage` and sent via `sendEvent` over the WebSocket.

## Open Questions

### Should the pipe reading happen in `spawn-claude-code.ts` or in the caller?

#### Read in spawn-claude-code.ts

Yield `CommandEventMessage`s alongside `RawEvent`s from the async generator, keeping pipe lifecycle co-located with process lifecycle.

#### Read in the caller

Return the pipe fd/stream to the caller and let `repository-loop.ts` or `loop.ts` handle reading. More flexible but splits responsibility.

### How should command events be wrapped for the WebSocket wire format?

#### Wrap as a new event type

Send as `{ type: 'dust-command', ...commandEvent }` inside the existing `EventMessage` envelope. Dustbucket would need to handle this new type.

#### Translate to existing event types

Map command events to existing agent event types. Simpler on the dustbucket side but lossy.
