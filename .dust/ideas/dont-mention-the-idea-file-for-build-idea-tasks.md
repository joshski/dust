# Don't mention the idea file for "Build Idea" tasks

The instruction "Deletion of the idea file that spawned this task" appears in agent templates but doesn't apply to "Build Idea" tasks.

## Current State

When capturing a new idea via `createCaptureIdeaTask` (`lib/workflow-tasks.ts:273-348`), there are two paths:

1. **Add Idea** (`buildItNow: false`): Creates an "Add Idea: ..." task that results in an idea file in `.dust/ideas/`. Later, when the idea is decomposed into concrete tasks, those tasks have an associated idea file to delete.

2. **Build Idea** (`buildItNow: true`): Creates a "Build Idea: ..." task that goes directly to creating task files. The idea content lives inline in the task's "## Idea Description" section. There is no separate idea file.

The instruction "Deletion of the idea file that spawned this task (if remaining scope exists, create new ideas for it)" appears in:
- `lib/templates/agent-implement-task.txt:15`
- `lib/templates/agent-new-task.txt:27`
- `lib/cli/commands/focus.ts:45`

This instruction is misleading for agents implementing "Build Idea" tasks because no idea file exists to delete.

## Proposed Change

Make the instruction conditional based on task type. When presenting implementation instructions:
- For tasks spawned from idea files (e.g., "Decompose Idea: ...", regular implementation tasks): Keep the instruction about deleting the idea file
- For "Build Idea: ..." tasks: Omit the instruction since no idea file exists

## Codebase Context

- `lib/workflow-tasks.ts` defines `BUILD_IDEA_PREFIX = 'Build Idea: '` and `CAPTURE_IDEA_PREFIX = 'Add Idea: '`
- `parseCaptureIdeaTask` parses both task types and returns `buildItNow: boolean`
- Templates are Handlebars files in `lib/templates/`
- `focus.ts:buildImplementationInstructions` builds the instruction string programmatically

## Open Questions

### How should the template system detect task type?

#### Parse the current task file

Read the focused task file and use `parseCaptureIdeaTask` to determine if it's a "Build Idea" task. If it returns `buildItNow: true`, omit the idea file deletion instruction.

#### Add a template variable for task type

Pass task metadata (including whether it's a "Build Idea" task) through to the template system via `templateVariables`. This requires changes to how templates receive context.

#### Check for title prefix

Simply check if the task title starts with "Build Idea: " and conditionally include the instruction. This is simpler but duplicates prefix knowledge.

### Should the instruction be omitted entirely or rephrased?

#### Omit the bullet point

For "Build Idea" tasks, simply don't include the "Deletion of the idea file..." bullet. This is cleanest but changes the instruction structure.

#### Rephrase to be conditional

Change to something like "Deletion of the idea file that spawned this task, if one exists (if remaining scope exists, create new ideas for it)". This keeps consistent structure but is wordier.
