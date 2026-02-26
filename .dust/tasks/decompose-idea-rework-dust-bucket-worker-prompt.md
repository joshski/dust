# Decompose Idea: Rework dust bucket worker prompt

Create one or more well-defined tasks from this idea. Prefer smaller, narrowly scoped tasks that each deliver a thin but complete vertical slice of working software -- a path through the system that can be tested end-to-end -- rather than component-oriented tasks (like "add schema" or "build endpoint") that only work once all tasks are done. Split the idea into multiple tasks if it covers more than one logical change. Run `dust principles` to link relevant principles and `dust facts` for design decisions that should inform the task. See [Rework dust bucket worker prompt](../ideas/rework-dust-bucket-worker-prompt.md).

## Resolved Questions

### Should the idea file deletion instruction be removed from buildImplementationInstructions?

**Decision:** Option: Remove from buildImplementationInstructions

### Should the check step before committing be kept?

**Decision:** Option: Keep conditional check step

### Should the idea file deletion be mentioned in the commit description?

**Decision:** Option: Include for non-expedite tasks


## Decomposes Idea

- [Rework dust bucket worker prompt](../ideas/rework-dust-bucket-worker-prompt.md)

## Blocked By

(none)

## Definition of Done

- [ ] One or more new tasks are created in .dust/tasks/
- [ ] Task's Principles section links to relevant principles from .dust/principles/
- [ ] The original idea is deleted or updated to reflect remaining scope
