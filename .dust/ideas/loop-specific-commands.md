# Loop-Specific Commands

When running a loop (`dust loop` or `dust bucket`), the agent sees full "routing" instructions from `dust agent`. This is unnecessary because we already know the agent should work on a task.

Currently, `loop.ts` sends this prompt to Claude:

```
Run `npm install && dust agent && dust pick task` and follow the instructions.
```

This triggers a chain of 3 commands and 1 agent decision:

1. `dust agent` — outputs 6 routing options (pick task, focus, new task, new goal, new idea, help). The agent "decides" to run `dust pick task`. Wasteful: we already know it should pick a task.
2. `dust pick task` — lists unblocked tasks and says "Pick ONE task, read its file, then run `dust focus`". The agent "decides" which task. Wasteful: the selection is arbitrary and could be deterministic (oldest first).
3. `dust focus "<task name>"` — outputs implementation steps (check, implement, commit, push). This is the only useful output.

The proposal is to collapse all three into a single command — `dust work` — that deterministically selects the oldest unblocked task and outputs the focus instructions directly. No agent decisions required.

## How `dust work` would behave

`dust work` would combine the logic of `pick task` and `focus`:

1. Call `findUnblockedTasks()` (which already sorts by filename via `.sort()`)
2. Select `tasks[0]` — the first task alphabetically (oldest by convention if filenames are timestamped or sequentially named)
3. Output the task name and path so the agent knows what it's working on
4. Output the implementation steps currently produced by `dust focus`

No routing menu, no "pick ONE task", no agent discretion.

## How `dust loop` would change

In `loop.ts:324`, the prompt would change from:

```typescript
const prompt = `Run \`${installCommand} && ${dustCommand} agent && ${dustCommand} pick task\` and follow the instructions.`
```

to:

```typescript
const prompt = `Run \`${installCommand} && ${dustCommand} work\` and follow the instructions.`
```

The `hasAvailableTasks()` check (loop.ts:232-244) already prevents iterations when no tasks exist, so `dust work` can assume at least one task is available.

## How `dust bucket` would change

`dust bucket` clones repositories and runs dust loops for each. The loop prompt change above applies identically — each cloned repository's loop iteration would use `dust work` instead of `dust agent && dust pick task`.

## What stays the same

- `dust agent` remains unchanged for interactive use (human-driven sessions)
- `dust pick task` remains available for cases where a human wants to browse tasks
- `dust focus` remains available for when a human names a specific task
- `findUnblockedTasks()` already does the right sorting; `dust work` just takes the first result

## Open Questions

### Should task selection order be configurable?

#### Alphabetical (current `.sort()` behavior)

Simplest. Already how `findUnblockedTasks` works. Predictable. If filenames use a consistent prefix convention, this approximates creation order.

#### By file modification time

Would require `stat()` calls but would select the genuinely oldest task. More accurate but slower and filesystem-dependent.

#### No configuration needed

Alphabetical is good enough. The important thing is removing agent discretion, not perfecting the sort order.
