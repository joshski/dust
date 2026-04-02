# Decompose Idea: Explicitly explain the dust CLI to agents

Create one or more well-defined tasks from this idea. Prefer smaller, narrowly scoped tasks that each deliver a thin but complete vertical slice of working software -- a path through the system that can be tested end-to-end -- rather than component-oriented tasks (like "add schema" or "build endpoint") that only work once all tasks are done. Split the idea into multiple tasks if it covers more than one logical change. Run `dust principles` to identify relevant principles (both core and local), then inline the FULL content of ALL selected principles in a Guidance section in each new task file (after Principles but before Definition of Done). This ensures implementing agents read the guidance without extra tool calls. Also run `dust facts` for design decisions that should inform the task.

## Resolved Questions

### Where should the explanation appear?

**Decision:** Option: In DUST_QUICK_REFERENCE constant

### Should the explanation mention specific runners (bunx/npx)?

**Decision:** Option: Mention bunx/npx explicitly

### How verbose should the explanation be?

**Decision:** Option: Minimal (1-2 sentences)


## Decomposes Idea

- Explicitly explain the dust CLI to agents


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
