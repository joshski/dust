# Rework dust bucket worker prompt

The prompt given to agents when starting an iteration of `dust bucket worker` or `dust loop` could be clearer and more concise.

## Context

The prompt is constructed in `lib/cli/commands/loop.ts:382-394` and uses `buildImplementationInstructions` from `lib/cli/commands/focus.ts:14-71` for the instruction section.

### Current prompt structure

```
Run `{installCommand}` to install dependencies, then implement the following task.

The following is the contents of the task file `.dust/tasks/some-idea.md`:

----------
# Some Idea

...

----------

When the task is complete, delete the task file `.dust/tasks/some-idea.md`.

## Instructions

Note: Do NOT run `{bin} agent`.

1. Run `{bin} check` to verify the project is in a good state
2. Implement the task
3. [Optional: Run `{bin} check` before committing - only if hooks not installed]
4. Create a single atomic commit that includes:
   - All implementation changes
   - Deletion of the completed task file
   - Updates to any facts that changed
   - Deletion of the idea file that spawned this task (if remaining scope exists, create new ideas for it)

   Use this exact commit message: "Some Idea". Do not add any prefix.

5. Push your commit to the remote repository

Keep your change small and focused. One task, one commit.
```

### Proposed prompt structure

```
Implement the task at `.dust/tasks/some-idea.md`:

----------
# Some Idea

...

----------

## How to implement the task

Note: Do NOT run `{bin} agent`.

1. Run `{installCommand}` to install dependencies
2. Run `{bin} check` to verify the project is in a good state
3. Make changes to the repository as per the task file
4. Create a single atomic commit that:
   - Includes all implementation changes
   - Deletes the completed task file (`.dust/tasks/some-idea.md`)
   - Updates any facts that changed (Run `{bin} facts` to see which ones may be affected)
   - Uses the exact commit message "Some Idea". Do not add any prefix.
5. Push your commit to the remote repository

Keep your change small and focused. One task, one commit.
```

### Key changes

1. **Lead with the task location** - The proposed prompt immediately tells the agent where to find the task, making the structure clearer
2. **Move install command into numbered steps** - Currently `bun install` is mentioned in a preamble; moving it into the step list makes the sequence explicit
3. **Rename section to "How to implement the task"** - Clearer than just "Instructions"
4. **Inline the task path in the delete instruction** - Makes it explicit which file to delete
5. **Suggest running `{bin} facts`** - Helps agents understand which facts might need updating
6. **Remove the idea file deletion bullet** - This is already covered in the task content itself and duplicating it in the instructions may cause confusion
7. **Consolidate commit bullet formatting** - Uses "that:" with sub-bullets for better visual scanning

## Files to modify

- `lib/cli/commands/loop.ts` - Main prompt construction (lines 382-394)
- `lib/cli/commands/focus.ts` - `buildImplementationInstructions` function (lines 14-71)

## Open Questions

### Should the idea file deletion instruction be removed from buildImplementationInstructions?

#### Option: Remove from buildImplementationInstructions

The current code adds this instruction conditionally based on `hasIdeaFile`. But the task file itself already contains instructions about deleting the idea file when relevant.

Removing it simplifies the instruction generation and avoids duplication. The task file is the source of truth for what artifacts need to be managed.

#### Option: Keep for clarity

Having the instruction in both places reinforces the requirement. Agents may focus primarily on the instructions section and miss details in the task content.

### Should the check step before committing be kept?

#### Option: Always omit the explicit check step

Currently, step 3 (run `{bin} check` before committing) is conditionally included only when git hooks are not installed. With hooks installed, this check happens automatically during commit.

When hooks are installed, the check is automatic. When hooks aren't installed, agents are sophisticated enough to understand they should verify their work.

#### Option: Keep conditional check step

Explicit is better than implicit. Agents may not understand the git hooks system and an explicit step ensures checks always run.

#### Option: Always include the check step

Even with hooks, having an explicit step creates a checkpoint where agents can verify their work before attempting to commit. This catches issues earlier.

### Should the idea file deletion be mentioned in the commit description?

#### Option: Include for non-expedite tasks

The proposed structure removes the explicit mention of deleting the idea file from the commit bullet points.

Adding back the bullet point for tasks that have an associated idea file (non-expedite tasks) ensures this important part of the atomic commit requirement is visible.

#### Option: Rely on task content

The task file itself specifies what artifacts need to be cleaned up. Duplicating this in the instructions risks the two getting out of sync.
