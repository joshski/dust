# Prescriptive commit messages for task commits

When an agent completes a task and commits, the commit message currently uses "Complete task: <title>". The "Complete task: " prefix is redundant - the task title alone should suffice as the commit message.

For example, instead of:
- "Complete task: Add validation for user input"

Just use:
- "Add validation for user input"

The task title is already written in imperative form (like a good commit message should be), so it works directly as a commit message.
