# Decompose Idea: Expose repository principle hierarchy API

Create one or more well-defined tasks from this idea. Prefer smaller, narrowly scoped tasks that each deliver a thin but complete vertical slice of working software -- a path through the system that can be tested end-to-end -- rather than component-oriented tasks (like "add schema" or "build endpoint") that only work once all tasks are done. Split the idea into multiple tasks if it covers more than one logical change. Run `dust principles` to identify relevant principles (both core and local), then inline the FULL content of ALL selected principles in a Guidance section in each new task file (after Principles but before Definition of Done). This ensures implementing agents read the guidance without extra tool calls. Also run `dust facts` for design decisions that should inform the task. See [Expose repository principle hierarchy API](../ideas/expose-repository-principle-hierarchy-api.md).

## Resolved Questions

### Should the API return combined or separate hierarchies?

**Decision:** Option: Separate hierarchies in structured response

### Should this support filtering like `getCorePrincipleHierarchy()` does?

**Decision:** Option: No filtering, keep API minimal

### Should the node structure include full principle content?

**Decision:** Option: Minimal node (slug + title only)

### Where should this be exported from?

**Decision:** Option: Export from `@joshski/dust/artifacts` alongside repository functions

### Should this replace or wrap the CLI's `buildPrincipleHierarchy()`?

**Decision:** Option: Replace CLI implementation with new public API

### Should we handle repositories with no `.dust/principles/` directory?

**Decision:** Option: Return empty array for missing directory

### Should sorting be configurable?

**Decision:** Option: Always sort alphabetically (current behavior)


## Decomposes Idea

- [Expose repository principle hierarchy API](../ideas/expose-repository-principle-hierarchy-api.md)


## Task Type

decompose

## Blocked By

(none)

## Repository Hints

Really think about "Functional Core, Imperative Shell"


## Definition of Done

- One or more new tasks are created in .dust/tasks/
- Task's Principles section links to relevant principles from .dust/principles/
- The original idea (.dust/ideas/expose-repository-principle-hierarchy-api.md) is deleted or updated to reflect remaining scope
