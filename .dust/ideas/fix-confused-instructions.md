# Fix confused instructions

Agents receive confusing instructions when working on "Build Idea" tasks. The task name "Build Idea" implies implementation, but the instructions say to create task files.

## Context

The problem occurs in `lib/artifacts/workflow-tasks.ts:283-305`. When `buildItNow: true` is passed to `createCaptureIdeaTask`, it creates a "Build Idea" task with these instructions:

> Research this idea thoroughly, then create one or more narrowly-scoped task files in `.dust/tasks/`.

The user observed agents responding with statements like:

> This is a "Build Idea" task, which means I need to research and create new task files rather than directly implementing the change.

This indicates the agent is confused because:

1. **Naming mismatch**: "Build Idea" sounds like "implement this idea directly" but actually means "decompose this idea into tasks"
2. **Similar to Decompose Idea**: The instructions for "Build Idea" are nearly identical to "Decompose Idea" (lines 228-249), which also creates tasks from ideas
3. **Skipped workflow step**: "Build Idea" essentially combines "Add Idea" + "Decompose Idea" into one step, skipping the idea file creation

### Current workflow task types

| Task Type | Creates | Purpose |
|-----------|---------|---------|
| Add Idea | Idea file(s) in `.dust/ideas/` | Capture and research a vague idea |
| Refine Idea | Updates idea file | Add detail and resolve ambiguity |
| Decompose Idea | Task file(s) in `.dust/tasks/` | Convert idea to implementable tasks |
| Build Idea | Task file(s) in `.dust/tasks/` | Add Idea + Decompose in one step |

### The confusion

"Build" typically means "construct/implement" in software contexts. When an agent sees "Build Idea: Add login feature", it reasonably expects to be writing login code. Instead, it's asked to create task files - a planning/research activity.

The `focus.ts` file (lines 22-23) treats "Build Idea" tasks specially by recognizing they have no associated idea file, but this doesn't change the fundamental naming confusion.

## Open Questions

### Should "Build Idea" be renamed to something clearer?

#### Option: Rename to "Fast-track Idea"

Emphasizes that this is a shortcut through the normal workflow, not implementation. The name suggests speed without implying direct building.

#### Option: Rename to "Decompose Now"

Makes explicit that this task decomposes immediately rather than going through the full idea lifecycle. Clear connection to existing "Decompose Idea" tasks.

#### Option: Rename to "Quick Idea" or "Inline Idea"

Suggests this is a lighter-weight version of the idea workflow. However, might still be confused with actual implementation.

#### Option: Keep "Build Idea" but improve instructions

Rather than renaming, clarify the instructions explicitly. Add text like "This task creates task files, not implementation code" at the start.

### Should the "Build Idea" instructions explicitly state what the agent should NOT do?

#### Option: Add explicit anti-instructions

Begin the task with "Note: Do NOT implement this idea directly. Your job is to create task files that describe the implementation work."

#### Option: Rely on Definition of Done

The current Definition of Done already specifies "One or more new tasks are created in `.dust/tasks/`" - agents should infer from this what's expected.

#### Option: Remove ambiguity through restructuring

Rather than adding warnings, restructure the instructions to lead with the output artifacts: "Create narrowly-scoped task files in `.dust/tasks/` for this idea. Research the idea thoroughly to inform task creation."

### Is the "Build Idea" workflow step actually needed?

#### Option: Remove "Build Idea" entirely

Always require the full workflow: Add Idea -> Refine Idea -> Decompose Idea. This adds steps but eliminates confusion and ensures ideas are properly captured before decomposition.

#### Option: Keep for low-ceremony cases

Some ideas are clear enough that the full workflow adds overhead without value. "Build Idea" provides an escape hatch for experienced users who know what they want.

#### Option: Replace with "Decompose" on inline descriptions

Instead of a special task type, allow "Decompose Idea" to work with an inline description when no idea file exists. The idea content would live in the task body rather than requiring a separate file.
