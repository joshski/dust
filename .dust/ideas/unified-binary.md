# Unified Binary

Ship a single `dust` binary that supports multiple subcommands rather than separate scripts or tools.

## Example Commands

- `dust init` - Initialize a new Dust repository
- `dust prompt <name>` - Output a prompt by name (e.g., `dust prompt work`)
- `dust validate` - Run validation checks
- `dust list` - List tasks, ideas, or other Dust items

## Rationale

A single binary with subcommands is more usable than multiple separate scripts:
- One thing to install and update
- Discoverable commands via `dust --help`
- Consistent interface and conventions across all operations
- Familiar pattern (like `git`, `docker`, `npm`)

This consolidates the [bootstrap binary](bootstrap-binary.md) and [CLI](cli.md) ideas into a unified approach that supports the [easy adoption](../goals/easy-adoption.md) goal.
