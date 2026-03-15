# Decompose Idea: Checks Audit

Create one or more well-defined tasks from this idea. Prefer smaller, narrowly scoped tasks that each deliver a thin but complete vertical slice of working software -- a path through the system that can be tested end-to-end -- rather than component-oriented tasks (like "add schema" or "build endpoint") that only work once all tasks are done. Split the idea into multiple tasks if it covers more than one logical change. Run `dust principles` to link relevant principles and `dust facts` for design decisions that should inform the task. See [Checks Audit](../ideas/checks-audit.md).

## Resolved Questions

### How should the audit detect which tools are available?

**Decision:** Check for config files

### Should the audit also detect CI configuration?

**Decision:** Include CI detection

### How should coverage requirements be handled?

**Decision:** Suggest coverage check with configurable threshold

### What happens when multiple ecosystems are detected?

**Decision:** Create separate ideas per ecosystem


## Decomposes Idea

- [Checks Audit](../ideas/checks-audit.md)

## Blocked By

(none)

## Repository Hints

Really think about "Functional Core, Imperative Shell"


## Definition of Done

- [ ] One or more new tasks are created in .dust/tasks/
- [ ] Task's Principles section links to relevant principles from .dust/principles/
- [ ] The original idea is deleted or updated to reflect remaining scope
