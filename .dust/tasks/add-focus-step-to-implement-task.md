# Add Focus Step to Implement Task

Add a step to `lib/templates/agent-implement-task.txt` instructing agents to declare their focus when starting work on a task.

## Changes

In `lib/templates/agent-implement-task.txt`, insert a new step 2 (after identifying the task, before running check):

```
2. Run `{{bin}} focus "<task name>"` (so everyone knows you're working on it)
```

This will require renumbering subsequent steps.

## Goals

- [Human-AI Collaboration](../goals/human-ai-collaboration.md)

## Blocked By

(none)

## Definition of Done

- [ ] Step 2 added to `lib/templates/agent-implement-task.txt` with focus command instruction
- [ ] Subsequent steps renumbered correctly
- [ ] `bin/dust implement task` outputs the updated instructions
