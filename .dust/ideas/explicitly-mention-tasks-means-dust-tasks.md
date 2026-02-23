# Explicitly mention "tasks" means dust tasks

The word "task" is ambiguous when instructing AI agents. Agents may interpret "add a task" as adding to their own internal task tracking system (e.g., Claude Code's TodoWrite tool) rather than creating a dust task file in `.dust/tasks/`.

## Context

The `dust agent` command in `lib/cli/commands/agent.ts:21-48` outputs guidance that includes:

```
3. **Capture a new task** → `${vars.bin} new task`
   User has concrete work to add. Keywords: "task: ..." or "add a task ..."
```

The problem is that modern AI coding agents have their own task management capabilities:

- **Claude Code**: Has a `TodoWrite` tool for tracking tasks internally
- **Cursor**: Has internal task tracking
- **Other agents**: May have similar internal systems

When a user says "add a task to improve caching", an agent might:

1. **Intended behavior**: Run `dust new task` and create a file in `.dust/tasks/`
2. **Actual behavior observed**: Add an item to its internal TodoWrite list

This confusion violates the [Task-First Workflow](../principles/task-first-workflow.md) principle, which expects tasks to be captured in dust before implementation. If tasks live only in the agent's ephemeral internal tracking, they lose the traceability benefits of dust.

The CLAUDE.md instruction to "run `bin/dust agent` when you start working" is meant to establish the dust workflow, but the agent's built-in behaviors around the word "task" can override this context.

## Potential solutions

### Add explicit disambiguation to `dust agent` output

Modify the greeting in `lib/cli/commands/agent.ts:agentGreeting()` to explicitly state that "tasks" in this context means dust task files, not internal task tracking.

Example addition:
```
Note: "tasks" in this context means dust task files in `.dust/tasks/`,
NOT your internal task tracking tools (TodoWrite, etc.).
All tasks should be captured as dust artifacts.
```

### Add a principle or fact about task disambiguation

Create a principle or fact that explicitly states dust tasks take precedence over agent-internal task systems. This would be read by agents that explore the `.dust/` directory.

### Rename "task" to something more specific

Instead of "task", use terminology that's less likely to conflict with agent built-ins, such as:
- "work item"
- "dust task"
- "backlog item"

However, this would be a significant change affecting many commands and documentation.

## Open Questions

### Where should the disambiguation guidance be added?

#### Option: In the `dust agent` greeting

Add a note directly to the `agentGreeting()` output in `lib/cli/commands/agent.ts`. This is highly visible since it's the first thing agents see when starting work.

Pros: Maximum visibility, immediate context-setting
Cons: Makes the greeting longer, may be skipped/forgotten once agents are "in flow"

#### Option: In the `dust new task` instructions

Add clarity to the `newTaskInstructions()` in `lib/cli/commands/new-task.ts`. When an agent is already in the task creation flow, reinforce that this is about dust artifacts.

Pros: Context-appropriate timing
Cons: Doesn't help when agents misinterpret the initial routing

#### Option: In AGENTS.md/CLAUDE.md via `dust init`

Enhance the instruction that `dust init` adds to these files to explicitly mention that "tasks" means dust tasks.

Pros: Permanent, visible in repository context files
Cons: Changes the user's files, may feel verbose

#### Option: Multiple locations

Apply the disambiguation in all relevant locations for reinforcement.

Pros: Comprehensive coverage
Cons: Repetitive, may feel heavy-handed

### How strongly should the disambiguation be worded?

#### Option: Informational note

A gentle reminder: "Note: 'tasks' here refers to dust task files in `.dust/tasks/`."

Pros: Non-intrusive, respects agent intelligence
Cons: May still be overlooked

#### Option: Explicit instruction

A direct command: "Do NOT use your internal task tracking tools (TodoWrite, etc.). All tasks must be created as dust artifacts in `.dust/tasks/`."

Pros: Unambiguous, hard to misinterpret
Cons: May feel bossy, could conflict with legitimate uses of internal tools

#### Option: Contextual explanation

Explain why: "To maintain traceability, always create tasks as dust files rather than using internal task tracking. This ensures tasks are persisted and visible in the repository."

Pros: Helps agents understand the reasoning
Cons: Longer, may be skimmed
