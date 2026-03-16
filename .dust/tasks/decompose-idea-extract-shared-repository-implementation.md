# Decompose Idea: Extract Shared Repository Implementation

Create one or more well-defined tasks from this idea. Prefer smaller, narrowly scoped tasks that each deliver a thin but complete vertical slice of working software -- a path through the system that can be tested end-to-end -- rather than component-oriented tasks (like "add schema" or "build endpoint") that only work once all tasks are done. Split the idea into multiple tasks if it covers more than one logical change. Run `dust principles` to link relevant principles and `dust facts` for design decisions that should inform the task. See [Extract Shared Repository Implementation](../ideas/extract-shared-repository-implementation.md).

## Resolved Questions

### Should this use composition or inheritance?

**Decision:** Option: Composition with spread

### Should the interface types also be unified?

**Decision:** Option: Separate interfaces, shared implementation


## Decomposes Idea

- [Extract Shared Repository Implementation](../ideas/extract-shared-repository-implementation.md)

## Blocked By

(none)

## Repository Hints

Really think about "Functional Core, Imperative Shell"


## Definition of Done

- [ ] One or more new tasks are created in .dust/tasks/
- [ ] Task's Principles section links to relevant principles from .dust/principles/
- [ ] The original idea is deleted or updated to reflect remaining scope
