# Use task title as commit message when completing tasks

The `agent-implement-task.txt` template should specify that the commit message should be the task title itself, without any prefix like "Complete task:".

Task titles are written in imperative form (e.g., "Add validation for user input"), which is the recommended style for git commit messages. Using the title directly as the commit message:

- Eliminates redundant prefixes
- Produces cleaner commit history
- Follows conventional commit message best practices

## Implementation

Update `lib/templates/agent-implement-task.txt` to add guidance about commit message format. After step 4 (the commit step), add text specifying that the commit message should be the task title.

For example, if the task title is "Add validation for user input", the commit message should simply be "Add validation for user input" (not "Complete task: Add validation for user input").

## Goals

- [Atomic Commits](../goals/atomic-commits.md)
- [Repository Hygiene](../goals/repository-hygiene.md)

## Blocked by

(none)

## Definition of done

- [ ] `lib/templates/agent-implement-task.txt` specifies that the commit message should be the task title
- [ ] The guidance includes an example showing the expected format
