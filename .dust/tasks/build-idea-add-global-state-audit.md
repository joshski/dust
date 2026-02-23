# Build Idea: Add "Global State" Audit

Research this idea briefly. If confident the implementation is straightforward (clear scope, minimal risk, no open questions), implement directly and commit. Otherwise, create one or more narrowly-scoped task files in `.dust/tasks/`. Review `.dust/principles/` and `.dust/facts/` for relevant context.

## Idea Description

Global state including the singleton pattern can introduce subtle coupling that makes code hard to change and hard to test. Add an audit that specifically looks for instances of global state that can be eradicated.

## Blocked By

(none)

## Definition of Done

- [ ] Idea is implemented directly OR one or more new tasks are created in `.dust/tasks/`
- [ ] If tasks were created, they link to relevant principles from `.dust/principles/`
- [ ] Changes are committed with a clear commit message
