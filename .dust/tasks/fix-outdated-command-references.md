# Fix Outdated Command References

The command `dust agent implement task` is outdated. The correct command is `dust implement task` - the `agent` command is separate and just shows greeting/routing instructions.

## Files to Fix

- `.dust/facts/command-syntax.md:9` - example shows `dust agent implement task`
- `lib/cli/commands/new-task.test.ts` - likely has similar outdated reference

## Goals

- [Clarity Over Brevity](../goals/clarity-over-brevity.md)

## Blocked By

(none)

## Definition of Done

- [ ] All references to `dust agent implement task` changed to `dust implement task`
- [ ] `bin/dust lint markdown` passes
- [ ] Tests pass
