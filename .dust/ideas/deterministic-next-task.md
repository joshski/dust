# Deterministic Next Task

Make task ordering deterministic so that `pick task` always yields one clear next task, removing the agent from the decision.

## Context

Currently, `findUnblockedTasks()` in `next.ts` returns all unblocked tasks sorted alphabetically by filename. The `pick task` command presents this full list and asks the agent to "Pick ONE task." This means the agent makes a subjective choice about which task to work on, which introduces non-determinism — different agents (or the same agent on different runs) may pick different tasks from the same list.

If the next task were always the first item in a deterministic ordering, the `pick task` command could simply return that single task. The agent would then call `dust focus` on it immediately, removing a decision point and making the workflow faster and more predictable.

The `focus` command already accepts an arbitrary objective string and doesn't validate it against task files, so the integration between `pick task` and `focus` would be straightforward — `pick task` outputs the one task, and the agent focuses on it.

## Codebase Context

### Current implementation

`findUnblockedTasks()` in `lib/cli/commands/next.ts` (lines 59–106) reads all `.md` files from `.dust/tasks/`, sorts them alphabetically (`.sort()`), filters out tasks with incomplete blockers, and returns an array of `UnblockedTask` objects. The `pick-task.ts` command calls this function and displays all results via `printTaskList()`, then instructs the agent to "Pick ONE task."

### What would change

The change is small: `pick task` would display only the first unblocked task instead of all of them, and the instructional text would say "This is your next task" rather than "Pick ONE task." The `findUnblockedTasks()` function itself can remain unchanged — the filtering happens at the presentation layer in `pick-task.ts`.

### Task file format

Task files have three required headings: `## Goals`, `## Blocked By`, and `## Definition of Done`. There is no existing ordering metadata (no priority field, no creation date, no sequence number). The `task-file-format.md` fact documents this structure.

### Goal alignment

This idea supports several goals:
- **Agent Autonomy** — removing a decision point means agents can proceed without subjective judgment
- **Agent Context Inference** — the system makes the decision rather than requiring the agent to infer intent
- **Ideal Agent Developer Experience** — fewer decision points mean less human oversight needed
- **Lightweight Planning** — the system stays simple while becoming more deterministic

## Proposal

Change `pick task` to present only the first unblocked task instead of the full list. The ordering would be deterministic so that every invocation yields the same result given the same set of task files.

The simplest deterministic ordering is alphabetical by filename, which is what already happens. This means the only real change is presenting a single task instead of a list.

However, alphabetical ordering has a weakness: the "next" task is determined by filename, not by any meaningful property like creation time or importance. This is fine as long as task authors don't need to influence ordering, but it means you can't express "do this one first" without renaming files.

## Open Questions

### What ordering should determine the "next" task?

#### Alphabetical by filename (current behavior)

Already implemented. Predictable and simple. The downside is that ordering is an artifact of naming, not intent. Task authors would need to use filename prefixes (e.g., `001-`, `002-`) to control ordering, which is awkward.

#### Creation time (oldest first, FIFO)

Tasks are processed in the order they were created. This is intuitive — first in, first out. Implementation would require either using file creation timestamps (which are unreliable across git clones and platforms) or tracking creation order explicitly, such as by adding a date field to task files or using git history.

#### Creation time (newest first, LIFO)

Most recently created tasks are picked first. This prioritizes fresh work and keeps momentum on new initiatives. The risk is that older tasks get perpetually deferred — a starvation problem.

#### Explicit priority combined with a tiebreaker

Use the priority system proposed in the Task Priority idea, with alphabetical or creation-time ordering as the tiebreaker within each priority level. This gives task authors control over ordering when it matters while keeping the system deterministic. The downside is that it depends on the priority idea being implemented first.

### Should `pick task` show only one task or a short ranked list?

#### Show only the single next task

Maximum determinism. The agent has no choice to make and can immediately focus. This is the purest version of the idea. The risk is that if the "next" task is blocked for a reason the system can't detect (e.g., waiting on external input), there's no visible alternative.

#### Show a ranked list but recommend the first one

Present 2–3 tasks in order but clearly indicate the first one is the recommended pick. This preserves determinism as the default while giving the agent (or a human) the option to skip a task if there's a good reason. It's a softer version that trades some determinism for flexibility.

### How does this relate to the Task Priority idea?

#### Independent — deterministic ordering works without priority

This idea can be implemented with any ordering strategy (alphabetical, creation time, etc.) without waiting for a priority system. Priority could be layered on later as an enhanced ordering input.

#### Dependent — priority should be the primary ordering input

Deterministic ordering is most useful when it reflects task importance. Without priority, the ordering is arbitrary and may not match what the task author intended. This view says the two ideas should be implemented together.

### Should the `next` command also change to show a single task?

#### Yes — both commands show only one task

Consistency between `pick task` and `next`. Both commands serve the same purpose of surfacing the next piece of work. Having them behave differently would be confusing.

#### No — `next` remains a full list view

`next` serves as a backlog overview for humans, while `pick task` is the agent-facing command. Keeping `next` as a full list provides a way to see all unblocked tasks without affecting the deterministic agent workflow.

### Should `pick task` automatically run `focus`?

#### Yes — merge pick and focus into one step

If there's only one deterministic task, `pick task` could skip the display step and directly output the focus instructions, saving a round-trip in the agent workflow. This makes the agent path faster and removes another decision point.

#### No — keep pick and focus as separate commands

Separating selection from execution makes the system easier to debug. You can see what would be picked without starting work. It also preserves the option for the agent (or human) to inspect the task before committing to it.
