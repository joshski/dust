# Add skip dust agent guidance to automated prompts

When `dust loop` and `dust bucket` invoke Claude Code, they construct task-specific prompts directly. However, users may have CLAUDE.md configured with instructions to run `dust agent` immediately (as recommended by `dust init`).

This creates a conflict: the agent receives a direct task prompt but may also be instructed via CLAUDE.md to run `dust agent` first, which would be redundant.

## Implementation

1. Modify `buildImplementationInstructions()` in `lib/cli/commands/focus.ts` to add a note at the beginning:

   > "Note: Skip the `dust agent` step - your task has already been specified below"

2. Add the same guidance to the git conflict resolution prompt in `lib/cli/commands/loop.ts` (the `pullResult.message` handling block around line 251-260).

3. Set `DUST_SKIP_AGENT=1` environment variable when invoking Claude in automated contexts (alongside the existing `DUST_UNATTENDED: '1'`). This allows `dust agent` to detect this state and provide helpful feedback if invoked anyway.

4. Update `dust agent` command to detect `DUST_SKIP_AGENT=1` and respond appropriately (e.g., "You're running in an automated loop - proceeding to implement the assigned task.").

## Goals

- [Unsurprising UX](../goals/unsurprising-ux.md)

## Blocked By

(none)

## Definition of Done

- [ ] `buildImplementationInstructions()` includes skip guidance note
- [ ] Git conflict resolution prompts include skip guidance
- [ ] `DUST_SKIP_AGENT=1` is set when invoking Claude in `dust loop` and `dust bucket`
- [ ] `dust agent` detects `DUST_SKIP_AGENT` and outputs a helpful message instead of routing
- [ ] All tests pass
