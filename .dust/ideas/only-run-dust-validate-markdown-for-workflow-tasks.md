# Only run `dust validate markdown` for workflow tasks

When an agent works on a workflow task, run `dust lint markdown` instead of `dust check` and restrict edits to `.dust/` files.

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

- Run `dust lint markdown` instead of `dust check`
- Include a note that only `.dust/` files should be modified
- Possibly suggest a smaller, more focused commit scope

### 2. Modify git pre-push hook behavior

In `lib/cli/commands/pre-push.ts`, when the commits being pushed only contain `.dust/` file changes and the task is a workflow task:

- Run `dust lint markdown` instead of the full `check()` command
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

#### In `lib/workflow-tasks.ts`

Co-located with existing prefix constants and workflow task functions. This keeps all workflow task logic together and the prefixes are already defined there. The downside is that CLI commands would need to import from this module.

#### In a new utility module

If the detection will be used in many places across different layers (CLI commands, hooks, templates), a dedicated module might provide better separation of concerns. However, this may be over-engineering for a simple prefix check.

### How should the pre-push hook determine the task type?

#### Re-read the task file being deleted

Parse the task file that's being deleted in the commit and check its title prefix. This is reliable but requires file I/O during the hook. The task file should be accessible from the commit being pushed.

#### Analyze only the file changes

If all changes are in `.dust/`, assume it's a workflow task. This is simpler but may incorrectly classify a regular task that happened to only touch documentation. However, this could be combined with checking for a deleted task file with a known prefix.

#### Use environment variables from focus command

The focus command could set an environment variable or write a temp file indicating the current task type. The pre-push hook would read this marker. This adds coupling between commands but provides explicit signaling.

### What about mixed commits with both `.dust/` and code changes?

#### Run full check for any non-`.dust/` changes

Any code changes trigger full validation. This is the safest approach and keeps validation behavior predictable. Agents would need to separate workflow and code changes into different commits.

#### Run lint markdown plus code linting only

Skip tests but still lint any code that was changed. This is a middle ground but complicates the validation logic and may not catch issues that tests would find.

#### Block the commit with a warning

Warn the agent that they should separate workflow and code changes into different commits. This enforces cleaner commit boundaries but may be too strict for cases where updating a fact about code is legitimate.
