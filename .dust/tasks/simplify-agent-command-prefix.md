# Simplify Agent Command Prefix

Promote agent sub-commands to top-level commands while keeping `dust agent` as the entry point for agents.

The `dust agent` command is useful as a starting point that explains the workflow. However, the sub-commands don't need to be nested under it. For example:

- `dust agent pick task` becomes `dust pick task`
- `dust agent new task` becomes `dust new task`
- `dust agent implement task` becomes `dust implement task`

## Implementation Details

### Command Registry Changes (`lib/cli/main.ts`)

Update the `commandRegistry` object to promote sub-commands to top-level:

```typescript
// Current:
agent,
'agent help': agentHelp,
'agent new task': agentNewTask,
'agent new goal': agentNewGoal,
'agent new idea': agentNewIdea,
'agent implement task': agentImplementTask,
'agent pick task': agentPickTask,
'agent understand goals': agentUnderstandGoals,
'subagent new task': subagentNewTask,

// After:
agent,                              // Keep as entry point
'new task': agentNewTask,
'new goal': agentNewGoal,
'new idea': agentNewIdea,
'implement task': agentImplementTask,
'pick task': agentPickTask,
'understand goals': agentUnderstandGoals,
'subagent task': subagentNewTask,
```

### Keep `dust agent`

The `dust agent` command stays as the entry point for agents starting work. Update its output to reference the new shorter command names.

### Remove `agent help` and Add Agent Guide to `help.txt`

Remove the `agent help` command and merge its essential content into `help.txt` as a brief agent guide section at the bottom:

```
🤖 Agent Guide

Dust is a lightweight planning system. The .dust/ directory contains:
- goals/  - Guiding principles (stable, rarely change)
- ideas/  - Proposals (convert to tasks when ready)
- tasks/  - Actionable work with definitions of done
- facts/  - Documentation of current system state

Workflow: Pick a task → implement it → delete the task file → commit atomically.

Run `dust agent` to get started!
```

This keeps the help concise while giving agents enough context when they can't route a request.

### Rename `subagent new task`

This command becomes `dust subagent task` for consistency.

### Rename Command Files and Exports

Rename files to match their new command names (using hyphens instead of spaces):

| Current File | New File |
|--------------|----------|
| `agent-pick-task.ts` | `pick-task.ts` |
| `agent-new-task.ts` | `new-task.ts` |
| `agent-new-goal.ts` | `new-goal.ts` |
| `agent-new-idea.ts` | `new-idea.ts` |
| `agent-implement-task.ts` | `implement-task.ts` |
| `agent-understand-goals.ts` | `understand-goals.ts` |
| `agent-help.ts` | (delete) |
| `subagent-new-task.ts` | `subagent-task.ts` |

Update exports in `lib/cli/main.ts` to match:

```typescript
// Current:
import { agentPickTask } from './commands/agent-pick-task.ts'

// After:
import { pickTask } from './commands/pick-task.ts'
```

### Files to Modify

1. `lib/cli/main.ts` - Update command registry keys and imports
2. `lib/cli/commands/agent.ts` - Update to reference new command names
3. `lib/cli/commands/agent-help.ts` - Delete
4. `lib/cli/main.test.ts` - Update test cases for new command names
5. `lib/templates/help.txt` - Update command list and add Agent Guide section
6. `lib/templates/agent-greeting.txt` - Update command references

## Goals

- [Context Window Efficiency](../goals/context-window-efficiency.md) - Shorter commands reduce prompt size
- [Easy Adoption](../goals/easy-adoption.md) - Simpler commands are easier to learn
- [Lightweight Planning](../goals/lightweight-planning.md) - Removing redundancy aligns with minimal overhead

## Blocked by

(none)

## Definition of done

- [ ] Command registry updated with top-level command names
- [ ] `dust agent` updated to reference new command names
- [ ] `agent help` removed from registry
- [ ] `subagent new task` renamed to `subagent task`
- [ ] Command files renamed (remove `agent-` prefix)
- [ ] Exports renamed to match new file names
- [ ] All tests updated and passing
- [ ] Templates updated (`help.txt`, `agent-greeting.txt`)
- [ ] Agent Guide section added to `help.txt`
