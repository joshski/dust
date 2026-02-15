# Add vertical slicing guidance to new task template

Update `templates/agent-new-task.txt` to guide agents toward creating tasks that deliver vertical slices of working software. When agents create tasks manually (not through idea decomposition), they should also be encouraged to scope tasks as end-to-end slices rather than component-oriented layers.

Add a brief note to the task creation steps reminding agents that a good task delivers a thin but complete path through the system — something that can be tested and built upon — rather than an isolated component.

## Goals

- [Small Units](../goals/small-units.md)
- [Agent Autonomy](../goals/agent-autonomy.md)

## Blocked By

(none)

## Definition of Done

- [ ] `templates/agent-new-task.txt` includes vertical slicing guidance
- [ ] Existing tests still pass
