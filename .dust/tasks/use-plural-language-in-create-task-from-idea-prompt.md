# Use plural language in create-task-from-idea prompt

Update `createTaskFromIdea` in `lib/workflow-tasks.ts` to use plural language encouraging multiple tasks per idea.

## Changes

The opening sentence currently says:

> Create a well-defined task from this idea.

Change it to:

> Create one or more well-defined tasks from this idea. Prefer smaller, narrowly scoped tasks -- split the idea into multiple tasks if it covers more than one logical change.

The definition of done item currently says:

> A new task is created in .dust/tasks/

Change it to:

> One or more new tasks are created in .dust/tasks/

Update tests in `lib/workflow-tasks.test.ts` to match the new wording.

## Goals

- [Small Units](../goals/small-units.md)

## Blocked By

(none)

## Definition of Done

- [ ] Opening sentence in `createTaskFromIdea` uses plural language encouraging multiple tasks
- [ ] Definition of done item uses plural language
- [ ] Tests updated to match new wording
- [ ] `bin/dust check` passes
