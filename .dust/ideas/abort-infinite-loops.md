# Abort infinite loops

If a repository becomes corrupted or misconfigured, a loop may keep running iterations but never complete any tasks. After several iterations with no deleted tasks, kill the loop or disable the repository.

## Context

The `dust loop claude` command (`lib/loop/loop.ts`) and `dust bucket` (`lib/bucket/repository-loop.ts`) both run continuous loops that:

1. Sync with remote (`git pull`)
2. Check for available tasks via `findUnblockedTasks`
3. Run Claude to implement the first available task
4. Repeat

Task completion is implicit: if the task file no longer exists after an iteration, the task is considered complete. There's no explicit tracking of whether tasks are actually being deleted.

This creates a failure mode where:
- A repository has tasks that exist but cannot be completed (corrupted format, impossible requirements, cyclic blockers, etc.)
- Claude runs, does work, but the task file remains
- The loop continues indefinitely, consuming resources without making progress

This relates to [Kill inactive process in dust loop claude](kill-inactive-process-in-dust-loop-claude.md) but addresses a different failure mode. That idea handles Claude processes that become completely unresponsive. This idea handles loops where Claude runs to completion but fails to make meaningful progress.

The [Stop the Line](../principles/stop-the-line.md) principle applies here: detecting a problem early and halting rather than continuing to waste resources.

## Proposed Implementation

### Detection Mechanism

Track the task file path selected at each iteration. If the same task file is picked N consecutive times without being deleted, the loop is stuck.

The existing `runOneIteration` function in `lib/loop/iteration.ts` picks the first task from `findUnblockedTasks` and returns a result type (`ran_claude`, `claude_error`, etc.). The calling code in `lib/loop/loop.ts` already tracks iterations. Add state to track:

1. The path of the last-picked task
2. A consecutive failure counter for that task

After each iteration where the agent ran (`ran_claude` or `claude_error`):
1. Check if the task file still exists
2. If it's the same task as the previous iteration and still exists, increment the counter
3. If a different task was picked or the task was deleted, reset the counter
4. If the counter reaches the threshold (3), abort

### Abort Behavior

When the threshold is reached:

1. Run `git reset --hard` to discard any partial changes
2. Log a clear message explaining why the loop was aborted, including the stuck task path
3. Exit with a non-zero status code (standalone) or stop the repository loop (bucket mode)

Both standalone loop and bucket mode use the same detection and abort logic. For bucket mode, stopping one repository's loop is equivalent to the standalone loop exiting - other repositories continue running.

### Events

Emit a new event type when aborting:

```typescript
interface LoopAbortedEvent {
  type: 'loop.aborted'
  reason: 'stuck_task'
  taskPath: string
  consecutiveFailures: number
}
```

This provides visibility for monitoring and debugging. The event is local-only (not sent over the wire), consistent with other `LoopEvent` types.

## Resolved Questions

### What threshold should trigger the abort?

**Decision:** Fixed iteration count (e.g., 3 consecutive failures)

A simple threshold that's easy to implement and reason about. Three consecutive failures gives the agent a fair chance to complete legitimately difficult tasks while catching infinite loops quickly.

### What counts as "no progress"?

**Decision:** Track whether the same task file is picked consecutively and still exists after the iteration.

The existing event system provides what's needed:
- `agent-session-started` includes the task title and prompt
- After the iteration, check if the task file still exists using the file system

This is more precise than total task count comparison and handles the specific failure mode of a single stuck task.

### Should the abort be different in bucket mode vs standalone loop?

**Decision:** Same behavior in both

Both modes use the same detection logic and abort by stopping the loop. For bucket mode, this means the repository's loop stops but other repositories continue. This keeps the implementation simple and consistent.

### Should there be a `git reset --hard` when aborting?

**Decision:** Yes, reset to clean state

When aborting due to infinite loop, run `git reset --hard` to discard any partial changes. This aligns with the [inactivity timeout](kill-inactive-process-in-dust-loop-claude.md) behavior and ensures a clean repository state. Sandboxed environments (per [Autonomous Agents Need Sandboxes](../facts/autonomous-agents-need-sandboxes.md)) make this safe.

## Open Questions

### Should stuck detection interact with the "abandon tasks" mechanism?

#### Treat as independent mechanisms

The stuck detection aborts the entire loop. The abandon mechanism is guidance for Claude within a single iteration. These solve different problems: abandon handles Claude recognizing a task is too hard; stuck detection handles Claude not recognizing this.

#### Stuck detection triggers forced abandon

After 3 stuck iterations on the same task, automatically create a blocking task that describes the problem ("This task has failed 3 consecutive times") and add it as a blocker. This uses the existing mechanism but adds automation. The task could then be picked up on the next `git pull` if someone pushed a fix for the underlying issue.

### Should the bucket server be notified when a loop aborts?

#### Emit event locally only

The `loop.aborted` event is local-only like other `LoopEvent` types. The bucket server learns about the issue indirectly through the agent session ending or the repository becoming inactive.

#### Send a wire event to the bucket server

Add a new wire event type `repository-stuck` that the bucket server can act on. This enables server-side monitoring and potentially automatic actions (disabling the repository, notifying the user, etc.).
