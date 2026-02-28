# Decompose Idea: Back channel structured events

Create one or more well-defined tasks from this idea. Prefer smaller, narrowly scoped tasks that each deliver a thin but complete vertical slice of working software -- a path through the system that can be tested end-to-end -- rather than component-oriented tasks (like "add schema" or "build endpoint") that only work once all tasks are done. Split the idea into multiple tasks if it covers more than one logical change. Run `dust principles` to link relevant principles and `dust facts` for design decisions that should inform the task. See [Back channel structured events](../ideas/back-channel-structured-events.md).

## Resolved Questions

### Which transport mechanism should be used for the back channel?

**Decision:** File descriptor (recommended)

### Should command events use the same envelope as agent events?

**Decision:** Yes, extend EventMessage with new event types

### Which commands should emit structured events?

**Decision:** All commands that produce parseable output

### How should events be buffered and flushed?

**Decision:** Write events immediately


## Decomposes Idea

- [Back channel structured events](../ideas/back-channel-structured-events.md)

## Blocked By

(none)

## Definition of Done

- [ ] One or more new tasks are created in .dust/tasks/
- [ ] Task's Principles section links to relevant principles from .dust/principles/
- [ ] The original idea is deleted or updated to reflect remaining scope
