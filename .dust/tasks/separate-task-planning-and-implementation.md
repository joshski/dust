# Separate task planning and implementation

Update `dust claude` dispatch logic to distinguish between planning tasks and implementing tasks.

## Problem

`dust claude` says: "if the user mentions tasks, run `dust claude tasks`"

But users mention "tasks" in two very different contexts:

1. **Planning** - "I want to add some tasks" or "let's plan the tasks for this feature"
2. **Implementing** - "I want to work on a task" or "let's do the next task"

Currently `dust claude tasks` provides task management guidance (file format, how to list/create tasks), which is helpful for planning but not for implementation. Meanwhile `dust claude work` provides implementation guidance, but users who say "task" get routed to `tasks` instead.

## Examples of user intent

**Planning intent** (should route to task authoring guidance):
- "I want to add some tasks"
- "Let's plan out the tasks"
- "Can you help me write a task for this feature?"
- "What tasks do we need?"
- "Create a task for..."

**Implementation intent** (should route to `dust claude work`):
- "I want to work on a task"
- "Let's do the next task"
- "Pick a task and implement it"
- "Work on tasks"
- "Complete the semantic link validation task"

## Goals

- [Easy Adoption](../goals/easy-adoption.md)
- [Human-AI Collaboration](../goals/human-ai-collaboration.md)

## Blocked by

(none)

## Definition of done

- [ ] `dust claude` dispatch logic distinguishes planning vs implementation intent
- [ ] Users mentioning "work", "do", "implement", or "complete" with tasks get routed to `dust claude work`
- [ ] Users mentioning "add", "create", "plan", or "write" with tasks get routed to `dust claude tasks`
- [ ] Ambiguous "task" mentions either ask for clarification or show both options
- [ ] `bin/dust check` passes
