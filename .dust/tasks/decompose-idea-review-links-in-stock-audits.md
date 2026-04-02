# Decompose Idea: Review links in stock audits

Create one or more well-defined tasks from this idea. Prefer smaller, narrowly scoped tasks that each deliver a thin but complete vertical slice of working software -- a path through the system that can be tested end-to-end -- rather than component-oriented tasks (like "add schema" or "build endpoint") that only work once all tasks are done. Split the idea into multiple tasks if it covers more than one logical change. Run `dust principles` to identify relevant principles (both core and local), then inline the FULL content of ALL selected principles in a Guidance section in each new task file (after Principles but before Definition of Done). This ensures implementing agents read the guidance without extra tool calls. Also run `dust facts` for design decisions that should inform the task. See [Review links in stock audits](../ideas/review-links-in-stock-audits.md).

## Resolved Questions

### Should we inline the full principle or just its core message?

**Decision:** Option: Inline only the one-sentence summary

### Should we add a reference comment to the original principle?

**Decision:** Option: No - make audits fully independent

### What about principles that don't exist in downstream repos?

**Decision:** Option: Always inline - never assume downstream principles exist

### Should this change apply to all artifact cross-references?

**Decision:** Option: Yes - establish a pattern for all distributed content


## Decomposes Idea

- [Review links in stock audits](../ideas/review-links-in-stock-audits.md)


## Task Type

decompose

## Blocked By

(none)

## Repository Hints

Really think about "Functional Core, Imperative Shell"


## Definition of Done

- One or more new tasks are created in .dust/tasks/
- Task's Principles section links to relevant principles from .dust/principles/
- The original idea (.dust/ideas/review-links-in-stock-audits.md) is deleted or updated to reflect remaining scope
