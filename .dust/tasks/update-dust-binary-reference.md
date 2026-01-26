# Update Dust Binary Reference

Update the dust help text and documentation to use `bin/dust` instead of `dust` when running from the repository itself.

When developing or testing dust within its own repository, the correct invocation is `bin/dust` (to run the local version) rather than a globally installed `dust` command. The help output and agent guide should reflect this to avoid confusion.

## Goals

- [Easy Adoption](../goals/easy-adoption.md)

## Blocked by

(none)

## Definition of done

- The help text output by `bin/dust help` references `bin/dust` in examples and the agent guide section
- CLAUDE.md and AGENTS.md reference `bin/dust` consistently
- Any other documentation within the repository uses `bin/dust` for commands
