# Add "Implement a task" example to agent greeting

In `lib/templates/agent-greeting.txt`, add "Implement a task" as an example phrase that should trigger `{{bin}} agent work`.

Currently line 7 shows:
```
1. "work", "go", "pick a task" → `{{bin}} agent work`
```

Update it to include the new example:
```
1. "work", "go", "pick a task", "implement a task" → `{{bin}} agent work`
```

## Goals

- [Agent Context Inference](../goals/agent-context-inference.md)

## Blocked by

(none)

## Definition of done

- [ ] `lib/templates/agent-greeting.txt` line 7 updated to include "implement a task" as an example
- [ ] `bin/dust check` passes
