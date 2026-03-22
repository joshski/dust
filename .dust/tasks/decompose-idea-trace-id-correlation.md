# Decompose Idea: Trace ID Correlation

Create one or more well-defined tasks from this idea. Prefer smaller, narrowly scoped tasks that each deliver a thin but complete vertical slice of working software -- a path through the system that can be tested end-to-end -- rather than component-oriented tasks (like "add schema" or "build endpoint") that only work once all tasks are done. Split the idea into multiple tasks if it covers more than one logical change. Run `dust principles` to link relevant principles and `dust facts` for design decisions that should inform the task. See [Trace ID Correlation](../ideas/trace-id-correlation.md).

Is there already a session ID we can use as the trace ID? or is that the wrong granularity or a maintenance issue? I don’t feel strongly, just wondered

## Resolved Questions

### What format should trace IDs use?

**Decision:** UUIDs

### How should trace IDs propagate?

**Decision:** Environment variables


## Decomposes Idea

- [Trace ID Correlation](../ideas/trace-id-correlation.md)

## Blocked By

(none)

## Repository Hints

Really think about "Functional Core, Imperative Shell"


## Definition of Done

- One or more new tasks are created in .dust/tasks/
- Task's Principles section links to relevant principles from .dust/principles/
- The original idea is deleted or updated to reflect remaining scope
