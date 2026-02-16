# Decompose Idea: Include more details in agent-session-started

Create one or more well-defined tasks from this idea. Prefer smaller, narrowly scoped tasks that each deliver a thin but complete vertical slice of working software -- a path through the system that can be tested end-to-end -- rather than component-oriented tasks (like "add schema" or "build endpoint") that only work once all tasks are done. Split the idea into multiple tasks if it covers more than one logical change. Review `.dust/goals/` to link relevant goals and `.dust/facts/` for design decisions that should inform the task. See [Include more details in agent-session-started](../ideas/include-more-details-in-agent-session-started.md).

## Resolved Questions

### Should all fields be required or optional?

**Decision:** All fields required

### Should cwd expose full paths or relative paths?

**Decision:** Full absolute paths

### Should OS details be a single field or multiple?

**Decision:** Single combined field

### Should additional context be captured?

**Decision:** Just the proposed fields


## Goals

(none)

## Blocked By

(none)

## Definition of Done

- [ ] One or more new tasks are created in .dust/tasks/
- [ ] Task's Goals section links to relevant goals from .dust/goals/
- [ ] The original idea is deleted or updated to reflect remaining scope
