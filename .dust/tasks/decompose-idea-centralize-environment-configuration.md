# Decompose Idea: Centralize environment configuration

Create one or more well-defined tasks from this idea. Prefer smaller, narrowly scoped tasks that each deliver a thin but complete vertical slice of working software -- a path through the system that can be tested end-to-end -- rather than component-oriented tasks (like "add schema" or "build endpoint") that only work once all tasks are done. Split the idea into multiple tasks if it covers more than one logical change. Run `dust principles` to link relevant principles and `dust facts` for design decisions that should inform the task. See [Centralize environment configuration](../ideas/centralize-environment-configuration.md).

Split the type up into sub-types if it makes sense, but still create a single configuration object instance at startup, so we can fail early if anything is amiss

## Resolved Questions

### How should environment configuration be centralized?

**Decision:** Create an EnvConfig type and read once at startup


## Decomposes Idea

- [Centralize environment configuration](../ideas/centralize-environment-configuration.md)

## Blocked By

(none)

## Repository Hints

Really think about "Functional Core, Imperative Shell"


## Definition of Done

- [ ] One or more new tasks are created in .dust/tasks/
- [ ] Task's Principles section links to relevant principles from .dust/principles/
- [ ] The original idea is deleted or updated to reflect remaining scope
