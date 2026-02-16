# Decompose Idea: Type safe templates

Create one or more well-defined tasks from this idea. Prefer smaller, narrowly scoped tasks that each deliver a thin but complete vertical slice of working software -- a path through the system that can be tested end-to-end -- rather than component-oriented tasks (like "add schema" or "build endpoint") that only work once all tasks are done. Split the idea into multiple tasks if it covers more than one logical change. Review `.dust/goals/` to link relevant goals and `.dust/facts/` for design decisions that should inform the task. See [Type safe templates](../ideas/type-safe-templates.md).

## Resolved Questions

### Should this idea subsume or replace the existing "Replace Text Templates" idea?

**Decision:** Merge into this idea and delete the other

### What should the `dedent` implementation handle?

**Decision:** Simple version (strip common leading whitespace only)

### Where should template functions live?

**Decision:** Inline in the command files that use them

### Should this obsolete the "Add Template Name Validation" idea?

**Decision:** Yes, close it as part of implementing this


## Goals

(none)

## Blocked By

(none)

## Definition of Done

- [ ] One or more new tasks are created in .dust/tasks/
- [ ] Task's Goals section links to relevant goals from .dust/goals/
- [ ] The original idea is deleted or updated to reflect remaining scope
