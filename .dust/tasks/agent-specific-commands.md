# Agent-specific commands

Add a `dust claude` command with subcommands that provide focused, workflow-specific guidance for AI agents.

## Rationale

Currently, `dust help` provides comprehensive documentation suitable for both humans and agents. However, agents don't need the full menu of options when they've been given a specific task like "work on the next task" or "convert this idea to tasks".

A dedicated `dust claude` command can act as a routing layer that:
1. Greets the agent and sets context
2. Analyzes the user's prompt to determine intent
3. Directs the agent to run the appropriate subcommand
4. Each subcommand provides only the instructions needed for that workflow

## Goals

- [Progressive Disclosure](../goals/progressive-disclosure.md)
- [Context Window Efficiency](../goals/context-window-efficiency.md)
- [Human-AI Collaboration](../goals/human-ai-collaboration.md)

## Blocked by

(none)

## Definition of done

- [ ] `dust claude` outputs a greeting and routing instructions based on prompt keywords:
  - "work" → `dust claude work`
  - "task" or "tasks" → `dust claude tasks`
  - "goal" or "goals" → `dust claude goals`
  - "idea" or "ideas" → `dust claude ideas`
  - anything else → `dust claude help`
- [ ] `dust claude work` outputs focused instructions for the "work on next task" workflow
- [ ] `dust claude tasks` outputs instructions for task management (listing, creating, updating)
- [ ] `dust claude goals` outputs instructions for viewing and understanding goals
- [ ] `dust claude ideas` outputs instructions for converting ideas to tasks
- [ ] `dust claude help` outputs general guidance (can be similar to current help but agent-focused)
- [ ] Each subcommand's output is concise and action-oriented
- [ ] CLAUDE.md can be updated to instruct agents to run `dust claude` instead of `dust help`
- [ ] `bin/dust check` passes
