# Remove redundant checkbox instruction from agent-work template

The `lib/templates/agent-work.txt` file instructs agents to check off items in "Definition of done" as they work. This is redundant because the task file is deleted when the task is completed.

## Goals

- [Clarity over Brevity](../goals/clarity-over-brevity.md)

## Blocked by

(none)

## Definition of done

- [ ] Remove the instruction to check off items from `lib/templates/agent-work.txt`
- [ ] All tests pass
