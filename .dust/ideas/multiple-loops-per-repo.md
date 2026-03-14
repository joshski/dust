# Multiple loops per repo

Allow `dust bucket` to run multiple concurrent loops per repository. This enables spawning new Claude sessions as analysis tasks appear rather than waiting for the current session to complete.

## Context

The current `dust bucket` architecture ([[`lib/bucket/repository.ts`](../../lib/bucket/repository.ts)](../../lib/bucket/repository.ts)) runs exactly one loop per repository. The `RepositoryState` tracks a single `loopPromise` and `agentStatus` ('idle' | 'busy'). The `runRepositoryLoop` function runs a sequential loop: check for a task, run Claude, wait if no tasks, repeat.

This means:
- If an analysis task (like "Add Idea: Foo" or "Refine Idea: Bar") is created while another task is running, it waits in the queue
- Analysis tasks are often low-stakes research that could run in parallel with implementation tasks
- The single-loop model serializes all work, even when parallelism would be safe and beneficial

The idea workflow tasks (defined in `lib/workflow-tasks.ts`) include several task types that are primarily research/analysis:
- `Add Idea: <title>` - Research and create an idea file
- `Refine Idea: <title>` - Research and clarify an existing idea
- `Decompose Idea: <title>` - Break down an idea into tasks

These tasks don't modify production code; they create or update markdown files in [`.dust/ideas/`]() and `.dust/tasks/`. This makes them safer for parallel execution than implementation tasks that might conflict.

The current event protocol ([[`lib/agent-events.ts`](../../lib/agent-events.ts)](../../lib/agent-events.ts) and [[`.dust/facts/dust-event-protocol.md`](../facts/dust-event-protocol.md)](../facts/dust-event-protocol.md)) already supports multiple agent sessions via `agentSessionId`. Each session has a unique UUID, and events are tagged with both the session ID and sequence numbers.

## Motivation

Running multiple loops per repository would:
- **Reduce queue latency**: Analysis tasks could start immediately rather than waiting for in-progress implementation tasks
- **Utilize available compute**: If the dustbucket server has capacity, multiple agents could work on the same repository simultaneously
- **Match task characteristics**: Research tasks are naturally parallel; they don't conflict with each other or with most implementation tasks

This operates at the level of parallelism within a single repository, distinct from multi-repository orchestration concerns.

## Implementation Considerations

### Data structures

The `RepositoryState` would need to track multiple loops:

```typescript
interface RepositoryState {
  repository: Repository
  path: string
  loops: Map<string, LoopState>  // loopId -> LoopState
  logBuffer: LogBuffer
}

interface LoopState {
  loopPromise: Promise<void>
  stopRequested: boolean
  agentStatus: 'idle' | 'busy'
  currentTask?: string  // task file path
}
```

### Task claiming

With multiple loops, two loops might pick the same task. The current `findUnblockedTasks` in [[`lib/cli/commands/next.ts`](../../lib/cli/commands/next.ts)](../../lib/cli/commands/next.ts) returns the first unblocked task, so without coordination both loops would start the same task.

Options:
- **Filesystem locks**: Create a `.lock` file next to the task file when claiming it
- **In-memory tracking**: Track claimed tasks in `RepositoryState`
- **Server-side coordination**: Have the dustbucket server assign tasks rather than each loop discovering them

### Git conflicts

Multiple loops writing to the same repository could create git conflicts. The current architecture handles conflicts by spawning Claude to resolve them ([`lib/cli/commands/loop.ts`](../../lib/cli/commands/loop.ts)), but with parallel loops this becomes more complex:
- Two loops might both try to push, creating conflicts
- One loop might be resolving a conflict while another creates a new one

### Log buffer isolation

The current `LogBuffer` mixes output from all activity in a repository. With multiple loops, it might be useful to:
- Keep a single shared buffer (current behavior, simple)
- Create per-loop buffers for isolation
- Use structured logging with loop IDs for filtering

## Open Questions

### Which task types should spawn parallel sessions?

#### Only idea workflow tasks (Add/Refine/Decompose/Shelve)

Idea workflow tasks are explicitly research-focused and produce markdown files, not code. They're the safest candidates for parallel execution. This is a conservative starting point that minimizes conflict risk.

#### Any task that doesn't modify source code

Expand to any task where analysis shows it won't touch `src/`, [`lib/`](../../lib), or other code directories. This requires inspecting the task definition to determine its scope, which adds complexity.

#### All tasks, with conflict resolution

Allow any task to run in parallel. Handle conflicts at the git level with the existing conflict resolution mechanism. This is the most aggressive option and may create more conflicts than the resolution mechanism can handle gracefully.

### How many parallel loops should be allowed?

#### Fixed limit (e.g., 2 loops)

Cap the number of concurrent loops to a small fixed number. Simple to implement, predictable resource usage. But potentially leaves compute on the table if tasks are lightweight.

#### Configurable per-repository

Add a `maxConcurrentLoops` setting to repository configuration. Allows tuning per project based on its characteristics. Adds configuration complexity.

#### Unlimited (bounded only by available tasks)

Spawn a new loop for every available task. Maximizes parallelism but could overwhelm resources if many tasks queue up simultaneously.

#### Server-controlled

Let the dustbucket server decide how many loops to run based on global capacity and queue depth. Centralizes decision-making but requires protocol changes.

### How should task claiming work?

#### Filesystem locks

Create `<task-file>.lock` when claiming. Simple, works with the existing architecture. Risk: stale locks if a loop crashes without cleanup.

#### In-memory tracking per repository

Track claimed tasks in `RepositoryState.claimedTasks`. Fast, no filesystem pollution. But doesn't persist across restarts and doesn't coordinate with loops on other machines.

#### Server-side task assignment

The dustbucket server maintains task assignments. Loops request tasks from the server rather than scanning locally. More complex but handles distributed scenarios cleanly.

### Should loops share git operations?

#### Independent git operations per loop

Each loop does its own `git pull` and `git push`. Simple but may create conflicts. The existing conflict resolution mechanism would need to handle the increased conflict rate.

#### Coordinated git access

Serialize git operations across loops. Before any loop runs `git pull` or `git push`, it acquires a lock. Prevents conflicts but adds synchronization overhead and potential deadlocks.

#### Pull-before-push with retry

Each loop pulls before starting and pushes after completing. If push fails due to conflict, pull and retry. This is similar to the current approach but may need more retries with parallel loops.

### How should the TUI display multiple loops?

#### Single status showing busiest loop

Show 'busy' if any loop is busy, 'idle' if all are idle. Simple, but loses information about parallelism.

#### Show count of active/total loops

Display like "2/3 active" to show how many loops are running. Informative but takes more space.

#### Expand repository row to show per-loop status

Make the repository row expandable to show details of each loop. Rich information but complicates the TUI implementation.
