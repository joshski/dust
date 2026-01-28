# Extract help command to its own file

The `help` command is currently inlined in `lib/cli/main.ts` (lines 78-80) rather than having its own file like the other commands (`init`, `validate`, `list`, `next`, `check`, `agent`).

Move the help command implementation to `lib/cli/commands/help.ts` with a corresponding test file `lib/cli/commands/help.test.ts`, following the same pattern as other commands.

## Goals

- [Organized Concerns](../goals/organized-concerns.md)
- [Decoupled Code](../goals/decoupled-code.md)

## Blocked by

(none)

## Definition of done

- [ ] Create `lib/cli/commands/help.ts` that exports a `help` function
- [ ] The `help` function accepts `CommandDependencies` and returns `Promise<CommandResult>`
- [ ] The `help` function outputs `generateHelpText(deps.settings)` to stdout
- [ ] Create `lib/cli/commands/help.test.ts` with tests for the help command
- [ ] Update `lib/cli/main.ts` to import and use the new `help` function
- [ ] Remove the inline help case from `runCommand` in main.ts
- [ ] All tests pass
