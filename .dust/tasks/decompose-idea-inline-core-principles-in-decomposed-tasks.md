# Decompose Idea: Inline Core Principles in Decomposed Tasks

Create one or more well-defined tasks from this idea. Prefer smaller, narrowly scoped tasks that each deliver a thin but complete vertical slice of working software -- a path through the system that can be tested end-to-end -- rather than component-oriented tasks (like "add schema" or "build endpoint") that only work once all tasks are done. Split the idea into multiple tasks if it covers more than one logical change. Run `dust principles` to link relevant principles and `dust facts` for design decisions that should inform the task. See [Inline Core Principles in Decomposed Tasks](../ideas/inline-core-principles-in-decomposed-tasks.md).

The instructions should actually inline ALL principles under a new guidance section, not just core principles

## Resolved Questions

### Where should inlined principles appear in the task file?

**Decision:** Separate "Guidance" section


## Decomposes Idea

- [Inline Core Principles in Decomposed Tasks](../ideas/inline-core-principles-in-decomposed-tasks.md)


## Task Type

decompose

## Blocked By

(none)

## Repository Hints

Really think about "Functional Core, Imperative Shell"


## Definition of Done

- One or more new tasks are created in .dust/tasks/
- Task's Principles section links to relevant principles from .dust/principles/
- The original idea (.dust/ideas/inline-core-principles-in-decomposed-tasks.md) is deleted or updated to reflect remaining scope
