# Only run `dust validate markdown` for workflow tasks

When an agent works on a workflow task, run `dust lint` instead of `dust check` and restrict edits to `.dust/` files.

## Background

Workflow tasks manage the dust planning system itself rather than implementing code changes. They include:

- **Add Idea:** tasks (`CAPTURE_IDEA_PREFIX`) - Research and create a new idea file
- **Refine Idea:** tasks - Research and refine an existing idea
- **Decompose Idea:** tasks - Break an idea into concrete implementation tasks
- **Shelve Idea:** tasks - Archive and remove an idea

These task types are already identified by their title prefixes in `lib/workflow-tasks.ts`:

```typescript
export const IDEA_TRANSITION_PREFIXES = [
  'Refine Idea: ',
  'Decompose Idea: ',
  'Shelve Idea: ',
]

export const CAPTURE_IDEA_PREFIX = 'Add Idea: '
```

## Motivation

Workflow tasks only modify files within `.dust/` (ideas, tasks, facts, goals). Running the full `dust check` command for these tasks:

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
         taskTitle.startsWith(CAPTURE_IDEA_PREFIX)
}
```

## Open Questions

### Where should the workflow task detection logic live?

#### Option A: In `lib/workflow-tasks.ts` (Recommended)

Co-located with existing prefix constants and workflow task functions. This keeps all workflow task logic together and the prefixes (`IDEA_TRANSITION_PREFIXES`, `CAPTURE_IDEA_PREFIX`) are already defined there. The existing `WORKFLOW_TASK_TYPES` array already maps types to prefixes, making this a natural extension.

**Recommendation:** This is the cleanest approach. CLI commands already import from this module for prefix constants.

#### Option B: In a new utility module

If the detection will be used in many places across different layers (CLI commands, hooks, templates), a dedicated module might provide better separation of concerns. However, this is likely over-engineering for a simple prefix check.

### How should the pre-push hook determine the task type?

The pre-push hook needs to know if the commit is a workflow task completion to decide whether to run the full check or just markdown validation.

#### Option A: Analyze changes for `.dust/`-only pattern (Recommended)

If all committed changes are within `.dust/`, run `dust lint` instead of `dust check`. This leverages the existing `analyzeChangesForTaskOnlyPattern()` function in `pre-push.ts` but extends it to check for `.dust/`-only changes (not just task-only additions).

**Pros:** Simple, no extra I/O, works with any `.dust/`-only commit
**Cons:** May skip full checks for a non-workflow task that only touched `.dust/` files

#### Option B: Check deleted task file prefix

Parse the deleted task file from the commit and verify it starts with a workflow task prefix. This is more precise but requires reading the deleted file content from git.

**Pros:** More accurate detection
**Cons:** More complex, requires git show to read deleted file content

#### Option C: Combine both approaches

Require both conditions: changes are `.dust/`-only AND a deleted task file has a workflow prefix. This is the most precise but also most complex.

### What about mixed commits with both `.dust/` and code changes?

#### Option A: Run full check for any non-`.dust/` changes (Recommended)

Any code changes trigger full validation. This aligns with the "stop the line" goal and keeps validation behavior predictable. Agents would naturally separate workflow and code changes into different commits.

**Rationale:** Workflow tasks should only touch `.dust/` files. If an agent is modifying both `.dust/` and code, they're either doing multiple tasks or making implementation changes that warrant full validation.

#### Option B: Run lint plus code linting only

Skip tests but still lint any code that was changed. This is a middle ground but complicates the validation logic and may not catch issues that tests would find.

#### Option C: Block the commit with a warning

Warn the agent that they should separate workflow and code changes into different commits. This enforces cleaner commit boundaries but may be too strict for cases where updating a fact about code is legitimate.

## Goal Alignment

This idea supports:

- **[Fast Feedback](../goals/fast-feedback.md)** - Workflow tasks complete faster without running irrelevant code checks
- **[Context Window Efficiency](../goals/context-window-efficiency.md)** - Less output from unnecessary checks means more efficient agent context usage
- **[Agent Autonomy](../goals/agent-autonomy.md)** - Workflow tasks can complete without being blocked by unrelated code issues

## Implementation Notes

Key files to modify:

1. **`lib/workflow-tasks.ts`** - Add `isWorkflowTask(taskTitle: string): boolean` helper
2. **`lib/cli/commands/focus.ts`** - Detect workflow tasks and provide tailored instructions
3. **`lib/cli/commands/pre-push.ts`** - Add `.dust/`-only detection, conditionally call `lintMarkdown` instead of `check`

The existing `analyzeChangesForTaskOnlyPattern()` in `pre-push.ts` can be extended or complemented with a new `analyzeChangesForDustOnlyPattern()` function that checks if all changes are within `.dust/`.
