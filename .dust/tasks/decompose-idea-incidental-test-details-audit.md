# Decompose Idea: Incidental Test Details Audit

Create one or more well-defined tasks from this idea. Prefer smaller, narrowly scoped tasks that each deliver a thin but complete vertical slice of working software -- a path through the system that can be tested end-to-end -- rather than component-oriented tasks (like "add schema" or "build endpoint") that only work once all tasks are done. Split the idea into multiple tasks if it covers more than one logical change. Run `dust principles` to identify relevant principles (both core and local), then inline the FULL content of ALL selected principles in a Guidance section in each new task file (after Principles but before Definition of Done). This ensures implementing agents read the guidance without extra tool calls. Also run `dust facts` for design decisions that should inform the task. See [Incidental Test Details Audit](../ideas/incidental-test-details-audit.md).

## Resolved Questions

### Should this audit focus on specific types of incidental details first?

**Decision:** Option: Start with overly specific test data

### How should the audit distinguish incidental from necessary details?

**Decision:** Option: Flag all candidates, let reviewers decide

### Should this audit generate per-test ideas or batched refactorings?

**Decision:** Option: One idea per test file

### Should this audit consider test performance?

**Decision:** Option: Focus purely on clarity


## Decomposes Idea

- [Incidental Test Details Audit](../ideas/incidental-test-details-audit.md)


## Task Type

decompose

## Blocked By

(none)

## Repository Hints

Really think about "Functional Core, Imperative Shell"


## Definition of Done

- One or more new tasks are created in .dust/tasks/
- Task's Principles section links to relevant principles from .dust/principles/
- The original idea (.dust/ideas/incidental-test-details-audit.md) is deleted or updated to reflect remaining scope
