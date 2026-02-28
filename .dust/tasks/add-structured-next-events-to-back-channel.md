# Add structured next events to back channel

Extend the back channel to emit structured events from `dust next`, providing machine-readable task listings for upstream systems.

## Background

After the back channel infrastructure is in place for `dust check`, this task adds structured events to `dust next`. This command is high-value for analytics and monitoring because it reveals task availability and blockers.

## Implementation

### Add event types

Extend command event types in `lib/agent-events.ts` (or `lib/command-events.ts`):

```typescript
type CommandEvent =
  // ... existing check events
  | {
      type: 'tasks-listed'
      tasks: Array<{
        path: string
        title: string
        blockedBy: string[]
      }>
    }
```

### Emit events from `dust next`

Update `lib/cli/commands/next.ts` to emit:
- `tasks-listed` with the full array of available tasks after rendering the text output

The event includes the task path (relative to repo root), title, and any blockers - the same information shown in text form but structured for programmatic consumption.

## Principles

- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md) - Event emission is injected via `CommandContext`
- [Context Window Efficiency](../principles/context-window-efficiency.md) - Structured events let upstream systems filter and summarize without parsing text

## Blocked By

(none)

## Definition of Done

- [ ] `tasks-listed` event type is defined
- [ ] `dust next` emits a `tasks-listed` event with task paths, titles, and blockers
- [ ] Unit tests verify event emission matches the rendered output
- [ ] Integration test verifies the event format in the file descriptor output
