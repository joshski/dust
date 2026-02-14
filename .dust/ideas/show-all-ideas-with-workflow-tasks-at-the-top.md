# Show all ideas with workflow tasks at the top

Ideas with an active workflow task should appear at the top of `dust ideas` output. Ideas without a workflow task would appear below them.

## Context

The `list.ts` command currently displays all ideas in alphabetical order with no distinction between ideas that have pending workflow tasks and those that don't. The `findWorkflowTaskForIdea()` function in `lib/workflow-tasks.ts` already provides the mechanism to check whether an idea has an associated workflow task. The implementation would need to call this function for each idea during listing, partition ideas into two groups (with and without workflow tasks), and render the workflow-task group first.

## Open Questions

### Should ideas with workflow tasks be visually distinguished from other ideas?

#### Show a badge or label indicating the workflow task type

Display a tag like `[refine]`, `[decompose]`, or `[shelve]` next to the idea title so it's clear why the idea is prioritized and what action is pending.

#### Use a section header to separate the two groups

Add a header like "In Progress" above workflow-task ideas and "Backlog" above the rest, making the grouping explicit without modifying individual idea lines.

#### No visual distinction beyond ordering

Simply place workflow-task ideas first in the list. The ordering itself communicates priority without adding visual noise.

### Should the sort order within each group remain alphabetical?

#### Alphabetical within each group

Keep the current alphabetical sort within both the workflow-task group and the remaining group, preserving predictable ordering.

#### Sort workflow-task ideas by task type priority

Order workflow-task ideas by task type (e.g., decompose before refine before shelve) to reflect how close each idea is to becoming actionable work.
