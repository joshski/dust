# Decompose Idea: Export "agent detection" logic

Create one or more well-defined tasks from this idea. Prefer smaller, narrowly scoped tasks that each deliver a thin but complete vertical slice of working software -- a path through the system that can be tested end-to-end -- rather than component-oriented tasks (like "add schema" or "build endpoint") that only work once all tasks are done. Split the idea into multiple tasks if it covers more than one logical change. Review `.dust/goals/` to link relevant goals and `.dust/facts/` for design decisions that should inform the task. See [Export "agent detection" logic](../ideas/export-agent-detection-logic.md).

## Resolved Questions

### Should the export path be `./agents` or something more specific like `./agents/detection`?

**Decision:** `./agents`

### Should `name` be part of the public `Agent` type?

**Decision:** Keep `name` in the type

### Should the `unknown` agent type be exported, or should `detectAgent` return `null` when no agent is detected?

**Decision:** Keep `{ type: 'unknown', name: 'Agent' }` as the fallback

### Should this be a separate package or a subpath export from `@joshski/dust`?

**Decision:** Subpath export from `@joshski/dust`


## Goals

(none)

## Blocked By

(none)

## Definition of Done

- [ ] One or more new tasks are created in .dust/tasks/
- [ ] Task's Goals section links to relevant goals from .dust/goals/
- [ ] The original idea is deleted or updated to reflect remaining scope
