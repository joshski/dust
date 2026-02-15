# Decompose Idea: Terminal UI status indicator

Create one or more well-defined tasks from this idea. Prefer smaller, narrowly scoped tasks -- split the idea into multiple tasks if it covers more than one logical change. Review `.dust/goals/` to link relevant goals and `.dust/facts/` for design decisions that should inform the task. See [Terminal UI status indicator](../ideas/terminal-ui-status-indicator.md).

## Resolved Questions

### Where should the status dot appear within the tab?

**Decision:** Before the repository name

### How should agent status reach the terminal UI renderer?

**Decision:** Add a status map to TerminalUIState

### What should the "All" tab show?

**Decision:** No dot on the "All" tab

### Should there be more than two states?

**Decision:** Two states: idle and busy

### Should the dot pulse or animate to show liveness?

**Decision:** Static dot


## Goals

(none)

## Blocked By

(none)

## Definition of Done

- [ ] One or more new tasks are created in .dust/tasks/
- [ ] Task's Goals section links to relevant goals from .dust/goals/
- [ ] The original idea is deleted or updated to reflect remaining scope
