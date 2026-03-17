# Decompose Idea: Single-pass validation

Create one or more well-defined tasks from this idea. Prefer smaller, narrowly scoped tasks that each deliver a thin but complete vertical slice of working software -- a path through the system that can be tested end-to-end -- rather than component-oriented tasks (like "add schema" or "build endpoint") that only work once all tasks are done. Split the idea into multiple tasks if it covers more than one logical change. Run `dust principles` to link relevant principles and `dust facts` for design decisions that should inform the task. See [Single-pass validation](../ideas/single-pass-validation.md).

## Resolved Questions

### Should the artifact parsers themselves gain line-number tracking, or should a separate "lint parser" exist?

**Decision:** Enrich existing parsers

### Should patch validation share the same single-pass orchestrator?

**Decision:** Yes, unify both paths

### How should directory-structure validation fit in?

**Decision:** Include in Phase 1


## Decomposes Idea

- [Single-pass validation](../ideas/single-pass-validation.md)

## Blocked By

(none)

## Repository Hints

Really think about "Functional Core, Imperative Shell"


## Definition of Done

- One or more new tasks are created in .dust/tasks/
- Task's Principles section links to relevant principles from .dust/principles/
- The original idea is deleted or updated to reflect remaining scope
