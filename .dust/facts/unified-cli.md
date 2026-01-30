# Unified CLI

Dust provides a single `dust` command with subcommands for all operations. For example: `dust init`, `dust list tasks`, `dust check`, `dust agent`.

This follows the familiar pattern of tools like `git` and `docker`, supporting [Easy Adoption](../goals/easy-adoption.md). Run `dust help` to see all available commands.

## Implementation

Each command is implemented as a separate TypeScript module in `lib/cli/` with unit tests. Commands receive injected dependencies (`FileSystem`, `CommandContext`) for testability without spawning processes.
