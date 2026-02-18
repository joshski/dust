# Check tasks are tackled in FIFO order

This idea explores whether tasks are being worked on in oldest-first order, as the system intends.

## Current Implementation

The `findUnblockedTasks()` function in `lib/cli/commands/next.ts` sorts tasks by file creation time (oldest first) using `getFileCreationTime()`. The `dust loop` command then picks `tasks[0]` - the oldest unblocked task. This design ensures FIFO ordering for autonomous loops.

However, `dust pick task` presents the ordered list to human-supervised agents who may choose any task. The instruction says "Pick ONE task" without mandating the first one.

## Observations from Commit History

The commit history shows some patterns worth noting:

1. **Duplicate commits**: Multiple "Add Idea" commits for the same idea (e.g., "Add Idea: dust next claude" appears twice with different authors). This suggests tasks may be created multiple times by different agents or processes.

2. **Workflow task patterns**: "Refine Idea", "Decompose Idea", and "Build Idea" commits follow the expected flow, but it's hard to verify FIFO ordering from commit messages alone since we don't see the task creation timestamps.

3. **Interleaved work**: Build/implementation work sometimes appears between "Add Idea" and "Add Idea" commits, which could indicate either proper FIFO ordering or out-of-order execution.

## What Would Violate FIFO?

A FIFO violation would occur when:
- An agent picks a newer task while older unblocked tasks exist
- Manual `dust pick task` is used and a human or agent selects a non-first task
- Task creation time metadata is unreliable (file copied vs created)

## Related Idea

The existing [Task priority](task-priority.md) idea proposes adding explicit priority levels, which would provide a more intentional ordering mechanism than relying on creation time alone.

## Open Questions

### Should `dust pick task` enforce FIFO ordering?

#### No, keep current behavior (display order only)

The current system presents tasks oldest-first but allows agents or humans to choose any task. This provides flexibility for context-sensitive decisions where a newer task might be more appropriate to tackle given current work. Forcing strict FIFO could be counterproductive when tasks have implicit dependencies not captured in "Blocked By".

#### Yes, only show the oldest unblocked task

Only presenting one task at a time would enforce FIFO but removes visibility into the backlog. This is how `dust loop` effectively works (picks tasks[0]). The downside is that agents lose context about what else is pending, which can be useful for planning.

#### Yes, but allow explicit override

Show tasks in FIFO order with a clear indication of which is "next", but allow explicit selection of others with justification. This balances predictability with flexibility but adds complexity to the workflow.

### How should we detect FIFO violations?

#### Analyze git history for task ordering

A post-hoc audit could compare task creation commits with task completion commits to identify out-of-order execution. This requires parsing commit messages and matching "Add task: X" with the implementation commit for X.

#### Add runtime logging to task selection

Log which task was presented first and which was actually selected. This would make violations visible in real-time but adds overhead and only works prospectively.

#### Trust the system and don't track

The current design intends FIFO ordering. If violations occur in `dust loop`, it's a bug to fix. If they occur in `dust pick task`, it's acceptable human/agent discretion. No additional tracking needed.
