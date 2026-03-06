# Decompose Idea: Decomposition Hints

Create one or more well-defined tasks from this idea. Prefer smaller, narrowly scoped tasks that each deliver a thin but complete vertical slice of working software -- a path through the system that can be tested end-to-end -- rather than component-oriented tasks (like "add schema" or "build endpoint") that only work once all tasks are done. Split the idea into multiple tasks if it covers more than one logical change. Run `dust principles` to link relevant principles and `dust facts` for design decisions that should inform the task. See [Decomposition Hints](../ideas/decomposition-hints.md).

Inject the markdown into workflow tasks if files exist in `.dust/config/workflow-hints/` e.g. `.dust/config/workflow-hints/decompose-idea.md`

## Resolved Questions

### Where should decomposition hints live?

**Decision:** A directory for workflow hints

### Should hints be validated?

**Decision:** No validation

### Should hints apply to all workflow operations or just decomposition?

**Decision:** Separate hints per operation


## Decomposes Idea

- [Decomposition Hints](../ideas/decomposition-hints.md)

## Blocked By

(none)

## Definition of Done

- [ ] One or more new tasks are created in .dust/tasks/
- [ ] Task's Principles section links to relevant principles from .dust/principles/
- [ ] The original idea is deleted or updated to reflect remaining scope
