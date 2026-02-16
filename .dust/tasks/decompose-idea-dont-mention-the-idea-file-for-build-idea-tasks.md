# Decompose Idea: Don't mention the idea file for "Build Idea" tasks

Create one or more well-defined tasks from this idea. Prefer smaller, narrowly scoped tasks that each deliver a thin but complete vertical slice of working software -- a path through the system that can be tested end-to-end -- rather than component-oriented tasks (like "add schema" or "build endpoint") that only work once all tasks are done. Split the idea into multiple tasks if it covers more than one logical change. Review `.dust/goals/` to link relevant goals and `.dust/facts/` for design decisions that should inform the task. See [Don't mention the idea file for "Build Idea" tasks](../ideas/dont-mention-the-idea-file-for-build-idea-tasks.md).

The parsing logic already exists in ideas.ts I think

## Resolved Questions

### How should the template system detect task type?

**Decision:** Parse the current task file

### Should the instruction be omitted entirely or rephrased?

**Decision:** Omit the bullet point


## Goals

(none)

## Blocked By

(none)

## Definition of Done

- [ ] One or more new tasks are created in .dust/tasks/
- [ ] Task's Goals section links to relevant goals from .dust/goals/
- [ ] The original idea is deleted or updated to reflect remaining scope
