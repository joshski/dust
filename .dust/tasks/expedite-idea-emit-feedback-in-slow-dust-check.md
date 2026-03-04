# Expedite Idea: Emit feedback in slow `dust check`

Research this idea briefly. If confident the implementation is straightforward (clear scope, minimal risk, no open questions), implement directly and commit. Otherwise, create one or more narrowly-scoped task files in `.dust/tasks/`. Run `dust principles` and `dust facts` for relevant context.

## Idea Description

Although we are trying to keep `dust check` output minimal, agents (and humans) can doubt it is working when there is no output at all. Therefore, emit a single dot 1) immedately and then 2) every second and then emit a new line character before the existing output

## Blocked By

(none)

## Definition of Done

- [ ] Idea is implemented directly OR one or more new tasks are created in `.dust/tasks/`
- [ ] If tasks were created, they link to relevant principles from `.dust/principles/`
- [ ] Changes are committed with a clear commit message
