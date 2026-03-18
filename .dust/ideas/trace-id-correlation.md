# Trace ID Correlation

Add trace IDs to events so agents can follow one operation across multiple processes.

## Background

The [Development Traceability](../principles/development-traceability.md) principle states that "structured logging and tracing help agents understand system behaviour without resorting to ad-hoc testing cycles."

Currently, dust has comprehensive logging infrastructure with named loggers, DEBUG filtering, and file routing. However, when an operation spans multiple processes (e.g., `dust loop` spawning Claude, which triggers checks), there's no way to correlate related events. Agents debugging issues must piece together logs from different sources without a linking identifier.

## The Gap

Consider a failing check during a task attempt:

1. `dust loop` starts an iteration (logs to dust.loop)
2. Claude agent is spawned (logs to dust.loop.claude)
3. Agent runs `dust check` (logs to dust.cli.commands.check)
4. A check fails and the loop retries

An agent reading these logs cannot easily answer "which check failure corresponds to which iteration?" or "what was the agent doing when this error occurred?" The events exist but lack correlation.

## Proposed Solution

Add a `traceId` field to structured events:

```typescript
interface CommandEvent {
  type: 'check-started' | 'check-passed' | 'check-failed'
  traceId?: string  // Correlation ID linking related events
  // ...existing fields
}
```

Trace IDs would be:
- Generated at operation boundaries (loop iteration start, command invocation)
- Passed through environment variables to child processes
- Included in all events emitted during that operation
- Searchable in log output

## Benefits

- **Debugging**: Filter all events for a single operation with one ID
- **Aggregation**: Collect metrics per-operation (how many checks failed in this iteration?)
- **Replay**: Reconstruct the full sequence of events for a failed operation
- **Attribution**: Know which agent session produced which commits

## Principle Alignment

- [Development Traceability](../principles/development-traceability.md) - Directly enables operation tracing
- [Debugging Tooling](../principles/debugging-tooling.md) - Helps agents diagnose failures
- [Agent Autonomy](../principles/agent-autonomy.md) - Reduces need for human intervention in debugging

## Open Questions

### What format should trace IDs use?

#### UUIDs

Standard, universally unique, but verbose. `550e8400-e29b-41d4-a716-446655440000`

#### Short random strings

Compact and human-readable. `abc123` - may collide over time but sufficient for debugging sessions.

#### Hierarchical IDs

Encode structure like `loop-3.iter-5.check-lint` for self-describing traces at the cost of format complexity.

### How should trace IDs propagate?

#### Environment variables

Set `DUST_TRACE_ID` before spawning children. Simple and works across any subprocess.

#### Event streams

Pass trace ID through the event emitter. Only works for in-process correlation.

#### Both

Environment for cross-process, events for in-process. More complete but more complex.
