# Use dangerously-skip-permissions in loop command

The `dust loop` command runs Claude Code continuously to work on tasks. Currently, it doesn't pass any permission flags, so Claude Code prompts for tool permissions during execution, which breaks the autonomous loop.

The loop command should use `--dangerously-skip-permissions` to bypass all permission checks, since the entire point of the loop is unattended autonomous operation.

## Changes needed

1. Add `dangerouslySkipPermissions` option to `SpawnOptions` in `lib/claude/types.ts`
2. Handle the flag in `lib/claude/spawn-claude-code.ts` by passing `--dangerously-skip-permissions` when enabled
3. Add a test for the new option in `lib/claude/spawn-claude-code.test.ts`
4. Update `lib/cli/commands/loop.ts` to:
   - Pass `dangerouslySkipPermissions: true` when calling `run()`
   - Display a warning at startup: "WARNING: This command skips all permission checks. Only use in a sandbox environment!"

## Goals

- [Agent autonomy](../goals/agent-autonomy.md)

## Blocked by

(none)

## Definition of done

- [ ] `SpawnOptions` interface includes `dangerouslySkipPermissions?: boolean`
- [ ] `spawn-claude-code.ts` passes `--dangerously-skip-permissions` when the option is true
- [ ] Test verifies the flag is passed correctly
- [ ] `loop.ts` uses `dangerouslySkipPermissions: true`
- [ ] Loop command displays sandbox warning at startup
