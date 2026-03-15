# Decompose Idea: Show relative paths in validation errors

Create one or more well-defined tasks from this idea. Prefer smaller, narrowly scoped tasks that each deliver a thin but complete vertical slice of working software -- a path through the system that can be tested end-to-end -- rather than component-oriented tasks (like "add schema" or "build endpoint") that only work once all tasks are done. Split the idea into multiple tasks if it covers more than one logical change. Run `dust principles` to link relevant principles and `dust facts` for design decisions that should inform the task. See [Show relative paths in validation errors](../ideas/show-relative-paths-in-validation-errors.md).

## Resolved Questions

### Should this change apply only to CLI rendering, or also to the `validatePatch` API result?

**Decision:** CLI and API

### Relative to which base should paths be displayed?

**Decision:** `context.cwd` (or current process cwd)

### How should we handle paths that cannot be cleanly relativized to cwd?

**Decision:** Fall back to absolute path


## Decomposes Idea

- [Show relative paths in validation errors](../ideas/show-relative-paths-in-validation-errors.md)

## Blocked By

(none)

## Repository Hints

Really think about "Functional Core, Imperative Shell"


## Definition of Done

- [ ] One or more new tasks are created in .dust/tasks/
- [ ] Task's Principles section links to relevant principles from .dust/principles/
- [ ] The original idea is deleted or updated to reflect remaining scope
