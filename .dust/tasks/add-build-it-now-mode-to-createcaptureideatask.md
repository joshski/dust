# Add build-it-now mode to createCaptureIdeaTask

Add a `buildItNow` option to `createCaptureIdeaTask` that changes the generated task to produce task files instead of an idea file. When `buildItNow` is true, the task title uses `Build Idea:` prefix and the instructions direct the agent to create tasks directly.

## Change Details

In `lib/workflow-tasks.ts`:

1. Add `BUILD_IDEA_PREFIX = 'Build Idea: '` constant (exported).
2. Add `buildItNow?: boolean` to the options object (depends on the refactor task completing first).
3. When `buildItNow` is true:
   - Use `Build Idea:` prefix instead of `Add Idea:`
   - Change the task body to instruct the agent to research the idea, review `.dust/goals/` and `.dust/facts/`, and create one or more narrowly-scoped task files in `.dust/tasks/`
   - Change the Definition of Done to:
     - One or more new tasks are created in `.dust/tasks/`
     - Tasks link to relevant goals from `.dust/goals/`
     - Tasks are narrowly scoped vertical slices
4. Add tests for the new mode.

## Goals

- [Agent Autonomy](../goals/agent-autonomy.md)
- [Fast Feedback Loops](../goals/fast-feedback-loops.md)

## Blocked By

(none)

## Definition of Done

- [ ] `createCaptureIdeaTask` with `buildItNow: true` generates a task with `Build Idea:` prefix
- [ ] The generated task body instructs the agent to create task files (not an idea file)
- [ ] The generated Definition of Done expects task files, not an idea file
- [ ] Tests cover both `buildItNow: true` and `buildItNow: false` (default) paths
- [ ] `bin/dust check` passes
