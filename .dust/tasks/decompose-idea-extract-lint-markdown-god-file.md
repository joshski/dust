# Decompose Idea: Extract lint-markdown god file

Create one or more well-defined tasks from this idea. Prefer smaller, narrowly scoped tasks that each deliver a thin but complete vertical slice of working software -- a path through the system that can be tested end-to-end -- rather than component-oriented tasks (like "add schema" or "build endpoint") that only work once all tasks are done. Split the idea into multiple tasks if it covers more than one logical change. Review `.dust/goals/` to link relevant goals and `.dust/facts/` for design decisions that should inform the task. See [Extract lint-markdown god file](../ideas/extract-lint-markdown-god-file.md).

## Resolved Questions

### Should backwards-compatible re-exports be maintained?

**Decision:** Remove re-exports immediately

### What directory structure should validators use?

**Decision:** Use `lib/lint/validators/`

### Should this be one task or multiple tasks?

**Decision:** Single atomic task


## Goals

(none)

## Blocked By

(none)

## Definition of Done

- [ ] One or more new tasks are created in .dust/tasks/
- [ ] Task's Goals section links to relevant goals from .dust/goals/
- [ ] The original idea is deleted or updated to reflect remaining scope
