# Create Task From Idea: Switch to run checks serially

Create a well-defined task from this idea. Review `.dust/goals/` to link relevant goals and `.dust/facts/` for design decisions that should inform the task. See [Switch to run checks serially](../ideas/switch-to-run-checks-serially.md).

## Resolved Questions

### Should serial execution be configurable globally in settings.json?

**Decision:** No, keep it as a CLI flag only

### Should checks support explicit dependencies instead of or in addition to serial mode?

**Decision:** Serial mode is sufficient for now

### How should the flag interact with the built-in lint markdown check?

**Decision:** Run lint markdown first, then configured checks serially


## Goals

(none)

## Blocked By

(none)

## Definition of Done

- [ ] A new task is created in .dust/tasks/
- [ ] Task's Goals section links to relevant goals from .dust/goals/
- [ ] The original idea is deleted or updated to reflect remaining scope
