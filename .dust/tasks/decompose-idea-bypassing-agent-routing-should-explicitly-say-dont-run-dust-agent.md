# Decompose Idea: Bypassing agent routing should explicitly say "Don't run dust agent"

Create one or more well-defined tasks from this idea. Prefer smaller, narrowly scoped tasks that each deliver a thin but complete vertical slice of working software -- a path through the system that can be tested end-to-end -- rather than component-oriented tasks (like "add schema" or "build endpoint") that only work once all tasks are done. Split the idea into multiple tasks if it covers more than one logical change. Review `.dust/goals/` to link relevant goals and `.dust/facts/` for design decisions that should inform the task. See [Bypassing agent routing should explicitly say "Don't run dust agent"](../ideas/bypassing-agent-routing-should-explicitly-say-dont-run-dust-agent.md).

## Resolved Questions

### Where should the message be added?

**Decision:** Add to `buildImplementationInstructions()`

### Should git conflict resolution prompts also include this guidance?

**Decision:** Yes, include in all automated prompts

### What wording should be used?

**Decision:** "Note: Skip the `dust agent` step - your task has already been specified below"

### Should an environment variable signal this state?

**Decision:** Set `DUST_SKIP_AGENT=1` or similar


## Goals

(none)

## Blocked By

(none)

## Definition of Done

- [ ] One or more new tasks are created in .dust/tasks/
- [ ] Task's Goals section links to relevant goals from .dust/goals/
- [ ] The original idea is deleted or updated to reflect remaining scope
