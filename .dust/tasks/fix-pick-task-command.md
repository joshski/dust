# Fix Pick Task Command

The `agent-pick-task.txt` template uses an incorrect command. It says `{{bin}} agent implement task` instead of `{{bin}} implement task`.

## Change Required

In `lib/templates/agent-pick-task.txt` line 7, change:
```
3. Run `{{bin}} agent implement task` for instructions about how to implement
```

To:
```
3. Run `{{bin}} implement task` for instructions about how to implement
```

## Goals

- [Agent Autonomy](../goals/agent-autonomy.md)

## Blocked By

(none)

## Definition of Done

- [ ] Template updated to use correct command
- [ ] Change committed and pushed
