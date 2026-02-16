# Decompose Idea: Validate .dust directory

Create one or more well-defined tasks from this idea. Prefer smaller, narrowly scoped tasks that each deliver a thin but complete vertical slice of working software -- a path through the system that can be tested end-to-end -- rather than component-oriented tasks (like "add schema" or "build endpoint") that only work once all tasks are done. Split the idea into multiple tasks if it covers more than one logical change. Review `.dust/goals/` to link relevant goals and `.dust/facts/` for design decisions that should inform the task. See [Validate .dust directory](../ideas/validate-dust-directory.md).

Remove `lint markdown` altogether - a single `lint` command will do both the markdown and all other validation, and report a single set of ALL errors (not just the first errors it finds)

## Resolved Questions

### How strict should config validation be?

**Decision:** Strict - reject unknown keys

### What about non-standard directories that users intentionally add?

**Decision:** Reject by default, allow opt-in


## Goals

(none)

## Blocked By

(none)

## Definition of Done

- [ ] One or more new tasks are created in .dust/tasks/
- [ ] Task's Goals section links to relevant goals from .dust/goals/
- [ ] The original idea is deleted or updated to reflect remaining scope
