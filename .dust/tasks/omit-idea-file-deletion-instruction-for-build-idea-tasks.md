# Omit idea file deletion instruction for Build Idea tasks

Skip the "Deletion of the idea file" instruction for "Build Idea: ..." tasks. These tasks have no associated idea file since the idea content lives inline in the task.

## Background

When agents implement tasks, they receive instructions that include "Deletion of the idea file that spawned this task (if remaining scope exists, create new ideas for it)". This instruction is misleading for "Build Idea" tasks because no idea file exists - the idea content lives inline in the task's "## Idea Description" section.

## Implementation

The instruction appears in three places:
- `lib/templates/agent-implement-task.txt:15`
- `lib/templates/agent-new-task.txt:27`
- `lib/cli/commands/focus.ts:45` (in `buildImplementationInstructions`)

Modify these to conditionally include the instruction based on task type:
1. Parse the current task file using logic from `parseCaptureIdeaTask` in `lib/workflow-tasks.ts`
2. If the task title starts with `BUILD_IDEA_PREFIX` ("Build Idea: "), omit the idea file deletion bullet
3. For templates, add a new template variable (e.g., `hasIdeaFile`) and use Handlebars conditionals
4. For `focus.ts`, accept an optional parameter to indicate task type

## Goals

- [Agent Context Inference](../goals/agent-context-inference.md)

## Blocked By

(none)

## Definition of Done

- [ ] `buildImplementationInstructions` in focus.ts accepts task title and conditionally omits the idea file instruction for "Build Idea: ..." tasks
- [ ] Template files use a conditional to hide the instruction when `hasIdeaFile` is false
- [ ] Template rendering passes the appropriate value based on task type
- [ ] Tests verify the instruction is omitted for Build Idea tasks and included otherwise
