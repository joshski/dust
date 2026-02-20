# Decompose Idea: Fix coverage gaps

Create one or more well-defined tasks from this idea. Prefer smaller, narrowly scoped tasks that each deliver a thin but complete vertical slice of working software -- a path through the system that can be tested end-to-end -- rather than component-oriented tasks (like "add schema" or "build endpoint") that only work once all tasks are done. Split the idea into multiple tasks if it covers more than one logical change. Review `.dust/principles/` to link relevant principles and `.dust/facts/` for design decisions that should inform the task. See [Fix coverage gaps](../ideas/fix-coverage-gaps.md).

## Resolved Questions

### Should the logger be injected as a dependency to enable coverage of log statements?

**Decision:** Option: Inject logger dependency

### Should file-level exclusions be removed once thin wrapper logic is extracted?

**Decision:** Option: Remove exclusions after refactoring

### How much factory logic is worth extracting for testability?

**Decision:** Option: Extract only substantial logic


## Principles

(none)

## Blocked By

(none)

## Definition of Done

- [ ] One or more new tasks are created in .dust/tasks/
- [ ] Task's Principles section links to relevant principles from .dust/principles/
- [ ] The original idea is deleted or updated to reflect remaining scope
