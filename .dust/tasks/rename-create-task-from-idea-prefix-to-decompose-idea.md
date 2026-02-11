# Rename create-task-from-idea prefix to Decompose Idea

Rename the "Create Task From Idea" prefix to "Decompose Idea" to better signal the one-to-many intent when converting ideas into tasks.

## Changes

In `lib/workflow-tasks.ts`:

- Update `IDEA_TRANSITION_PREFIXES` to use `'Decompose Idea: '` instead of `'Create Task From Idea: '`
- Update `WORKFLOW_TASK_TYPES` entry for `create-task` to use the new prefix
- Update the `createTaskFromIdea` function to pass `'Decompose Idea: '` as the prefix

In `lib/workflow-tasks.test.ts`:

- Update `IDEA_TRANSITION_PREFIXES` test to expect `'Decompose Idea: '`
- Update `createTaskFromIdea` tests to expect the new prefix in file paths and content
- Update `findWorkflowTask` test for `create-task` to expect the new slug

In `lib/cli/commands/lint-markdown.test.ts`:

- Update the `validateIdeaTransitionTitle` test for the create-task prefix

In `.dust/facts/workflow-tasks.md`:

- Update prefix list and filename derivation examples

## Goals

- [Small Units](../goals/small-units.md)
- [Consistent Naming](../goals/consistent-naming.md)

## Blocked By

- [Use plural language in create-task-from-idea prompt](use-plural-language-in-create-task-from-idea-prompt.md)

## Definition of Done

- [ ] `IDEA_TRANSITION_PREFIXES` uses `'Decompose Idea: '`
- [ ] `WORKFLOW_TASK_TYPES` uses `'Decompose Idea: '` for the `create-task` type
- [ ] `createTaskFromIdea` passes the new prefix
- [ ] All tests updated and passing
- [ ] `.dust/facts/workflow-tasks.md` updated
- [ ] `bin/dust check` passes
