# Clarify that one idea can become many tasks

The `createTaskFromIdea` function uses singular language that nudges agents toward producing exactly one task per idea. The opening sentence says "Create a well-defined task from this idea" and the definition of done says "A new task is created in .dust/tasks/" — both singular. This is misleading when an idea is large enough to warrant several tasks.

The [Small Units](../goals/small-units.md) goal says tasks should be "as discrete and fine-grained as possible" and that "a narrowly scoped task gives agents or humans the best chance of delivering exactly what was intended, in a single atomic commit." The [Idea Refinement Through Open Questions](idea-refinement-through-open-questions.md) idea already acknowledges this: "Some ideas are small enough to map to a single task. Others (like Progress Broadcasting) are epics that need decomposition into multiple tasks."

## What should change

The opening sentence and definition of done in `createTaskFromIdea` should use language that makes it clear the agent may (and often should) create multiple tasks from a single idea. For example:

- "Create one or more well-defined tasks from this idea. Prefer smaller, narrowly scoped tasks — split the idea into multiple tasks if it covers more than one logical change."
- The definition of done item could become "One or more new tasks are created in .dust/tasks/" and perhaps add "Each task is small enough to complete in a single atomic commit"

The definition of done item "The original idea is deleted or updated to reflect remaining scope" already covers the case where an idea is partially decomposed, which is good.

## Open Questions

### Should the prompt set an explicit upper bound on task size?

#### Yes, reference the atomic commit constraint

Add wording like "each task should be completable in a single atomic commit" to the definition of done. This makes the Small Units goal concrete and gives the agent a clear heuristic for when to split. It does mean the agent needs to judge what fits in one commit, which can vary.

#### No, just encourage splitting without a size rule

Say "prefer smaller tasks" and "split if the idea covers multiple concerns" but don't reference commits. This keeps the prompt simpler and avoids coupling task creation to git workflow. The risk is that without a concrete threshold, agents may still produce tasks that are too large.

### Should we also update the task title prefix?

#### Keep "Create Task From Idea"

The singular "Task" in the prefix is a workflow label, not a count. Changing it to "Create Tasks From Idea" would be grammatically awkward and break the existing `IDEA_TRANSITION_PREFIXES` constant, `titleToFilename` derivation, and any tasks already in flight. The opening sentence is the right place to communicate the one-to-many relationship.

#### Rename to "Decompose Idea"

A new prefix like "Decompose Idea: " would signal the one-to-many intent more clearly. But it requires updating `IDEA_TRANSITION_PREFIXES`, `WORKFLOW_TASK_TYPES`, the linter, tests, and any existing task files. The cost is high for a naming preference.
