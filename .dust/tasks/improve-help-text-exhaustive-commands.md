# Improve help text with exhaustive command list

Update the help text to show all available commands explicitly rather than using shorthand notation like `[type]` or `[cmd]`. This makes it easier for both humans and AI agents to discover all available functionality at a glance.

## Changes

1. Update `lib/templates/help.txt`:
   - New tagline: "A workflow tool for keeping AI coding agents on track"
   - List all `list` subcommands explicitly with descriptions of each type
   - List all `agent` subcommands explicitly
   - Add `pre-push` command
   - Remove examples section (commands are now self-documenting)

2. Update test files to match new tagline:
   - `lib/cli/entry-wiring.test.ts`
   - `lib/cli/main.test.ts`

## Goals

- [Context Window Efficiency](../goals/context-window-efficiency.md)
- [Agent Autonomy](../goals/agent-autonomy.md)

## Blocked by

(none)

## Definition of done

- [ ] Help text shows exhaustive list of all commands
- [ ] Each list type includes a brief description
- [ ] All tests pass
- [ ] `bin/dust validate` passes
