# Add vertical slicing guidance to decompose idea template

Update the `decomposeIdea()` opening sentence in `lib/workflow-tasks.ts` to guide agents toward vertical slicing. The current text says to "prefer smaller, narrowly scoped tasks" but doesn't distinguish between component-oriented tasks (e.g. "add database schema", "build API endpoint") and vertical slices that deliver working software end-to-end (e.g. "support creating a widget with a name field").

Add guidance that each task should deliver a thin but complete path through the system that can be tested and built upon, rather than producing isolated components that only work once all tasks are done.

## Goals

- [Small Units](../goals/small-units.md)
- [Agent Autonomy](../goals/agent-autonomy.md)
- [Fast Feedback Loops](../goals/fast-feedback-loops.md)

## Blocked By

(none)

## Definition of Done

- [ ] The `decomposeIdea()` opening sentence in `lib/workflow-tasks.ts` includes vertical slicing guidance
- [ ] Existing tests still pass
