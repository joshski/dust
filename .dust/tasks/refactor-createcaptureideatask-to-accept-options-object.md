# Refactor createCaptureIdeaTask to accept options object

Refactor `createCaptureIdeaTask` to accept a single options object instead of positional parameters. This aligns with `decomposeIdea` and prepares for future extensibility.

## Change Details

In `lib/workflow-tasks.ts`, change the signature from:

```typescript
createCaptureIdeaTask(fileSystem, dustPath, title, description)
```

To:

```typescript
createCaptureIdeaTask(fileSystem, dustPath, options: { title: string; description: string })
```

Keep `fileSystem` and `dustPath` as positional parameters since they are shared infrastructure concerns, not idea-specific options. Update all call sites in tests accordingly.

## Goals

- [Task-First Workflow](../goals/task-first-workflow.md)

## Blocked By

(none)

## Definition of Done

- [ ] `createCaptureIdeaTask` accepts `options: { title: string; description: string }` instead of separate `title` and `description` parameters
- [ ] All existing tests pass with the updated signature
- [ ] `bin/dust check` passes
