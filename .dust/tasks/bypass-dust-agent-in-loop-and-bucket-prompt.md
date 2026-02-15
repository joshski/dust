# Bypass dust agent in loop and bucket prompt

In loop and bucket modes, the agent wastes context window tokens navigating CLI menus to find its task. The infrastructure should construct the prompt directly.

Instead, `runOneIteration` should:

1. Call `findUnblockedTasks` (from `lib/cli/commands/next.ts`) to identify the next task
2. Read the task file content using the file system
3. Construct a prompt containing:
   - The task title and raw file content
   - Implementation instructions (the same steps currently output by `lib/cli/commands/focus.ts`)
4. Pass this prompt directly to Claude, bypassing `dust agent` and `dust pick task` entirely

The `hasAvailableTasks` function in `loop.ts` already calls `findUnblockedTasks` -- it should return the tasks instead of just a boolean, so `runOneIteration` can use the first task directly.

Both `loop.ts` and `bucket/repository.ts` use `runOneIteration`, so both will benefit from this change.

The listing below shows the contents of the task file you are reading now. When you create your commit, delete this file: `.dust/tasks/bypass-dust-agent-in-loop-and-bucket-prompt.md`

## Goals

- [Context Window Efficiency](../goals/context-window-efficiency.md)
- [Fast Feedback](../goals/fast-feedback.md)

## Blocked By

(none)

## Definition of Done

- [ ] `runOneIteration` constructs a prompt with the task title, raw task file content, and implementation instructions
- [ ] The prompt no longer tells Claude to run `dust agent` or `dust pick task`
- [ ] The `focus.ts` instruction template is extracted into a shared function usable by both `focus` and loop prompt construction
- [ ] Existing loop and bucket tests pass with the new prompt construction
