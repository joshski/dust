# Rename lint markdown to lint

Rename the `dust lint markdown` command to `dust lint` as part of unifying all `.dust/` validation into a single command.

## Background

Currently the markdown validation command is `dust lint markdown`. As we add more validation types (directory structure, config schema, file types), a unified `lint` command makes more sense than multiple subcommands.

## Implementation

1. Change the command registry entry from `'lint markdown': lintMarkdown` to `'lint': lintMarkdown` in `lib/cli/main.ts`
2. Update `check.ts` to call `lint` instead of `lint markdown` (update the `name` and `command` fields in `runValidationCheck`)
3. Update the help command to show `dust lint` instead of `dust lint markdown`
4. Update all test files that reference the old command name
5. Update documentation in `.dust/facts/configuration-system.md` if it references `lint markdown`

## Goals

- [Lint Everything](../goals/lint-everything.md)

## Blocked By

(none)

## Definition of Done

- [ ] `dust lint` works and `dust lint markdown` no longer works
- [ ] `dust check` calls the renamed command correctly
- [ ] All tests pass with the new command name
- [ ] Help output reflects the new command name
