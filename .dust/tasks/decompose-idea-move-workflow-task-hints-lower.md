# Decompose Idea: Move Workflow Task Hints Lower

Create one or more well-defined tasks from this idea. Prefer smaller, narrowly scoped tasks that each deliver a thin but complete vertical slice of working software -- a path through the system that can be tested end-to-end -- rather than component-oriented tasks (like "add schema" or "build endpoint") that only work once all tasks are done. Split the idea into multiple tasks if it covers more than one logical change. Run `dust principles` to link relevant principles and `dust facts` for design decisions that should inform the task. See [Move Workflow Task Hints Lower](../ideas/move-workflow-task-hints-lower.md).

Really think about "Functional Core, Imperative Shell"

Ensure the facts are up to date!

## Resolved Questions

### Where should interpolated hints be placed in the template?

**Decision:** Option: Add a dedicated `## Repository Hints` section before `## Definition of Done` (Recommended)

### Should hint placement change for all workflow task types or only capture tasks?

**Decision:** Option: Change all task types (Recommended)


## Decomposes Idea

- [Move Workflow Task Hints Lower](../ideas/move-workflow-task-hints-lower.md)

## Blocked By

(none)

## Definition of Done

- [ ] One or more new tasks are created in .dust/tasks/
- [ ] Task's Principles section links to relevant principles from .dust/principles/
- [ ] The original idea is deleted or updated to reflect remaining scope
