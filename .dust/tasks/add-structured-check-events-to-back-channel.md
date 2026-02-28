# Add structured check events to back channel

Implement a file descriptor-based back channel for emitting structured events from dust commands, starting with `dust check`. This enables upstream systems (dustbucket, analytics) to receive machine-readable data alongside human-readable text output.

## Background

Commands like `dust check` output human-readable text for agents, but upstream systems need structured data for storage and querying. This task adds a back channel mechanism where commands can emit structured events to a file descriptor while continuing to output text to stdout.

The `DUST_EVENTS_FD` environment variable specifies the file descriptor number. When set, commands write newline-delimited JSON events to that descriptor. The host process sets up the pipe:

```bash
DUST_EVENTS_FD=3 dust check 3>/path/to/events.jsonl
```

## Implementation

### Extend `CommandContext`

Add an optional `emitEvent` callback to `CommandContext` in `lib/cli/types.ts`:

```typescript
interface CommandContext {
  cwd: string
  stdout: (message: string) => void
  stdoutInline?: (message: string) => void
  stderr: (message: string) => void
  emitEvent?: (event: CommandEvent) => void
}
```

### Define command event types

Extend the event type system in `lib/agent-events.ts` (or a new `lib/command-events.ts`) with command-specific events:

```typescript
type CommandEvent =
  | { type: 'check-started'; name: string }
  | { type: 'check-passed'; name: string; durationMs: number }
  | { type: 'check-failed'; name: string; durationMs: number; output?: string }
```

### Wire up the file descriptor

In `lib/cli/run.ts`, detect `DUST_EVENTS_FD` and create an `emitEvent` function that writes JSON to that descriptor. Events use the existing `EventMessage` envelope format with the new event types.

### Emit events from `dust check`

Update `lib/cli/commands/check.ts` to emit:
- `check-started` before each check runs
- `check-passed` or `check-failed` after each check completes

Events are written immediately (no buffering).

## Principles

- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md) - Event emission is injected via `CommandContext`, keeping command logic pure
- [Agent-Agnostic Design](../principles/agent-agnostic-design.md) - The back channel works for any consumer, not tied to a specific agent
- [Decoupled Code](../principles/decoupled-code.md) - Commands don't know about file descriptors; they call `emitEvent` abstractly

## Blocked By

(none)

## Definition of Done

- [ ] `CommandContext` has an optional `emitEvent` callback
- [ ] Command event types are defined and exported
- [ ] When `DUST_EVENTS_FD` is set, events are written to that file descriptor
- [ ] `dust check` emits `check-started`, `check-passed`, and `check-failed` events
- [ ] Events use the `EventMessage` envelope format with sequence numbers and timestamps
- [ ] Unit tests verify event emission for passing and failing checks
- [ ] Integration test verifies end-to-end: `DUST_EVENTS_FD=3 dust check 3>events.jsonl` produces valid JSON lines
