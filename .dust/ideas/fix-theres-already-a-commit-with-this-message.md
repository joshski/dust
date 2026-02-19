# Fix "there's already a commit with this message"

The current workflow produces duplicate commit messages, making commit history harder to navigate. When an "Add Idea" or "Build Idea" task is created and then implemented, both commits have identical messages.

## Problem Analysis

Looking at recent commit history, there's a clear pattern of duplicate messages:

```
09f7271 Add Idea: Per-repository credit system    <- implementation commit
78eacaf Add Idea: Per-repository credit system    <- task creation commit
14dea49 Add Idea: Export parsers for all artifacts <- implementation commit
fafb138 Add Idea: Export parsers for all artifacts <- task creation commit
```

The duplication happens because:

1. **Task creation commit** - When someone (human or agent) creates a workflow task via `createCaptureIdeaTask()`, they commit with a message matching the task title (e.g., "Add Idea: X")

2. **Implementation commit** - When the agent implements the task, `focus.ts` instructs it to "Use this exact commit message: `<taskTitle>`" (line 41)

Both actions use the same commit message format because the task title contains the prefix (`Add Idea:`, `Build Idea:`, etc.).

## Why This Matters

Per the [Atomic Commits](../principles/atomic-commits.md) and [Traceable Decisions](../principles/traceable-decisions.md) principles, commit history should be easy to navigate and understand. Duplicate messages make it harder to:

- Distinguish between "task was created" vs "task was completed"
- Use `git log --oneline` effectively
- Search commit history for specific changes

## Relevant Code

- `lib/workflow-tasks.ts:9` - `CAPTURE_IDEA_PREFIX = 'Add Idea: '`
- `lib/workflow-tasks.ts:10` - `BUILD_IDEA_PREFIX = 'Build Idea: '`
- `lib/cli/commands/focus.ts:41` - Implementation instruction to use task title as commit message
- `lib/cli/commands/new-idea.ts:27` - Manual instruction to use "Add idea: <title>" format

## Open Questions

### Should the task creation commit use a different message format?

#### Option: Use "Create task:" prefix for task creation

Change the task creation commit message to "Create task: Add Idea - X" or similar. This distinguishes task creation from task completion.

Pro: Clear distinction between creating and completing a task.
Con: Verbose; adds cognitive load.

#### Option: Use "Backlog:" prefix for task creation

Change the task creation commit message to "Backlog: X" (the idea title without the workflow prefix).

Pro: Concise; focuses on what's being added to the backlog.
Con: Doesn't indicate the task type (Add Idea vs Build Idea).

#### Option: Keep task creation commit message as-is, change implementation commit

Instead of using the task title for the implementation commit, use something like "Complete: <idea title>" or "Implement: <idea title>".

Pro: Maintains current task creation workflow.
Con: Changes the established pattern for implementation commits.

### Should we prevent duplicate commit messages entirely?

#### Option: Add a git hook to reject duplicates

Add a pre-commit or commit-msg hook that warns or fails if the exact message already exists in recent history.

Pro: Catches duplicates regardless of workflow.
Con: May be overly restrictive; some duplicates may be intentional.

#### Option: Detect and suggest alternative messages

When the agent is about to commit, check if a recent commit has the same message and suggest an alternative.

Pro: Non-blocking; helps agent make better choices.
Con: Requires integration with the agent workflow.

#### Option: Accept duplicates as a trade-off

Keep the current behavior and accept that some duplicate messages will exist. The commit contents differ, so it's not actually confusing once you look at the diff.

Pro: No changes needed; keeps things simple.
Con: Doesn't address the concern raised in the original issue.
