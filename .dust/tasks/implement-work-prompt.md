# Implement Work Prompt

Create a prompt for the main Dust workflow: select a task and implement it.

## Goals

- [Agent Agnostic](../goals/agent-agnostic.md)
- [Atomic Commits](../goals/atomic-commits.md)

## Blocked by

(none)

## Definition of done

A markdown file exists at `prompts/work.md` that instructs an AI agent to:
- Review available tasks in `.dust/tasks/` and their blocked-by dependencies
- Select an unblocked task to work on
- Spawn a sub-agent with fresh context to implement the selected task
- The sub-agent should implement the task and create an atomic commit that deletes the task file, updates any changed facts, and removes realized ideas
