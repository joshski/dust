# Decompose Idea: Repository Lifecycle State Machine

Create one or more well-defined tasks from this idea. Prefer smaller, narrowly scoped tasks that each deliver a thin but complete vertical slice of working software -- a path through the system that can be tested end-to-end -- rather than component-oriented tasks (like "add schema" or "build endpoint") that only work once all tasks are done. Split the idea into multiple tasks if it covers more than one logical change. Run `dust principles` to link relevant principles and `dust facts` for design decisions that should inform the task. See [Repository Lifecycle State Machine](../ideas/repository-lifecycle-state-machine.md).

## Resolved Questions

### Is a full state machine necessary, or would a simpler typed state union suffice?

**Decision:** Option: Full state machine with transitions

### Should the state machine be a generic utility or repository-specific?

**Decision:** Option: Repository-specific implementation


## Decomposes Idea

- [Repository Lifecycle State Machine](../ideas/repository-lifecycle-state-machine.md)

## Blocked By

(none)

## Repository Hints

Really think about "Functional Core, Imperative Shell"


## Definition of Done

- One or more new tasks are created in .dust/tasks/
- Task's Principles section links to relevant principles from .dust/principles/
- The original idea is deleted or updated to reflect remaining scope
