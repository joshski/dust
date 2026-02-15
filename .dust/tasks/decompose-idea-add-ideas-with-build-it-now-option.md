# Decompose Idea: Add ideas with "Build it now" option

Create one or more well-defined tasks from this idea. Prefer smaller, narrowly scoped tasks -- split the idea into multiple tasks if it covers more than one logical change. Review `.dust/goals/` to link relevant goals and `.dust/facts/` for design decisions that should inform the task. See [Add ideas with "Build it now" option](../ideas/add-ideas-with-build-it-now-option.md).

By using a different title prefix, we can distinguish tasks that were created with "Build it now"

## Resolved Questions

### Should "Build it now" tasks still use the `Add Idea:` prefix?

**Decision:** Use a new prefix like `Build Idea:`

### How should the `buildItNow` option be passed to the function?

**Decision:** Refactor to a single options object

### What happens to `parseCaptureIdeaTask` for "Build it now" tasks?

**Decision:** Parse the `buildItNow` flag from the task content


## Goals

(none)

## Blocked By

(none)

## Definition of Done

- [ ] One or more new tasks are created in .dust/tasks/
- [ ] Task's Goals section links to relevant goals from .dust/goals/
- [ ] The original idea is deleted or updated to reflect remaining scope
