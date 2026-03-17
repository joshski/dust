# Decompose Idea: Validation-safe artifact patch API

Create one or more well-defined tasks from this idea. Prefer smaller, narrowly scoped tasks that each deliver a thin but complete vertical slice of working software -- a path through the system that can be tested end-to-end -- rather than component-oriented tasks (like "add schema" or "build endpoint") that only work once all tasks are done. Split the idea into multiple tasks if it covers more than one logical change. Run `dust principles` to link relevant principles and `dust facts` for design decisions that should inform the task. See [Validation-safe artifact patch API](../ideas/validation-safe-artifact-patch-api.md).

## Resolved Questions

### What level of abstraction should the public API expose?

**Decision:** Option: Both high-level and serializers

### Should the API auto-update referencing artifacts on deletion?

**Decision:** Option: Auto-discover and update references

### How should body content be expressed for artifacts?

**Decision:** Option: Markdown body field

### Should workflow task types be supported?

**Decision:** Allow workflow tasks in the same 'tasks' object as any other tasks, but the `type` discriminator should determine the attributes that are acceptable for those workflow tasks.


## Decomposes Idea

- [Validation-safe artifact patch API](../ideas/validation-safe-artifact-patch-api.md)

## Blocked By

(none)

## Repository Hints

Really think about "Functional Core, Imperative Shell"


## Definition of Done

- One or more new tasks are created in .dust/tasks/
- Task's Principles section links to relevant principles from .dust/principles/
- The original idea is deleted or updated to reflect remaining scope
