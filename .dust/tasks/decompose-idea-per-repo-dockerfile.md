# Decompose Idea: Per-repo Dockerfile

Create one or more well-defined tasks from this idea. Prefer smaller, narrowly scoped tasks that each deliver a thin but complete vertical slice of working software -- a path through the system that can be tested end-to-end -- rather than component-oriented tasks (like "add schema" or "build endpoint") that only work once all tasks are done. Split the idea into multiple tasks if it covers more than one logical change. Run `dust principles` to link relevant principles and `dust facts` for design decisions that should inform the task. See [Per-repo Dockerfile](../ideas/per-repo-dockerfile.md).

The Dockerfile is expected to exist at .dust/config/Dockerfile — if no such file exists, dust behaves as it does right now with no changes

## Resolved Questions

### How should agent credentials be provided to the container?

**Decision:** Mount host credential directories

### Where should the Dockerfile live?

**Decision:** .dust/Dockerfile

### Should there be a fallback base image?

**Decision:** No, require explicit Dockerfile


## Decomposes Idea

- [Per-repo Dockerfile](../ideas/per-repo-dockerfile.md)

## Blocked By

(none)

## Definition of Done

- [ ] One or more new tasks are created in .dust/tasks/
- [ ] Task's Principles section links to relevant principles from .dust/principles/
- [ ] The original idea is deleted or updated to reflect remaining scope
