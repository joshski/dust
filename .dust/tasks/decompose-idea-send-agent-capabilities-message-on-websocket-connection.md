# Decompose Idea: Send Agent Capabilities Message on WebSocket Connection

Create one or more well-defined tasks from this idea. Prefer smaller, narrowly scoped tasks that each deliver a thin but complete vertical slice of working software -- a path through the system that can be tested end-to-end -- rather than component-oriented tasks (like "add schema" or "build endpoint") that only work once all tasks are done. Split the idea into multiple tasks if it covers more than one logical change. Run `dust principles` to link relevant principles and `dust facts` for design decisions that should inform the task. See [Send Agent Capabilities Message on WebSocket Connection](../ideas/send-agent-capabilities-message-on-websocket-connection.md).

Really think about "Functional Core, Imperative Shell"

## Resolved Questions

### When should capabilities be sent?

**Decision:** On initial connection

### What should the capabilities message contain?

**Decision:** With models

### How should agent availability be detected?

**Decision:** Probe with a minimal command

### How should model discovery work for Claude Code?

**Decision:** Use hardcoded aliases

### Should the server acknowledge capabilities?

**Decision:** Fire-and-forget


## Decomposes Idea

- [Send Agent Capabilities Message on WebSocket Connection](../ideas/send-agent-capabilities-message-on-websocket-connection.md)

## Blocked By

(none)

## Definition of Done

- [ ] One or more new tasks are created in .dust/tasks/
- [ ] Task's Principles section links to relevant principles from .dust/principles/
- [ ] The original idea is deleted or updated to reflect remaining scope
