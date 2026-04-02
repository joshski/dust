# Decompose Idea: Test Determinism Audit

Create one or more well-defined tasks from this idea. Prefer smaller, narrowly scoped tasks that each deliver a thin but complete vertical slice of working software -- a path through the system that can be tested end-to-end -- rather than component-oriented tasks (like "add schema" or "build endpoint") that only work once all tasks are done. Split the idea into multiple tasks if it covers more than one logical change. Run `dust principles` to identify relevant principles (both core and local), then inline the FULL content of ALL selected principles in a Guidance section in each new task file (after Principles but before Definition of Done). This ensures implementing agents read the guidance without extra tool calls. Also run `dust facts` for design decisions that should inform the task. See [Test Determinism Audit](../ideas/test-determinism-audit.md).

## Resolved Questions

### Should this audit target all tests or just unit tests?

**Decision:** Option: Unit tests only

### Should time-based testing patterns be detected statically or dynamically?

**Decision:** The audit should review all cases (since linting alone is insufficient)

### Should this audit create ideas for lint rules?

**Decision:** Option: Keep audit as manual review

### How should dependency injection patterns be evaluated?

**Decision:** Option: Recognize common injection patterns


## Decomposes Idea

- [Test Determinism Audit](../ideas/test-determinism-audit.md)


## Task Type

decompose

## Blocked By

(none)

## Repository Hints

Really think about "Functional Core, Imperative Shell"


## Definition of Done

- One or more new tasks are created in .dust/tasks/
- Task's Principles section links to relevant principles from .dust/principles/
- The original idea (.dust/ideas/test-determinism-audit.md) is deleted or updated to reflect remaining scope
