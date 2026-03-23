# Decompose Idea: Apple Container runtime support

Create one or more well-defined tasks from this idea. Prefer smaller, narrowly scoped tasks that each deliver a thin but complete vertical slice of working software -- a path through the system that can be tested end-to-end -- rather than component-oriented tasks (like "add schema" or "build endpoint") that only work once all tasks are done. Split the idea into multiple tasks if it covers more than one logical change. Run `dust principles` to link relevant principles and `dust facts` for design decisions that should inform the task. See [Apple Container runtime support](../ideas/apple-container-runtime-support.md).

## Resolved Questions

### Should this be a separate flag or unified under `--container`?

**Decision:** Separate flags (`--docker` / `--apple-container`)

### Should Apple container be preferred over Docker when both are available on macOS 26+?

**Decision:** For now, a user can only supply `--docker` or `--apple-container` -- not both. It should be an error to set both.

### How does this relate to the third-party sandbox provider idea?

**Decision:** Treat as another provider


## Decomposes Idea

- [Apple Container runtime support](../ideas/apple-container-runtime-support.md)

## Blocked By

(none)

## Repository Hints

Really think about "Functional Core, Imperative Shell"


## Definition of Done

- One or more new tasks are created in .dust/tasks/
- Task's Principles section links to relevant principles from .dust/principles/
- The original idea is deleted or updated to reflect remaining scope
