# Add todo list instruction to multi-step workflows

Claude Code has a built-in Todo list tool (TodoWrite) for tracking progress on multi-step tasks. The `agent-new-task.txt` template already includes a conditional instruction for Claude Code Web users to use a todo list, but other multi-step workflows don't.

Add the same pattern to other workflow templates that have multiple steps:

- `lib/templates/agent-implement-task.txt` - Has 5-6 steps for implementing a task
- `lib/templates/agent-new-goal.txt` - Has 7 steps for creating a goal

The instruction should be conditional on `isClaudeCodeWeb` (matching the existing pattern in `agent-new-task.txt`):

```handlebars
{{#if isClaudeCodeWeb}}
Use a todo list to track your progress through these steps.
{{/if}}
```

Templates that don't need this:
- `agent-pick-task.txt` - Only 3 simple steps, too short to benefit
- `agent-new-idea.txt` - Simple workflow
- `agent-understand-goals.txt` - Read-only workflow

## Goals

- [Agent-Specific Enhancement](../goals/agent-specific-enhancement.md)
- [Human-AI Collaboration](../goals/human-ai-collaboration.md)

## Blocked by

(none)

## Definition of done

- [ ] `agent-implement-task.txt` includes conditional todo list instruction
- [ ] `agent-new-goal.txt` includes conditional todo list instruction
- [ ] Instructions are only shown when `isClaudeCodeWeb` is true
- [ ] All tests pass
