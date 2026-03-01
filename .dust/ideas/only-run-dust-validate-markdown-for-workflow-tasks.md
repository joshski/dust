# Only run `dust validate markdown` for workflow tasks

When an agent works on a workflow task, run `dust lint` instead of `dust check` and restrict edits to `.dust/` files.

## Background

Workflow tasks manage the dust planning system itself rather than implementing code changes. They include:

- **Add Idea:** tasks (`CAPTURE_IDEA_PREFIX`) - Research and create a new idea file
- **Expedite Idea:** tasks (`EXPEDITE_IDEA_PREFIX`) - Research briefly and implement directly if straightforward
- **Refine Idea:** tasks - Research and refine an existing idea
- **Decompose Idea:** tasks - Break an idea into concrete implementation tasks
- **Shelve Idea:** tasks - Archive and remove an idea

These task types are already identified by their title prefixes in `lib/artifacts/workflow-tasks.ts`:

```typescript
export const IDEA_TRANSITION_PREFIXES = [
  'Refine Idea: ',
  'Decompose Idea: ',
  'Shelve Idea: ',
]

export const CAPTURE_IDEA_PREFIX = 'Add Idea: '
export const EXPEDITE_IDEA_PREFIX = 'Expedite Idea: '
```

## Motivation

Workflow tasks only modify files within `.dust/` (ideas, tasks, facts, principles). Running the full `dust check` command for these tasks:

1. Wastes time running code linters, type checkers, and tests that won't catch any issues
2. May fail on unrelated code issues, blocking workflow task completion
3. Slows down the planning/refinement loop unnecessarily

## Proposed Changes

### 1. Modify `focus` command output

When an agent runs `dust focus "<workflow task name>"`, detect if it's a workflow task and provide different instructions:

- Run `dust lint` instead of `dust check`
- Include a note that only `.dust/` files should be modified
- Possibly suggest a smaller, more focused commit scope

### 2. Modify git pre-push hook behavior

In `lib/cli/commands/pre-push.ts`, when the commits being pushed only contain `.dust/` file changes and the task is a workflow task:

- Run `dust lint` instead of the full `check()` command
- This can leverage the existing `analyzeChangesForTaskOnlyPattern()` function

### 3. Add workflow task detection helper

Create a utility function (or enhance existing ones) to detect workflow tasks by title prefix:

```typescript
function isWorkflowTask(taskTitle: string): boolean {
  return IDEA_TRANSITION_PREFIXES.some(p => taskTitle.startsWith(p)) ||
         taskTitle.startsWith(CAPTURE_IDEA_PREFIX) ||
         taskTitle.startsWith(EXPEDITE_IDEA_PREFIX)
}
```

## Resolved Questions

### Where should the workflow task detection logic live?

**Decision:** In `lib/artifacts/workflow-tasks.ts`

Co-located with existing prefix constants and workflow task functions. This keeps all workflow task logic together and the prefixes (`IDEA_TRANSITION_PREFIXES`, `CAPTURE_IDEA_PREFIX`, `EXPEDITE_IDEA_PREFIX`) are already defined there. CLI commands already import from this module for prefix constants.

### How should the pre-push hook determine the task type?

**Decision:** Analyze changes for `.dust/`-only pattern

If all committed changes are within `.dust/`, run `dust lint` instead of `dust check`. This leverages the existing `analyzeChangesForTaskOnlyPattern()` function in `pre-push.ts` but extends it to check for `.dust/`-only changes (not just task-only additions).

**Pros:** Simple, no extra I/O, works with any `.dust/`-only commit
**Cons:** May skip full checks for a non-workflow task that only touched `.dust/` files (acceptable tradeoff since `.dust/` changes shouldn't affect code quality)

### What about mixed commits with both `.dust/` and code changes?

**Decision:** Run full check for any non-`.dust/` changes

Any code changes trigger full validation. This aligns with the "stop the line" principle and keeps validation behavior predictable. Workflow tasks should only touch `.dust/` files. If an agent is modifying both `.dust/` and code, they're either doing multiple tasks or making implementation changes that warrant full validation.

## Principle Alignment

This idea supports:

- **[Fast Feedback](../principles/fast-feedback.md)** - Workflow tasks complete faster without running irrelevant code checks
- **[Context Window Efficiency](../principles/context-window-efficiency.md)** - Less output from unnecessary checks means more efficient agent context usage
- **[Agent Autonomy](../principles/agent-autonomy.md)** - Workflow tasks can complete without being blocked by unrelated code issues

## Implementation Notes

Key files to modify:

1. **`lib/artifacts/workflow-tasks.ts`** - Add `isWorkflowTask(taskTitle: string): boolean` helper
2. **`lib/cli/commands/focus.ts`** - Detect workflow tasks and provide tailored instructions
3. **`lib/cli/commands/pre-push.ts`** - Add `.dust/`-only detection, conditionally call `lintMarkdown` instead of `check`

The existing `analyzeChangesForTaskOnlyPattern()` in `pre-push.ts` can be extended or complemented with a new `analyzeChangesForDustOnlyPattern()` function that checks if all changes are within `.dust/`.
