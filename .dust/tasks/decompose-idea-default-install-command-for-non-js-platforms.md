# Decompose Idea: Default install command for non-JS platforms

Create one or more well-defined tasks from this idea. Prefer smaller, narrowly scoped tasks that each deliver a thin but complete vertical slice of working software -- a path through the system that can be tested end-to-end -- rather than component-oriented tasks (like "add schema" or "build endpoint") that only work once all tasks are done. Split the idea into multiple tasks if it covers more than one logical change. Run `dust principles` to link relevant principles and `dust facts` for design decisions that should inform the task. See [Default install command for non-JS platforms](../ideas/default-install-command-for-non-js-platforms.md).

## Resolved Questions

### What should happen when no recognized lockfile is found?

**Decision:** Detect platform from other manifest files

### Should detection prioritize multiple ecosystems?

**Decision:** Require explicit configuration for multi-language repos

### How should multi-stage install workflows be handled?

**Decision:** Only detect single-ecosystem projects


## Decomposes Idea

- [Default install command for non-JS platforms](../ideas/default-install-command-for-non-js-platforms.md)

## Blocked By

(none)

## Definition of Done

- [ ] One or more new tasks are created in .dust/tasks/
- [ ] Task's Principles section links to relevant principles from .dust/principles/
- [ ] The original idea is deleted or updated to reflect remaining scope
