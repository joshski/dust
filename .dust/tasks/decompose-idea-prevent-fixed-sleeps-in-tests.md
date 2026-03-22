# Decompose Idea: Prevent fixed sleeps in tests

Create one or more well-defined tasks from this idea. Prefer smaller, narrowly scoped tasks that each deliver a thin but complete vertical slice of working software -- a path through the system that can be tested end-to-end -- rather than component-oriented tasks (like "add schema" or "build endpoint") that only work once all tasks are done. Split the idea into multiple tasks if it covers more than one logical change. Run `dust principles` to link relevant principles and `dust facts` for design decisions that should inform the task. See [Prevent fixed sleeps in tests](../ideas/prevent-fixed-sleeps-in-tests.md).

## Resolved Questions

### Where should the rule be implemented?

**Decision:** Oxlint plugin (JavaScript)

### Should setTimeout(fn, 0) be allowed?

**Decision:** Yes, allow zero delays

### How should legitimate timing tests be handled?

**Decision:** Require injected time dependencies


## Decomposes Idea

- [Prevent fixed sleeps in tests](../ideas/prevent-fixed-sleeps-in-tests.md)

## Blocked By

(none)

## Repository Hints

Really think about "Functional Core, Imperative Shell"


## Definition of Done

- One or more new tasks are created in .dust/tasks/
- Task's Principles section links to relevant principles from .dust/principles/
- The original idea is deleted or updated to reflect remaining scope
