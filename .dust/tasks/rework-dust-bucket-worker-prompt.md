# Rework dust bucket worker prompt

Restructure the prompt given to agents when starting an iteration of `dust bucket worker` or `dust loop` to be clearer and more concise.

## Changes Required

### 1. Update prompt structure in `lib/cli/commands/loop.ts` (lines 382-394)

Change from:
```
Run `{installCommand}` to install dependencies, then implement the following task.

The following is the contents of the task file `{taskPath}`:

----------
{taskContent}
----------

When the task is complete, delete the task file `{taskPath}`.

## Instructions

{instructions}
```

To:
```
Implement the task at `{taskPath}`:

----------
{taskContent}
----------

## How to implement the task

{instructions}
```

### 2. Update `buildImplementationInstructions` in `lib/cli/commands/focus.ts` (lines 14-71)

- Add `{installCommand}` as step 1: "Run `{installCommand}` to install dependencies"
- Rename heading logic (the function doesn't control the heading, so no change needed)
- Add explicit task path to delete instruction: "Deletes the completed task file (`{taskPath}`)"
- Add suggestion to run `{bin} facts` when updating facts
- For non-expedite tasks, include bullet for idea file deletion in the commit section

The function signature will need to accept additional parameters:
- `taskPath`: The path to the task file being implemented
- `installCommand`: The install command (e.g., `bun install`)

### Resolved Questions

- **Remove idea file deletion from buildImplementationInstructions?** → Yes, rely on commit bullet instead
- **Keep conditional check step?** → Yes, keep it
- **Mention idea file deletion in commit description?** → Yes, include for non-expedite tasks

## Principles

- [Context Window Efficiency](../principles/context-window-efficiency.md)
- [Clarity Over Brevity](../principles/clarity-over-brevity.md)
- [Agent Autonomy](../principles/agent-autonomy.md)

## Blocked By

(none)

## Definition of Done

- [ ] Prompt in `loop.ts` leads with task location instead of install command preamble
- [ ] Install command is moved into numbered steps in `buildImplementationInstructions`
- [ ] Task file path is inlined in the delete instruction
- [ ] Commit section includes suggestion to run `{bin} facts`
- [ ] Non-expedite tasks include idea file deletion bullet in commit section
- [ ] Existing tests pass
- [ ] Prompt format matches the proposed structure from the idea
