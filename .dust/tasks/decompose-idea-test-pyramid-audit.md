# Decompose Idea: Test Pyramid Audit

Create one or more well-defined tasks from this idea. Prefer smaller, narrowly scoped tasks that each deliver a thin but complete vertical slice of working software -- a path through the system that can be tested end-to-end -- rather than component-oriented tasks (like "add schema" or "build endpoint") that only work once all tasks are done. Split the idea into multiple tasks if it covers more than one logical change. Run `dust principles` to link relevant principles and `dust facts` for design decisions that should inform the task. See [Test Pyramid Audit](../ideas/test-pyramid-audit.md).

Run the tests to figure out the time each group is taking.

## Resolved Questions

### How should tests be classified into pyramid tiers?

**Decision:** Determine how tests are categorised by looking at examples. Some projects co-locate different types of tests, others use different tools for different types, etc

### What constitutes a "healthy" pyramid shape?

**Decision:** Relative guidance

### Should the audit account for test execution time distribution?

**Decision:** Include time analysis


## Decomposes Idea

- [Test Pyramid Audit](../ideas/test-pyramid-audit.md)

## Blocked By

(none)

## Repository Hints

Really think about "Functional Core, Imperative Shell"


## Definition of Done

- [ ] One or more new tasks are created in .dust/tasks/
- [ ] Task's Principles section links to relevant principles from .dust/principles/
- [ ] The original idea is deleted or updated to reflect remaining scope
