# Add Task -> Use "Create task:" prefix for task creation commits

Fix the duplicate commit message problem by using a "Create task:" prefix for task creation commits. Currently, when an "Add Idea" or "Build Idea" task is created and then implemented, both commits have identical messages.

For example:
```
09f7271 Add Idea: Per-repository credit system    <- implementation commit
78eacaf Add Idea: Per-repository credit system    <- task creation commit
```

## Change

Modify the instructions in `lib/cli/commands/new-idea.ts` and any similar task-creation instruction generators to use a "Create task:" prefix for task creation commits, while keeping implementation commits as they are today.

### Before
- Task creation commit: `Add Idea: Per-repository credit system`
- Implementation commit: `Add Idea: Per-repository credit system`

### After
- Task creation commit: `Create task: Add Idea: Per-repository credit system`
- Implementation commit: `Add Idea: Per-repository credit system`

This clearly distinguishes "task was created" from "task was completed" in the commit history.

## Relevant Code

- `lib/cli/commands/new-idea.ts:27` - Currently instructs: `"Add idea: <title>"`
- `lib/cli/commands/focus.ts:41` - Implementation instruction (keep as-is)
- Any other task creation commands that output commit message instructions

## Principles

- [Traceable Decisions](../principles/traceable-decisions.md) - Commit messages should capture intent; distinguishing creation from completion aids traceability
- [Atomic Commits](../principles/atomic-commits.md) - Each commit tells a complete story; unique messages make history clearer

## Blocked By

(none)

## Definition of Done

- [ ] `new-idea` command instructs "Create task: Add idea: <title>" format
- [ ] Any other task creation commands use the same "Create task:" prefix
- [ ] Tests updated if applicable
- [ ] `dust check` passes
