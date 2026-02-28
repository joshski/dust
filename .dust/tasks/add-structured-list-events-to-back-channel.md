# Add structured list events to back channel

Extend the back channel to emit structured events from artifact listing commands. This includes `dust facts`, `dust ideas`, and `dust list` for machine-readable output.

## Background

This task completes the back channel coverage for artifact listing commands. After `dust check` and `dust next`, these commands round out the structured event coverage for all commands that produce parseable output.

## Implementation

### Add event types

Extend command event types:

```typescript
type CommandEvent =
  // ... existing events
  | {
      type: 'facts-listed'
      facts: Array<{ path: string; title: string }>
    }
  | {
      type: 'ideas-listed'
      ideas: Array<{ path: string; title: string; status: string }>
    }
  | {
      type: 'principles-listed'
      principles: Array<{ path: string; title: string }>
    }
```

### Emit events from each command

Update:
- `lib/cli/commands/facts.ts` to emit `facts-listed`
- `lib/cli/commands/ideas.ts` to emit `ideas-listed` (include status like "draft", "refined", etc.)
- `lib/cli/commands/list.ts` to emit `principles-listed`

## Principles

- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md) - Event emission is injected via `CommandContext`
- [Small Units](../principles/small-units.md) - Each artifact type has its own event type for clarity

## Blocked By

- [Add structured check events to back channel](add-structured-check-events-to-back-channel.md)

## Definition of Done

- [ ] Event types for `facts-listed`, `ideas-listed`, and `principles-listed` are defined
- [ ] `dust facts` emits a `facts-listed` event
- [ ] `dust ideas` emits an `ideas-listed` event with status
- [ ] `dust list` emits a `principles-listed` event
- [ ] Unit tests verify event emission for each command
