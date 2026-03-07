# Decompose Idea: Single Responsibility Violations Audit

Create one or more well-defined tasks from this idea. Prefer smaller, narrowly scoped tasks that each deliver a thin but complete vertical slice of working software -- a path through the system that can be tested end-to-end -- rather than component-oriented tasks (like "add schema" or "build endpoint") that only work once all tasks are done. Split the idea into multiple tasks if it covers more than one logical change. Run `dust principles` to link relevant principles and `dust facts` for design decisions that should inform the task. See [Single Responsibility Violations Audit](../ideas/single-responsibility-violations-audit.md).

Really think about "Functional Core, Imperative Shell"

## Resolved Questions

### What threshold should trigger a single-responsibility finding?

**Decision:** Option: Primary threshold by responsibility count

### Should findings include only runtime code?

**Decision:** Option: Include test helpers too


## Decomposes Idea

- [Single Responsibility Violations Audit](../ideas/single-responsibility-violations-audit.md)

## Blocked By

(none)

## Definition of Done

- [ ] One or more new tasks are created in .dust/tasks/
- [ ] Task's Principles section links to relevant principles from .dust/principles/
- [ ] The original idea is deleted or updated to reflect remaining scope
