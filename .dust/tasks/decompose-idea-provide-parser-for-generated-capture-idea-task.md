# Decompose Idea: Provide parser for generated "capture idea task"

Create one or more well-defined tasks from this idea. Prefer smaller, narrowly scoped tasks -- split the idea into multiple tasks if it covers more than one logical change. Review `.dust/goals/` to link relevant goals and `.dust/facts/` for design decisions that should inform the task. See [Provide parser for generated "capture idea task"](../ideas/provide-parser-for-generated-capture-idea-task.md).

## Resolved Questions

### Should the parser return raw content or parsed content?

**Decision:** Return raw markdown content

### Should findAllCaptureIdeaTasks be extended instead of adding a new function?

**Decision:** Keep functions separate

### How should existing capture idea tasks be handled?

**Decision:** Ignore old format tasks


## Goals

(none)

## Blocked By

(none)

## Definition of Done

- [ ] One or more new tasks are created in .dust/tasks/
- [ ] Task's Goals section links to relevant goals from .dust/goals/
- [ ] The original idea is deleted or updated to reflect remaining scope
