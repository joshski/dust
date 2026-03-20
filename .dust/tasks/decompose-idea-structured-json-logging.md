# Decompose Idea: Structured JSON Logging

Create one or more well-defined tasks from this idea. Prefer smaller, narrowly scoped tasks that each deliver a thin but complete vertical slice of working software -- a path through the system that can be tested end-to-end -- rather than component-oriented tasks (like "add schema" or "build endpoint") that only work once all tasks are done. Split the idea into multiple tasks if it covers more than one logical change. Run `dust principles` to link relevant principles and `dust facts` for design decisions that should inform the task. See [Structured JSON Logging](../ideas/structured-json-logging.md).

## Resolved Questions

### Should JSON and text logging be mutually exclusive?

**Decision:** Either/or

### What fields should be standardized?

**Decision:** Minimal schema

### How should this interact with existing DEBUG filtering?

**Decision:** Separate controls


## Decomposes Idea

- [Structured JSON Logging](../ideas/structured-json-logging.md)

## Blocked By

(none)

## Repository Hints

Really think about "Functional Core, Imperative Shell"


## Definition of Done

- One or more new tasks are created in .dust/tasks/
- Task's Principles section links to relevant principles from .dust/principles/
- The original idea is deleted or updated to reflect remaining scope
