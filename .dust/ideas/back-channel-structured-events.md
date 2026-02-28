# Back channel structured events

Dust commands output human/agent-friendly text, but upstream systems (dustbucket, analytics dashboards) need structured data. This idea proposes a "back channel" mechanism for dust commands to emit structured events alongside their text output.

## Context

When `dust loop` or `dust bucket worker` runs, an agent CLI executes within a repository and calls dust commands like `dust next`, `dust check`, `dust facts`. The output of these commands is designed for the agent to read and act upon - it's formatted text with colors, headings, and prose descriptions.

However, upstream systems have different needs:

- **dustbucket** might want to know exactly which tasks are available, which checks passed/failed, and what artifacts changed - in a structured format it can store and query
- **analytics systems** might want to track command execution patterns, timing, and outcomes
- **monitoring tools** might want machine-readable signals about repository health

Currently, the only structured data channel is the agent session event protocol (`lib/agent-events.ts`), which covers session lifecycle (started, ended, activity heartbeats, claude streaming events). Individual command execution produces only text output that would need parsing to extract structured data - a fragile approach as output formatting changes.

## Architecture overview

The dust CLI currently pipes output through a `CommandContext` interface:

```typescript
interface CommandContext {
  cwd: string
  stdout: (message: string) => void
  stdoutInline?: (message: string) => void
  stderr: (message: string) => void
}
```

Commands call `context.stdout(...)` to print results. The entry point (`lib/cli/run.ts`) wires this to `console.log`. There's no side channel for structured data.

The existing event protocol (`eventsUrl` setting, HTTP POST delivery) is specifically for agent session events, defined in `lib/agent-events.ts`. Command-level events would be a new category.

## Potential approaches

### Environment variable file descriptor

Set `DUST_EVENTS_FD` to a file descriptor number. Commands write newline-delimited JSON to that descriptor.

```bash
DUST_EVENTS_FD=3 dust check 3>/path/to/events.jsonl
```

Pros: Simple, no network overhead, works in sandboxed environments
Cons: Requires the caller to set up the FD, doesn't work across process boundaries easily

### HTTP POST to configured URL

Extend `eventsUrl` (or add a new `commandEventsUrl`) to receive command-level events. Same delivery mechanism as agent events.

Pros: Reuses existing infrastructure, works remotely
Cons: Network latency, requires running server, more complex error handling

### Named pipe / Unix socket

Commands write events to a well-known named pipe (e.g., `/tmp/dust-events-<session-id>`).

Pros: Low latency, no network, supports streaming
Cons: Platform-specific, cleanup complexity

### Stdout structured output mode

A `--json` flag or `DUST_OUTPUT_JSON` env var switches commands to JSON output instead of human-readable text.

Pros: No extra channel needed, standard pattern
Cons: Breaks agent consumption (agent expects human-readable text), can't have both simultaneously

### Hybrid: text stdout + structured stderr

Commands continue outputting human text to stdout but write structured events to stderr with a prefix (e.g., `DUST_EVENT: {...}`).

Pros: Simple, no extra infrastructure
Cons: Conflates error output with event output, fragile parsing

## Event types to consider

Commands that would benefit from structured events:

| Command | Potential events |
|---------|-----------------|
| `dust check` | check-started, check-passed, check-failed (with name, duration, output snippet) |
| `dust next` | tasks-listed (with array of {path, title, blockers}) |
| `dust lint` | lint-completed (with violations array) |
| `dust facts` | facts-listed (with array of {path, title}) |
| `dust ideas` | ideas-listed (with array of {path, title, status}) |
| `dust agent` | agent-completed (with task path, duration, outcome) |

## Implementation considerations

### Wire format

Reuse the existing `EventMessage` envelope from the agent event protocol, but with a new event type discriminator:

```typescript
type CommandEvent =
  | { type: 'command-started'; command: string; args: string[] }
  | { type: 'command-completed'; command: string; exitCode: number; durationMs: number }
  | { type: 'tasks-listed'; tasks: Array<{ path: string; title: string }> }
  | { type: 'check-result'; name: string; passed: boolean; durationMs: number }
  // ...
```

### Session context

Command events need session context to correlate with agent sessions. The existing `sessionId` and `agentSessionId` from the event protocol would apply.

### Delivery semantics

Should match agent events: fire-and-forget, non-blocking, logged but not retried on failure.

## Related ideas

- [Send events to dust bucket host in dust loop](send-events-to-dust-bucket-host-in-dust-loop.md) - focuses on agent session events, this idea extends to command-level events
- [Enrich agent-session-started events](enrich-agent-session-started-events.md) - enriches existing events, this idea adds new event categories

## Open Questions

### Which transport mechanism should be used for the back channel?

#### File descriptor (recommended)

Use `DUST_EVENTS_FD` environment variable pointing to an open file descriptor. The host process creates a pipe and passes the write end's FD number. Commands write newline-delimited JSON.

This is the simplest approach that works in sandboxed environments without network access. It's a well-established pattern (similar to how git hooks communicate). The host process has full control over buffering and delivery.

#### HTTP POST to events URL

Extend the existing `eventsUrl` mechanism to include command events. Commands POST JSON payloads to the configured URL.

This reuses existing infrastructure and works for remote monitoring, but adds network latency to every command execution and requires more complex error handling.

#### Named pipe with well-known path

Commands write to a Unix named pipe at a deterministic path (e.g., `/tmp/dust-events-$DUST_SESSION_ID`). The host process creates and reads from this pipe.

More flexible than FD passing but introduces platform-specific behavior and cleanup concerns.

### Should command events use the same envelope as agent events?

#### Yes, extend EventMessage with new event types

Add command event types to the existing `AgentSessionEvent` union or create a parallel union. Reuse `sequence`, `timestamp`, `sessionId`, `repository` fields.

Keeps a single event schema, simplifies consumers, but may conflate different event categories.

#### No, define a separate CommandEventMessage

Create a new envelope type specifically for command events. May have different fields (e.g., `command`, `args`, `workingDir`).

Cleaner separation but requires maintaining two schemas and potentially two delivery paths.

### Which commands should emit structured events?

#### All commands that produce parseable output

Any command whose output could be machine-parsed should emit structured events. This includes `dust next`, `dust check`, `dust lint`, `dust facts`, `dust ideas`, `dust list`.

Maximizes utility but increases implementation scope.

#### Only high-value commands initially

Start with `dust check` (pass/fail signals) and `dust next` (task availability). Expand based on actual consumer needs.

Reduces initial scope and validates the approach before broader rollout.

### How should events be buffered and flushed?

#### Write events immediately

Each event is written to the back channel as soon as it occurs. Simple but may introduce many small writes.

#### Buffer and flush at command exit

Collect events during execution and write them all at command completion. Reduces I/O but loses real-time visibility.

#### Flush after each logical operation

Write after each significant operation (e.g., after each check completes). Balances real-time visibility with I/O efficiency.
