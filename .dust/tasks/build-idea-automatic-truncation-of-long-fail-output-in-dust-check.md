# Build Idea: Automatic truncation of long fail output in `dust check`

Research this idea thoroughly, then create one or more narrowly-scoped task files in `.dust/tasks/`. Review `.dust/goals/` and `.dust/facts/` for relevant context. Each task should deliver a thin but complete vertical slice of working software.

## Idea Description

When an individual check fails with extremely long output, truncate it when we show the failure output to the agent. Truncate in the middle when it exceeds 500 lines, e.g.

```
error line 1
error line 2
...
[...snip x lines...]
...
error line 123457
error line 123458
```

## Goals

(none)

## Blocked By

(none)

## Definition of Done

- [ ] One or more new tasks are created in `.dust/tasks/`
- [ ] Tasks link to relevant goals from `.dust/goals/`
- [ ] Tasks are narrowly scoped vertical slices
