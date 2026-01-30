# Show friendly 'no items' message in list command

When `dust list` is run with a specific type argument (e.g., `dust list tasks`) and there are no items of that type, the command currently produces no output at all. This can be confusing, leaving users unsure whether the command worked or whether the type was valid.

## Current behavior

```
$ dust list tasks
(no output)
```

## Desired behavior

```
$ dust list tasks
📋 Tasks

No tasks found.
```

The message should use the appropriate emoji and section header, followed by a friendly message like "No {type} found."

## Implementation

In `lib/cli/commands/list.ts`:

1. Track whether any items were output for requested types
2. When a specific type is requested and the directory is empty or missing, show the section header followed by a "No {type} found." message
3. When listing all types (no argument), continue to skip empty sections silently to avoid clutter

## Goals

- [Context Window Efficiency](../goals/context-window-efficiency.md)

## Blocked by

(none)

## Definition of done

- [ ] Running `dust list tasks` when there are no tasks shows "No tasks found."
- [ ] Running `dust list ideas` when there are no ideas shows "No ideas found."
- [ ] Running `dust list` with no arguments still skips empty sections silently
- [ ] Tests cover the new behavior
- [ ] `bin/dust validate` passes
