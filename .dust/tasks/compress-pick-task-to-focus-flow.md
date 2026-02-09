# Compress pick-task-to-focus flow

Reduce the number of agent round trips between `dust agent` and `dust focus` by consolidating intermediate commands.

Currently, an agent picking up work from the backlog executes 5 commands before broadcasting focus:

```
agent → pick task → next → (read file) → implement task → focus
```

The `pick task` template (`lib/templates/agent-pick-task.txt`) just says "run `next`, pick a task, then run `implement task`". And `implement task` (`lib/templates/agent-implement-task.txt`) starts with "run `next`" again, then "run `focus`". These are intermediate waypoints that each cost a round trip without doing real work.

Compress this to:

```
agent → pick task → (read file) → focus
```

## Changes

### 1. Inline task list into `pick task`

Change `pick-task.ts` from a template command to a real command that:
- Calls the `next` logic directly to get unblocked tasks
- Prints the task list inline (same format as `next`)
- Instructs the agent: pick one, read its file, then run `{bin} focus "<task name>"`

This eliminates the separate `next` round trip.

### 2. Append implement instructions to `focus` output

After printing `🎯 Focus: <objective>`, have `focus.ts` also print the implementation steps currently in `agent-implement-task.txt` (steps 3 onward: run check, implement, commit, push). Skip the "run `next`" and "run `focus`" steps since those are already done.

This eliminates the separate `implement task` round trip.

### 3. Update `agent-greeting.txt`

Change option 2 ("Implement a specific task") to point to `{bin} focus "<task name>"` instead of `{bin} implement task`, since the agent already knows the task name.

### 4. Update `implement task` for backward compatibility

Keep the `implement task` command but simplify it to say: "run `{bin} focus "<task name>"`". This way if anyone still uses it, it redirects with one hop instead of the current multi-step dance.

## Goals

- [Context Window Efficiency](../goals/context-window-efficiency.md)
- [Agent Autonomy](../goals/agent-autonomy.md)

## Blocked By

(none)

## Definition of Done

- [ ] `pick task` prints the unblocked task list inline and instructs the agent to run `focus` after reading a task
- [ ] `focus` prints implementation instructions (check, implement, commit, push) after the focus line
- [ ] `agent-greeting.txt` option 2 directs to `focus` instead of `implement task`
- [ ] `implement task` redirects to `focus`
- [ ] The `next` command still works standalone (unchanged)
- [ ] Existing tests updated, new tests cover the consolidated behavior
- [ ] Agent flow from `agent` to `focus` takes 2 command turns instead of 5 when picking from the backlog
