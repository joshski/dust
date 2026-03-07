# Decompose Idea: Progressive Output for dust check

Create one or more well-defined tasks from this idea. Prefer smaller, narrowly scoped tasks that each deliver a thin but complete vertical slice of working software -- a path through the system that can be tested end-to-end -- rather than component-oriented tasks (like "add schema" or "build endpoint") that only work once all tasks are done. Split the idea into multiple tasks if it covers more than one logical change. Run `dust principles` to link relevant principles and `dust facts` for design decisions that should inform the task. See [Progressive Output for dust check](../ideas/progressive-output-for-dust-check.md).

Really think about "Functional Core, Imperative Shell"

Remove the dots altogether

## Resolved Questions

### How should built-in `dust lint` participate in display ordering?

**Decision:** Option: Keep `dust lint` first (current behavior)

### Should progress dots be removed entirely?

**Decision:** Option: Remove dots once progressive status output exists

### When a check fails, should full failure output be printed immediately or deferred?

**Decision:** Option: Print failure details immediately with that check


## Decomposes Idea

- [Progressive Output for dust check](../ideas/progressive-output-for-dust-check.md)

## Blocked By

(none)

## Definition of Done

- [ ] One or more new tasks are created in .dust/tasks/
- [ ] Task's Principles section links to relevant principles from .dust/principles/
- [ ] The original idea is deleted or updated to reflect remaining scope
