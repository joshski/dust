# Delete `dust understand goals`

The `dust understand goals` command is no longer needed. The information it provides is minimal and agents can simply run `bin/dust list goals` directly.

## Files to delete

- `lib/cli/commands/understand-goals.ts` - Command implementation
- `lib/templates/agent-understand-goals.txt` - Template file

## Files to modify

- `lib/cli/main.ts` - Remove import of `understandGoals` and remove `'understand goals': understandGoals` from the command registry
- `lib/templates/help.txt` - Remove the line `  understand goals          Understanding goals`

## Goals

- [Minimal Dependencies](../goals/minimal-dependencies.md)

## Blocked by

(none)

## Definition of done

- [ ] `lib/cli/commands/understand-goals.ts` deleted
- [ ] `lib/templates/agent-understand-goals.txt` deleted
- [ ] Import and registry entry removed from `lib/cli/main.ts`
- [ ] Command removed from `lib/templates/help.txt`
- [ ] `bin/dust lint markdown` passes
- [ ] `bin/dust understand goals` returns an "Unknown command" error
