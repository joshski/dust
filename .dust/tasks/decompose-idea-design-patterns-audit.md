# Decompose Idea: Design Patterns Audit

Create one or more well-defined tasks from this idea. Prefer smaller, narrowly scoped tasks that each deliver a thin but complete vertical slice of working software -- a path through the system that can be tested end-to-end -- rather than component-oriented tasks (like "add schema" or "build endpoint") that only work once all tasks are done. Split the idea into multiple tasks if it covers more than one logical change. Run `dust principles` to link relevant principles and `dust facts` for design decisions that should inform the task. See [Design Patterns Audit](../ideas/design-patterns-audit.md).

## Resolved Questions

### How should pattern applicability be determined?

**Decision:** Option: Code smell triggers

### Should the audit recommend Gang of Four patterns only, or include modern alternatives?

**Decision:** The audit should be somewhat tech stack agnostic, but should mention the Gang of Four patterns (which may or may not apply depending on how object-oriented the codebase is)

### What minimum benefit threshold should trigger a recommendation?

**Decision:** Option: Low threshold, user filters


## Decomposes Idea

- [Design Patterns Audit](../ideas/design-patterns-audit.md)

## Blocked By

(none)

## Repository Hints

Really think about "Functional Core, Imperative Shell"


## Definition of Done

- [ ] One or more new tasks are created in .dust/tasks/
- [ ] Task's Principles section links to relevant principles from .dust/principles/
- [ ] The original idea is deleted or updated to reflect remaining scope
