# Simplify Claude Code Web Task Creation

Reduce the number of sub-agents from 2 to 1 when creating tasks in Claude Code Web by having the top-level agent perform task definition directly.

## Background

Currently, when Claude Code Web runs `bin/dust agent new task`, the template (`lib/templates/agent-new-task.txt`) instructs the agent to spawn **two sub-agents**:

1. First sub-agent: Run `bin/dust subagent new task` to research and create the task definition
2. Second sub-agent: Run `bin/dust agent implement task` to implement the task

This is inefficient because:
- The top-level agent already has context about what task needs to be created
- Creating an additional sub-agent just for task definition adds unnecessary overhead
- The task definition process (research, writing, committing) can be done directly by the top-level agent

## Proposed Change

The top-level agent should:
1. Perform the task definition steps directly (the same steps currently in `lib/templates/subagent-new-task.txt`)
2. Create only **one sub-agent** for implementation

## Implementation Details

Modify `/home/user/dust/lib/templates/agent-new-task.txt`:

The `{{#if isClaudeCodeWeb}}` section currently contains:

```
Use sub-agents for task creation (run these steps serially, not in parallel):

1. **Create the task definition** - Start a sub-agent with: "Run `{{bin}} subagent new task` and create a task for: [describe the task]. Research thoroughly, then create and commit the task file."

2. **Wait for step 1 to complete**, then **implement the task** - Start a new sub-agent with: "Run `{{bin}} agent implement task` and implement the task in `.dust/tasks/[task-file].md`"

Each sub-agent will handle the full workflow including commits and pushes.
```

Replace it with content that:
1. Includes the full task definition steps (from `subagent-new-task.txt`) for the top-level agent to follow
2. Adds a final step to spawn a single sub-agent for implementation

The `subagent-new-task` command and its template (`lib/templates/subagent-new-task.txt`) may become unused after this change, but should be kept for backwards compatibility or removed in a separate cleanup task.

## Goals

- [Context Window Efficiency](../goals/context-window-efficiency.md)
- [Agent Autonomy](../goals/agent-autonomy.md)

## Blocked by

(none)

## Definition of done

- [ ] `agent-new-task.txt` template is updated for Claude Code Web to perform task definition directly
- [ ] Only one sub-agent is spawned (for implementation) instead of two
- [ ] The task definition steps match those in `subagent-new-task.txt`
- [ ] Tests pass (run `npm test`)
- [ ] Manual verification: Running `bin/dust agent new task` in Claude Code Web environment follows the new workflow
