# Decompose Idea: Stock Audit Consolidation

Create one or more well-defined tasks from this idea. Prefer smaller, narrowly scoped tasks that each deliver a thin but complete vertical slice of working software -- a path through the system that can be tested end-to-end -- rather than component-oriented tasks (like "add schema" or "build endpoint") that only work once all tasks are done. Split the idea into multiple tasks if it covers more than one logical change. Run `dust principles` to link relevant principles and `dust facts` for design decisions that should inform the task. See [Stock Audit Consolidation](../ideas/stock-audit-consolidation.md).

## Resolved Questions

### Should `commit-review` replace both `ideas-from-commits` and `refactoring-opportunities`, or just absorb `ideas-from-commits`?

**Decision:** Option: Rename to `commit-review`

### Should `security-review` remain a stock audit or become documentation-only?

**Decision:** Option: Keep as audit with tooling focus


## Decomposes Idea

- [Stock Audit Consolidation](../ideas/stock-audit-consolidation.md)

## Blocked By

(none)

## Repository Hints

Really think about "Functional Core, Imperative Shell"


## Definition of Done

- [ ] One or more new tasks are created in .dust/tasks/
- [ ] Task's Principles section links to relevant principles from .dust/principles/
- [ ] The original idea is deleted or updated to reflect remaining scope
