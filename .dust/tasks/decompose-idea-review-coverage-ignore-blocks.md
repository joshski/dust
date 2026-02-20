# Decompose Idea: Review coverage ignore blocks

Create one or more well-defined tasks from this idea. Prefer smaller, narrowly scoped tasks that each deliver a thin but complete vertical slice of working software -- a path through the system that can be tested end-to-end -- rather than component-oriented tasks (like "add schema" or "build endpoint") that only work once all tasks are done. Split the idea into multiple tasks if it covers more than one logical change. Review `.dust/principles/` to link relevant principles and `.dust/facts/` for design decisions that should inform the task. See [Review coverage ignore blocks](../ideas/review-coverage-ignore-blocks.md).

## Resolved Questions

### Should we prioritize based on test value or coverage line reduction?

**Decision:** Option: Prioritize test value

### How much refactoring is acceptable?

**Decision:** Option: Allow structural refactoring where it improves design

### Should v8 callback limitation blocks be addressed?

**Decision:** Option: Refactor callbacks to be testable


## Principles

(none)

## Blocked By

(none)

## Definition of Done

- [ ] One or more new tasks are created in .dust/tasks/
- [ ] Task's Principles section links to relevant principles from .dust/principles/
- [ ] The original idea is deleted or updated to reflect remaining scope
