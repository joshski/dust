# Rename loop command to loop claude

Rename the `dust loop` command to `dust loop claude` and add max iterations as a positional argument.

## Current State

The `dust loop` command is currently implemented in `lib/cli/commands/loop.ts` and runs indefinitely without max iterations support. It's hardcoded to use Claude.

## Changes Required

1. **Rename command**: Change from `dust loop` to `dust loop claude` to align with agent-agnostic design
   - Add `loop-claude` entry to command registry in `lib/cli/main.ts`
   - Eventually support other agents like `loop aider`, `loop codex`

2. **Add max iterations as first positional argument**:
   - `dust loop claude 5` runs 5 task iterations
   - Default to 10 iterations if not specified
   - Sleep iterations (when no tasks available) should not count toward max

3. **Update implementation**:
   - Parse first argument as max iterations number
   - Add iteration counter to the loop
   - Exit with success after reaching max iterations

## Files to Modify

- `lib/cli/main.ts` - Update command registry
- `lib/cli/commands/loop.ts` - Add iteration counting and argument parsing
- `lib/cli/commands/loop.test.ts` - Update tests for new behavior
- `README.md` - Update documentation to reflect new command name

## Goals

- [Agent Agnostic](../goals/agent-agnostic.md)

## Blocked by

(none)

## Definition of done

- [ ] Command is invoked as `dust loop claude <n>` instead of `dust loop`
- [ ] Max iterations is accepted as first positional argument
- [ ] Loop exits after completing max iterations (default 10)
- [ ] Sleep iterations do not count toward max
- [ ] All existing tests pass
- [ ] New tests cover iteration limiting behavior
