# Decompose Idea: Directory Hierarchy Audit

Create one or more well-defined tasks from this idea. Prefer smaller, narrowly scoped tasks that each deliver a thin but complete vertical slice of working software -- a path through the system that can be tested end-to-end -- rather than component-oriented tasks (like "add schema" or "build endpoint") that only work once all tasks are done. Split the idea into multiple tasks if it covers more than one logical change. Run `dust principles` to identify relevant principles (both core and local), then inline the FULL content of ALL selected principles in a Guidance section in each new task file (after Principles but before Definition of Done). This ensures implementing agents read the guidance without extra tool calls. Also run `dust facts` for design decisions that should inform the task. See [Directory Hierarchy Audit](../ideas/directory-hierarchy-audit.md).

## Resolved Questions

### Should this audit focus on source directories only or include configuration?

**Decision:** Option: All project directories

### How should the audit handle established conventions (like node_modules, .git)?

**Decision:** Option: Hard-coded exclusion list

### Should the audit detect depth threshold violations?

**Decision:** Option: Context-aware depth analysis

### How should migration impact be communicated?

**Decision:** Option: Provide migration complexity score

### Should the audit detect "feature-based" vs "type-based" organization?

**Decision:** Option: Neutral on organization style


## Decomposes Idea

- [Directory Hierarchy Audit](../ideas/directory-hierarchy-audit.md)


## Task Type

decompose

## Blocked By

(none)

## Repository Hints

Really think about "Functional Core, Imperative Shell"


## Definition of Done

- One or more new tasks are created in .dust/tasks/
- Task's Principles section links to relevant principles from .dust/principles/
- The original idea (.dust/ideas/directory-hierarchy-audit.md) is deleted or updated to reflect remaining scope
