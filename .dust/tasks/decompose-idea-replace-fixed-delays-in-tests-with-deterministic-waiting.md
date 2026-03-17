# Decompose Idea: Replace Fixed Delays in Tests with Deterministic Waiting

Create one or more well-defined tasks from this idea. Prefer smaller, narrowly scoped tasks that each deliver a thin but complete vertical slice of working software -- a path through the system that can be tested end-to-end -- rather than component-oriented tasks (like "add schema" or "build endpoint") that only work once all tasks are done. Split the idea into multiple tasks if it covers more than one logical change. Run `dust principles` to link relevant principles and `dust facts` for design decisions that should inform the task. See [Replace Fixed Delays in Tests with Deterministic Waiting](../ideas/replace-fixed-delays-in-tests-with-deterministic-waiting.md).

## Resolved Questions

### Which replacement strategy should be preferred?

**Decision:** Use our own fake timers implementation, prefer dependency injection over globals

### Should we create a waitForCondition helper?

**Decision:** Use vi.waitFor() exclusively


## Decomposes Idea

- [Replace Fixed Delays in Tests with Deterministic Waiting](../ideas/replace-fixed-delays-in-tests-with-deterministic-waiting.md)

## Blocked By

(none)

## Repository Hints

Really think about "Functional Core, Imperative Shell"


## Definition of Done

- One or more new tasks are created in .dust/tasks/
- Task's Principles section links to relevant principles from .dust/principles/
- The original idea is deleted or updated to reflect remaining scope
