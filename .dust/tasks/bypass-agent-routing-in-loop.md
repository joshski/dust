# Bypass agent routing in loop

Modify the loop command to select the next task directly and construct a complete prompt for Claude, bypassing the multi-step agent routing flow. This saves context window tokens by eliminating the agent greeting menu and multiple command outputs.

## Current Flow (wasteful)

1. Loop passes prompt: `Run \`bun install && bin/dust agent && bin/dust pick task\``
2. Agent receives routing menu, runs commands to discover tasks
3. Agent reads task file, runs `dust focus` for instructions
4. Agent implements the task

## New Flow (direct)

1. Loop calls `findUnblockedTasks()` internally to get next task
2. Loop reads task file content directly
3. Loop constructs prompt containing:
   - Statement that we are listing the task file contents
   - The raw task file content (verbatim markdown)
   - Implementation instructions (same as `dust focus` output)
   - Instruction to delete the specific task file on completion
4. Claude receives complete context and implements immediately

## Decisions

These decisions are already resolved in the idea file:

- **Scope**: Loop/bucket only (interactive `dust agent` unchanged)
- **No tasks**: Return early with existing `loop.no_tasks` event
- **Task format**: Raw markdown content, not processed/structured
- **Blocked tasks**: Caller (`findUnblockedTasks`) ensures only unblocked tasks returned

## Goals

- [Context Window Efficiency](../goals/context-window-efficiency.md)

## Blocked By

(none)

## Definition of Done

- [ ] `runOneIteration` calls `findUnblockedTasks()` to get next task
- [ ] Task file content is read and included in the prompt
- [ ] Prompt includes implementation instructions from `focus.ts` logic
- [ ] Prompt explicitly mentions that it is listing the task file contents
- [ ] Prompt includes deletion instruction for the specific task file
- [ ] Same changes applied to bucket's run wrapper in `repository.ts`
- [ ] Tests verify the new prompt format
- [ ] Context window savings demonstrated (fewer tokens used)
