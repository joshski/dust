# Decompose Idea: Agent-Driven Installation Instructions

Create one or more well-defined tasks from this idea. Prefer smaller, narrowly scoped tasks that each deliver a thin but complete vertical slice of working software -- a path through the system that can be tested end-to-end -- rather than component-oriented tasks (like "add schema" or "build endpoint") that only work once all tasks are done. Split the idea into multiple tasks if it covers more than one logical change. Run `dust principles` to link relevant principles and `dust facts` for design decisions that should inform the task. See [Agent-Driven Installation Instructions](../ideas/agent-driven-installation-instructions.md).

## Resolved Questions

### Should we provide both human and agent installation methods?

**Decision:** Agent-only (recommended)

### What URL should agents use?

**Decision:** GitHub repository URL

### How should we phrase the instruction?

**Decision:** Direct command: "install dust"

### Should installation instructions mention specific agents?

**Decision:** Agent-agnostic (recommended)

### What should happen after installation?

**Decision:** Let the agent continue


## Decomposes Idea

- [Agent-Driven Installation Instructions](../ideas/agent-driven-installation-instructions.md)


## Task Type

decompose

## Blocked By

(none)

## Repository Hints

Really think about "Functional Core, Imperative Shell"


## Definition of Done

- One or more new tasks are created in .dust/tasks/
- Task's Principles section links to relevant principles from .dust/principles/
- The original idea is deleted or updated to reflect remaining scope
