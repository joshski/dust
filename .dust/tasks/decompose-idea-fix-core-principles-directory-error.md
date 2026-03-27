# Decompose Idea: Fix Core Principles Directory Error

Create one or more well-defined tasks from this idea. Prefer smaller, narrowly scoped tasks that each deliver a thin but complete vertical slice of working software -- a path through the system that can be tested end-to-end -- rather than component-oriented tasks (like "add schema" or "build endpoint") that only work once all tasks are done. Split the idea into multiple tasks if it covers more than one logical change. Run `dust principles` to link relevant principles and `dust facts` for design decisions that should inform the task. See [Fix Core Principles Directory Error](../ideas/fix-core-principles-directory-error.md).

By exposing the principles s part of the package but not as a directory we will need to expose a way to read the core principles using the CLI. We should update the `dust principles` command so that it shows instructions to call `dust core principle <name>` instead of showing the path to the core principles in `dust principles`

## Resolved Questions

### Question: Should we bundle principles into the JavaScript bundle?

**Decision:** Option: Bundle principles as JavaScript module


## Decomposes Idea

- [Fix Core Principles Directory Error](../ideas/fix-core-principles-directory-error.md)


## Task Type

decompose

## Blocked By

(none)

## Repository Hints

Really think about "Functional Core, Imperative Shell"


## Definition of Done

- One or more new tasks are created in .dust/tasks/
- Task's Principles section links to relevant principles from .dust/principles/
- The original idea is deleted or updated to reflect remaining scope
