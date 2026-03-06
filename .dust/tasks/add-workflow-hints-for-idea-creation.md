# Add Workflow Hints for Idea Creation

Add workflow hint support to `createIdeaTask` in `lib/artifacts/workflow-tasks.ts`, matching the pattern used by refine/decompose/shelve tasks.

Two new hint files:

- `.dust/config/workflow-hints/add-idea.md` - Appended to "Add Idea" task instructions
- `.dust/config/workflow-hints/expedite-idea.md` - Appended to "Expedite Idea" task instructions

`createIdeaTask` currently builds task content inline without calling `readWorkflowHint`. Wire up hint reading for both the regular and expedite paths, appending hint content to the opening sentence when the file exists.

## Blocked By

(none)

## Definition of Done

- [ ] `createIdeaTask` reads and appends `add-idea.md` hint for regular idea tasks
- [ ] `createIdeaTask` reads and appends `expedite-idea.md` hint for expedited idea tasks
- [ ] Tests cover both hint-present and hint-absent cases for each path
- [ ] Fact file `.dust/facts/workflow-tasks.md` updated with new hint paths
- [ ] All checks pass
