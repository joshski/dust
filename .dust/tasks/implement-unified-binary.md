# Implement Unified Binary

Implement the unified `dust` CLI as described in the unified-binary idea.

## Goals

- [Easy Adoption](../goals/easy-adoption.md)

## Blocked by

(none)

## Definition of done

- Single `dust` binary with subcommands: init, prompt, validate, list
- Each command implemented as a separate TypeScript module in `lib/cli/`
- Unit tests for each command that don't spawn processes
- `dust --help` shows available commands
- Old `bin/prompt` script removed (superseded by `dust prompt`)
