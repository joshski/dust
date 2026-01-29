# Refactor commands to use hyphenated file names

Replace the current subcommand parsing approach with a simpler file-based mapping where verb-noun command patterns map directly to hyphenated file names.

## Current state

Commands like `dust agent new task` and `dust pre push` are handled by:
- `agent.ts` with a switch statement parsing subcommands
- `pre.ts` with a switch statement parsing subcommands

This creates complexity:
- Each parent command needs subcommand parsing logic
- The `AGENT_SUBCOMMANDS` array duplicates the switch cases
- Help text generation is disconnected from actual handlers

## Proposed change

Map space-separated commands directly to hyphenated files:

| Command | File |
|---------|------|
| `dust agent new task` | `agent-new-task.ts` |
| `dust agent new goal` | `agent-new-goal.ts` |
| `dust agent pick task` | `agent-pick-task.ts` |
| `dust agent implement task` | `agent-implement-task.ts` |
| `dust agent understand goals` | `agent-understand-goals.ts` |
| `dust agent help` | `agent-help.ts` |
| `dust agent` (no args) | `agent.ts` |
| `dust pre push` | `pre-push.ts` |

## Implementation approach

1. Update `main.ts` to join args with hyphens and look up in registry
2. Create individual command files for each verb-noun pattern
3. Each file exports a simple handler function
4. Remove subcommand parsing from `agent.ts` and `pre.ts`
5. Update `hooks.ts` regex to match `pre-push` instead of `pre push`

## Benefits

- Each command is a self-contained file
- No subcommand parsing logic needed
- Adding a new command = adding a new file
- Command discovery via file listing
- Easier to test individual commands in isolation

## Goals

- [Organized Concerns](../goals/organized-concerns.md)

## Blocked by

(none)

## Definition of done

- [ ] Commands `agent new task`, `agent new goal`, `agent new idea`, `agent implement task`, `agent pick task`, `agent understand goals`, `agent help`, and `agent` (greeting) each have their own file
- [ ] Command `pre push` has its own file (`pre-push.ts`)
- [ ] `main.ts` resolves commands by joining args with hyphens and looking up in registry
- [ ] No switch statements for subcommand dispatch remain
- [ ] `hooks.ts` generates and parses `dust pre-push` (single hyphenated command)
- [ ] All existing tests pass or are updated appropriately
- [ ] `dust help` documents the command structure accurately
