# Suggest subcommands for partial multi-word commands

Show available subcommands when a user types an incomplete multi-word command instead of "Unknown command".

## Current Behavior

When a user types a partial multi-word command, they see a generic error:

```
$ dust new
Unknown command: new
Run 'bin/dust help' for available commands
```

This happens for several command families:
- `dust new` (expects `new task`, `new idea`, `new principle`)
- `dust pick` (expects `pick task`)
- `dust implement` (expects `implement task`)
- `dust loop` (expects `loop claude`, etc.)
- `dust bucket` (expects `bucket worker`, `bucket tool`, etc.)

## Proposed Behavior

When a partial command matches the prefix of known multi-word commands, show helpful guidance:

```
$ dust new
Usage: dust new <type>

Available types:
  task        Create a new task
  idea        Create a new idea
  principle   Create a new principle

Run 'dust new task' to create a new task.
```

This aligns with the [Unsurprising UX](../principles/unsurprising-ux.md) principle: users expect the CLI to guide them toward valid usage rather than rejecting partial input with a generic error.

## Implementation

The command resolution logic in [`lib/cli/main.ts`](../../lib/cli/main.ts) already has a registry of command patterns. When `resolveCommand()` fails to find an exact match:

1. Check if the input is a prefix of any known multi-word commands
2. If matches exist, return a special "partial match" result with the available completions
3. Format and display the available subcommands instead of "Unknown command"
