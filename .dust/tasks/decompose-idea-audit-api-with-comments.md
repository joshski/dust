# Decompose Idea: Audit API with Comments

Create one or more well-defined tasks from this idea. Prefer smaller, narrowly scoped tasks that each deliver a thin but complete vertical slice of working software -- a path through the system that can be tested end-to-end -- rather than component-oriented tasks (like "add schema" or "build endpoint") that only work once all tasks are done. Split the idea into multiple tasks if it covers more than one logical change. Run `dust principles` to link relevant principles and `dust facts` for design decisions that should inform the task. See [Audit API with Comments](../ideas/audit-api-with-comments.md).

## Resolved Questions

### Should "comment" use the existing Ad-hoc Scope section or a separate Comments section?

**Decision:** Create a separate Comments section

### Should the CLI add a `--comment` flag or continue using positional arguments only?

**Decision:** Only allow —comments arguments - remove the “ad hoc” section and positional arguments


## Decomposes Idea

- [Audit API with Comments](../ideas/audit-api-with-comments.md)

## Blocked By

(none)

## Repository Hints

Really think about "Functional Core, Imperative Shell"


## Definition of Done

- [ ] One or more new tasks are created in .dust/tasks/
- [ ] Task's Principles section links to relevant principles from .dust/principles/
- [ ] The original idea is deleted or updated to reflect remaining scope
