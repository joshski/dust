# Decompose Idea: Remove v8 Ignore: Claude API Proxy Server

Create one or more well-defined tasks from this idea. Prefer smaller, narrowly scoped tasks that each deliver a thin but complete vertical slice of working software -- a path through the system that can be tested end-to-end -- rather than component-oriented tasks (like "add schema" or "build endpoint") that only work once all tasks are done. Split the idea into multiple tasks if it covers more than one logical change. Run `dust principles` to link relevant principles and `dust facts` for design decisions that should inform the task. See [Remove v8 Ignore: Claude API Proxy Server](../ideas/remove-v8-ignore-claude-api-proxy-server.md).

## Resolved Questions

### How much server boilerplate should remain untested?

**Decision:** Option: Only the server.listen() call


## Decomposes Idea

- [Remove v8 Ignore: Claude API Proxy Server](../ideas/remove-v8-ignore-claude-api-proxy-server.md)

## Blocked By

(none)

## Repository Hints

Really think about "Functional Core, Imperative Shell"


## Definition of Done

- [ ] One or more new tasks are created in .dust/tasks/
- [ ] Task's Principles section links to relevant principles from .dust/principles/
- [ ] The original idea is deleted or updated to reflect remaining scope
