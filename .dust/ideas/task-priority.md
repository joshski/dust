# Task priority

Add a priority level (low, medium, high) to each task as a mandatory markdown element.

Currently, `bin/dust pick task` displays all unblocked tasks in alphabetical order by filename. The agent then chooses which task to work on with no guidance about relative importance. A priority field would let task authors signal which work matters most, and the pick-task flow could present high-priority tasks first.

## How it could work

A new required heading `## Priority` would be added to the task file format, alongside the existing `## Principles`, `## Blocked By`, and `## Definition of Done` sections. The section body would contain exactly one of: `high`, `medium`, or `low`.

Example:

```markdown
## Priority

high
```

The lint system (`lint-markdown.ts`) would validate:
- The heading exists in every task file
- The value is one of the three allowed levels
- No extra content in the section

The `findUnblockedTasks()` function in `next.ts` currently returns tasks in alphabetical order. With priority, it would sort high before medium before low, preserving alphabetical order within each tier. The `printTaskList()` output could group tasks by priority or annotate each task with its level.

## Open Questions

### What should the default priority be for new tasks?

#### Medium

Most tasks are routine work. Medium as the default means authors only need to think about priority when something is unusually urgent or unimportant. This keeps the cost of adding a task low. The risk is that most tasks cluster at medium, making priority less useful as a signal.

#### Low

New tasks start as low priority and must be explicitly promoted. This forces authors to justify higher priority, which keeps the high-priority lane clear for genuinely urgent work. The downside is that a backlog of all-low tasks looks the same as having no priority at all, and it adds friction to task creation.

### Should priority affect task selection, or just display order?

#### Affect selection (agent must pick highest priority first)

The pick-task flow would only show tasks at the highest available priority level. If any high-priority tasks exist, medium and low tasks are hidden. This guarantees urgent work gets done first, but removes agent discretion. It also means a single high-priority task can starve lower-priority work indefinitely.

#### Affect display order only

All unblocked tasks are still shown, but sorted by priority. The agent sees high-priority tasks at the top and is likely to pick them, but retains the freedom to choose otherwise. This is a softer nudge that respects the agent's ability to consider context beyond priority alone.

#### Strict ordering with a visibility cap

Show the top N tasks by priority (e.g., 5). This combines prioritization with a bounded list, preventing the agent from being overwhelmed by a large backlog. The risk is that important-but-low-priority tasks become invisible until higher-priority work is cleared.

### Should priority be inheritable from principles?

#### No, priority is per-task only

Each task has its own priority, independent of its principles. This is simple to implement and reason about. The downside is that when a principle becomes urgent, every associated task must be manually re-prioritized.

#### Yes, tasks inherit priority from their highest-priority principle

If a task links to a principle that has a priority, the task's effective priority is the maximum of its own priority and its principles' priorities. This requires adding priority to principle files too, which increases scope. The benefit is that promoting a principle automatically promotes all its tasks.

### Should the `## Priority` section be required or optional?

#### Required (mandatory in all task files)

Every task must declare a priority. This ensures the priority system is always complete and the sort order is well-defined. The cost is that every existing and new task needs a priority value, even when the author has no opinion. This is consistent with the original idea description which says "a new mandatory markdown element."

#### Optional with a default

Tasks without a `## Priority` section are treated as medium (or whatever the chosen default is). This reduces friction for simple tasks and avoids forcing authors to make a decision they don't care about. The downside is that implicit defaults can be confusing — a task without a priority section looks different from one explicitly set to medium, even though they behave the same.
