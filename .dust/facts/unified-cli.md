# Unified CLI

Dust provides a single `dust` command with subcommands for all operations:

- `dust init` - Initialize a new Dust repository
- `dust validate` - Run validation checks on .dust/ files
- `dust list [type]` - List tasks, ideas, goals, or facts
- `dust next` - Show tasks ready to work on (not blocked by other tasks)
- `dust check` - Run quality gates configured in `.dust/config/settings.json`
- `dust agent` - Display agent-specific instructions (subcommands use verb-noun patterns like `new task`, `implement task`)
- `dust help` - Show help text

This follows the familiar pattern of tools like `git` and `docker`, supporting [Easy Adoption](../goals/easy-adoption.md).

## Implementation

Each command is implemented as a separate TypeScript module in `lib/cli/` with unit tests. Commands receive injected dependencies (`FileSystem`, `CommandContext`) for testability without spawning processes.
