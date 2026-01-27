# Welcome Template Natural Language Examples

Update the claude greeting template to show examples of natural language that a human might use to kick off a task, rather than the mechanical "If the user mentioned X → run Y" format.

## Current Format

```
- If the user mentioned "work" → run `bin/dust claude work`
- If the user mentioned "task" or "tasks" → run `bin/dust claude tasks`
```

## Proposed Format

Show natural language examples like:

- "Flesh out the caching idea" → run `bin/dust claude ideas`
- "Implement the login task" → run `bin/dust claude tasks`
- "Work on the next thing" → run `bin/dust claude work`
- "What are the current goals?" → run `bin/dust claude goals`

## Benefits

- More intuitive for users to understand how to phrase requests
- Demonstrates the conversational style dust is designed for
- Helps Claude pattern-match on realistic user input
