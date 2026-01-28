# Refactor CLI command list

The list of commands in `lib/cli/main.ts` is represented as a constant array with a switch/case statement in `runCommand`.

By making it an object or class with methods corresponding to the names of the commands, we could avoid the switch/case statement and simplify the structure of the code. Potentially we could use that same object/data structure to generate the help text.

## Goals

- [Organized Concerns](../goals/organized-concerns.md)
- [Decoupled Code](../goals/decoupled-code.md)

## Blocked by

- [Extract help command to its own file](extract-help-command.md)

## Definition of done

- [ ] Create a command registry object/class that maps command names to their implementations
- [ ] Remove the switch/case statement from `runCommand` in favor of dynamic dispatch
- [ ] Ensure the COMMANDS array can be derived from the registry
- [ ] Consider generating help text from the same data structure
- [ ] All tests pass
