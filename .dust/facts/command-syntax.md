# Command Syntax

Dust commands use verb-then-noun patterns with spaces, making them readable as natural language.

## Examples

- `dust new task` - creates a new task
- `dust list facts` - lists all facts
- `dust agent implement task` - guides the agent to implement a task

## Why Not Subcommands?

Some tools use chained subcommands like `git stash pop` or hyphenated commands like `docker-compose`. Dust avoids these patterns because:

1. **Natural reading order** - "new task" reads forward as an action, not backward like "task-new"
2. **No mental parsing** - spaces clearly separate verb from noun without decoding conventions
3. **Consistency with prompts** - users can type commands the same way they'd describe what they want

This supports [Clarity Over Brevity](../goals/clarity-over-brevity.md) and [Easy Adoption](../goals/easy-adoption.md).
