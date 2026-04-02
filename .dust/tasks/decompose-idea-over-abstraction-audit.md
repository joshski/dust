# Decompose Idea: Over-Abstraction Audit

Create one or more well-defined tasks from this idea. Prefer smaller, narrowly scoped tasks that each deliver a thin but complete vertical slice of working software -- a path through the system that can be tested end-to-end -- rather than component-oriented tasks (like "add schema" or "build endpoint") that only work once all tasks are done. Split the idea into multiple tasks if it covers more than one logical change. Run `dust principles` to identify relevant principles (both core and local), then inline the FULL content of ALL selected principles in a Guidance section in each new task file (after Principles but before Definition of Done). This ensures implementing agents read the guidance without extra tool calls. Also run `dust facts` for design decisions that should inform the task. See [Over-Abstraction Audit](../ideas/over-abstraction-audit.md).

## Resolved Questions

### How should the audit determine if an abstraction is valuable?

**Decision:** Option: Complexity vs benefit analysis

### Should the audit flag all single-use abstractions?

**Decision:** Option: Flag all single-use cases

### How should the audit handle test-focused abstractions?

**Decision:** Option: Apply same standards

### Should the audit suggest automatic refactoring?

**Decision:** Option: Provide inline suggestions

### How should the audit handle framework/library patterns?

**Decision:** Option: Respect framework conventions

### What depth of inheritance should be considered excessive?

**Decision:** Option: Context-dependent


## Decomposes Idea

- [Over-Abstraction Audit](../ideas/over-abstraction-audit.md)


## Task Type

decompose

## Blocked By

(none)

## Repository Hints

Really think about "Functional Core, Imperative Shell"


## Definition of Done

- One or more new tasks are created in .dust/tasks/
- Task's Principles section links to relevant principles from .dust/principles/
- The original idea (.dust/ideas/over-abstraction-audit.md) is deleted or updated to reflect remaining scope
