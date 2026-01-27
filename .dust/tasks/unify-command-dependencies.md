# Unify command dependencies into a single object

The `runCommand` function passes six separate parameters, and each command has a different signature picking what it needs. This is inconsistent and makes adding new dependencies awkward.

Create a `CommandDependencies` interface and pass it as a single object to all commands. Each command can destructure the dependencies it needs.

## Goals

- [Decoupled Code](../goals/decoupled-code.md)
- [Clarity Over Brevity](../goals/clarity-over-brevity.md)

## Blocked by

(none)

## Definition of done

- [ ] Create `CommandDependencies` interface in `types.ts` with `arguments`, `context`, `fileSystem`, `globScanner`, and `settings` fields
- [ ] Update `runCommand` to accept `command` and `dependencies` parameters only
- [ ] Update all command functions to accept a single `CommandDependencies` parameter
- [ ] Each command destructures only the dependencies it uses
- [ ] Update all command tests to pass the dependencies object
- [ ] All tests pass
