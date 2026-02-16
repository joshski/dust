# Add Environmental Context to agent-session-started

Add environmental fields to the `agent-session-started` event to aid diagnostics and improve session event formatting.

## Background

The `agent-session-started` event (defined in `lib/agent-events.ts`) currently includes `title`, `prompt`, `agentType`, and `purpose`. This task adds environmental context fields to help consumers understand where and how agent sessions run.

## Implementation

Add the following required fields to the `agent-session-started` event type in `lib/agent-events.ts:10-16`:

- `machineName: string` — Hostname identifying the machine (from `os.hostname()`)
- `cwd: string` — Full absolute working directory path (from `process.cwd()`)
- `platform: string` — Combined OS name and version (e.g., `'darwin 24.1.0'` from `os.platform()` and `os.release()`)
- `dustVersion: string` — Version of the dust CLI (from `package.json`)
- `runtimeVersion: string` — Node/Bun runtime version (from `process.version`)

Update the event creation sites in `lib/cli/commands/loop.ts` (around lines 264-270 and 331-337) to populate these fields.

Update the wire format documentation in `.dust/facts/dust-event-protocol.md` to include the new fields in the type definition and example payloads.

## Goals

- [Development Traceability](../goals/development-traceability.md)
- [Debugging Tooling](../goals/debugging-tooling.md)

## Blocked By

(none)

## Definition of Done

- [ ] The `agent-session-started` event type includes all five new required fields
- [ ] Event creation in `loop.ts` populates all new fields
- [ ] `.dust/facts/dust-event-protocol.md` documents the new fields
- [ ] Existing tests pass or are updated to include the new fields
- [ ] `bin/dust check` passes
