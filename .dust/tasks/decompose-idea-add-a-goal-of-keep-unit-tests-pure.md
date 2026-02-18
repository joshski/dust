# Decompose Idea: Add a goal of "Keep unit tests pure"

Create one or more well-defined tasks from this idea. Prefer smaller, narrowly scoped tasks that each deliver a thin but complete vertical slice of working software -- a path through the system that can be tested end-to-end -- rather than component-oriented tasks (like "add schema" or "build endpoint") that only work once all tasks are done. Split the idea into multiple tasks if it covers more than one logical change. Review `.dust/goals/` to link relevant goals and `.dust/facts/` for design decisions that should inform the task. See [Add a goal of "Keep unit tests pure"](../ideas/add-a-goal-of-keep-unit-tests-pure.md).

## Resolved Questions

### Where does this goal sit in the hierarchy?

**Decision:** As a sibling of Test Isolation under Make Changes with Confidence

### Should "Environment-Independent Tests" become a sub-goal of this new goal?

**Decision:** No, keep them as siblings

### What counts as a "unit test" for this goal?

**Decision:** Convention only, no enforcement

### How does this goal interact with system tests?

**Decision:** Define the distinction inline in the goal file

### Should the goal describe what to do with tests that are currently impure?

**Decision:** Include migration guidance


## Goals

(none)

## Blocked By

(none)

## Definition of Done

- [ ] One or more new tasks are created in .dust/tasks/
- [ ] Task's Goals section links to relevant goals from .dust/goals/
- [ ] The original idea is deleted or updated to reflect remaining scope
