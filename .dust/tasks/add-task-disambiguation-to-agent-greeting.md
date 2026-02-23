# Add Task Disambiguation to Agent Greeting

Clarify in the `dust agent` greeting that "tasks" means dust task files, not internal agent task tracking.

## Context

AI agents have their own task management systems (e.g., Claude Code's TodoWrite). When the agent greeting mentions "Capture a new task", agents may interpret this as adding to their internal tracking rather than creating a dust task file. This undermines the task-first workflow where all work should be captured as traceable artifacts.

## Implementation

In `lib/cli/commands/agent.ts`, add an informational note to the `agentGreeting()` function output. The note should be placed after the command routing list and before the closing instruction.

Example wording:
```
Note: "tasks" here refers to dust task files in `.dust/tasks/`, not internal task tracking tools.
```

## Principles

- [Task-First Workflow](../principles/task-first-workflow.md)
- [Clarity Over Brevity](../principles/clarity-over-brevity.md)

## Blocked By

(none)

## Definition of Done

- [ ] The `dust agent` greeting includes a note clarifying that "tasks" means dust task files
- [ ] The note is worded as an informational reminder (not a command)
- [ ] Running `bin/dust agent` displays the updated greeting with the disambiguation note
