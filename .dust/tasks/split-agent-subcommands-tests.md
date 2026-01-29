# Split agent-subcommands.test.ts into individual test files

Split `lib/cli/commands/agent-subcommands.test.ts` into one test file per command, matching the pattern established by the hyphenated command file structure.

## Current state

The file `lib/cli/commands/agent-subcommands.test.ts` contains tests for seven commands:
- `agent-help`
- `agent-new-task`
- `agent-new-goal`
- `agent-new-idea`
- `agent-implement-task`
- `agent-pick-task`
- `agent-understand-goals`

All tests share a common `createDeps` helper function.

## Proposed change

Create individual test files:
- `agent-help.test.ts`
- `agent-new-task.test.ts`
- `agent-new-goal.test.ts`
- `agent-new-idea.test.ts`
- `agent-implement-task.test.ts`
- `agent-pick-task.test.ts`
- `agent-understand-goals.test.ts`

The shared `createDeps` helper should be moved to `test-utilities.ts` or duplicated in each file if it remains simple.

## Benefits

- Each command has its own test file alongside its implementation
- Tests are easier to find and maintain
- Consistent with the one-file-per-command pattern established for the implementation files

## Goals

- [Organized Concerns](../goals/organized-concerns.md)

## Blocked by

(none)

## Definition of done

- [ ] Each agent subcommand has its own test file (7 files total)
- [ ] All tests pass
- [ ] The original `agent-subcommands.test.ts` file is deleted
- [ ] Shared test helpers are either extracted to `test-utilities.ts` or appropriately duplicated
