# Decompose Idea: Flaky Tests Audit

Create one or more well-defined tasks from this idea. Prefer smaller, narrowly scoped tasks that each deliver a thin but complete vertical slice of working software -- a path through the system that can be tested end-to-end -- rather than component-oriented tasks (like "add schema" or "build endpoint") that only work once all tasks are done. Split the idea into multiple tasks if it covers more than one logical change. Run `dust principles` to link relevant principles and `dust facts` for design decisions that should inform the task. See [Flaky Tests Audit](../ideas/flaky-tests-audit.md).

## Resolved Questions

### Should this audit run on system tests?

**Decision:** Don’t mention any specific paths. System or end to end (e2e) tests should be mentioned in general but no specific assumptions

### Should the audit suggest specific `waitFor()` patterns?

**Decision:** Mention waits in general but not this detail

### Should this become a lint rule?

**Decision:** Option: Audit-only

### How should findings be grouped in output ideas?

**Decision:** Option: One idea per test file

### Should the audit detect framework-specific anti-patterns?

**Decision:** Option: Framework-agnostic only

### How should the audit handle legitimate timing dependencies?

**Decision:** Option: Severity levels

### Should findings include test execution metrics?

**Decision:** Option: Metrics-enhanced findings

### How should the audit adapt to codebase-specific testing utilities?

**Decision:** Option: Detect and use existing utilities


## Decomposes Idea

- [Flaky Tests Audit](../ideas/flaky-tests-audit.md)


## Task Type

decompose

## Blocked By

(none)

## Repository Hints

Really think about "Functional Core, Imperative Shell"


## Definition of Done

- One or more new tasks are created in .dust/tasks/
- Task's Principles section links to relevant principles from .dust/principles/
- The original idea is deleted or updated to reflect remaining scope
