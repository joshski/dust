# Build Idea: Add Audit: data access review

Research this idea thoroughly, then create one or more narrowly-scoped task files in `.dust/tasks/`. Review `.dust/principles/` and `.dust/facts/` for relevant context. Each task should deliver a thin but complete vertical slice of working software.

## Idea Description

Add an audit that is focused on data access patterns, like:
Are there any N+1 selects?
Are there missing indexes?
Any other ways we can improve data access?
Don’t assume the repository necessarily has a database (but this is still a general purpose audit because most apps do “data access” in some form.

## Blocked By

(none)

## Definition of Done

- [ ] One or more new tasks are created in `.dust/tasks/`
- [ ] Tasks link to relevant principles from `.dust/principles/`
- [ ] Tasks are narrowly scoped vertical slices
