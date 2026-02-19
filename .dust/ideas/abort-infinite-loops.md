# Abort infinite loops

If a repository becomes corrupted or misconfigured, a loop may keep running iterations but never complete any tasks. After several iterations with no deleted tasks, kill the loop or disable the repository.

## Context

The `dust loop claude` command (`lib/cli/commands/loop.ts`) and `dust bucket` (`lib/bucket/repository.ts`) both run continuous loops that:

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

The [Stop the Line](../principles/stop-the-line.md) goal applies here: detecting a problem early and halting rather than continuing to waste resources.

## Implementation Considerations

The detection mechanism needs to track whether task files are being deleted across iterations. Possible approaches:

- **Before/after task count comparison**: At iteration start, record which task files exist. At iteration end, check if any were deleted. This requires minimal state but doesn't distinguish between "task completed" and "task file corrupted and unreadable."

- **Track specific task file across iterations**: If the same task file is picked N times in a row without being deleted, that specific task is stuck. This is more precise but requires tracking state across iterations.

- **Track total progress over time window**: If the total task count doesn't decrease over N iterations, something is wrong. This handles the case where different tasks keep getting picked but none complete.

For bucket mode, the response to detecting an infinite loop could be:
- Stop the repository's loop but keep other repos running
- Emit an event (`bucket.repository_stuck`) for external monitoring
- Flag the repository for human review

For standalone `dust loop claude`, the response could be:
- Exit with a non-zero status code
- Log a clear message explaining why the loop was aborted

## Open Questions

### What threshold should trigger the abort?

#### Fixed iteration count (e.g., 3 consecutive failures)

A simple threshold: if 3 consecutive iterations run Claude but the picked task isn't deleted, abort. This is easy to implement and reason about. The risk is false positives when tasks are legitimately hard and take multiple iterations. The current "abandon tasks that are too hard" mechanism could interact here.

#### Configurable via settings.json

Add a `maxConsecutiveStuckIterations` setting. Projects with complex tasks could set a higher threshold. This adds configuration surface but accommodates different workflows.

#### No iteration limit, only time-based

Instead of counting iterations, track wall-clock time with no progress. A loop running for hours with no completions is clearly stuck regardless of how many iterations ran. This is robust to variation in task complexity but harder to configure meaningfully.

### What counts as "no progress"?

#### Same task file exists after iteration

The simplest check: did the task we just worked on get deleted? If not, that's one "stuck" count. This is precise but may miss cases where the loop alternates between multiple stuck tasks.

#### Total task count unchanged

If there were N tasks before the iteration and still N tasks after, no progress was made. This catches the alternating-stuck-tasks case but could false-positive if a new task was created while an old one was deleted.

#### Same tasks exist (set comparison)

Track the set of task file paths. If the set is identical before and after the iteration, no progress was made. This handles new tasks being created but is more complex to track.

### Should the abort be different in bucket mode vs standalone loop?

#### Same behavior in both

Both modes abort after the same threshold. For bucket mode, stopping one repository's loop is equivalent to the standalone loop exiting. This is simpler to implement and reason about.

#### Bucket mode disables the repository; standalone loop exits

In bucket mode, a repository could be marked as "disabled" rather than fully removed. The loop stops but the repository state remains, allowing human review of what went wrong. The server could be notified and potentially re-enable the repo after intervention.

#### Bucket mode retries after cooldown

When a bucket repository is detected as stuck, stop the loop for a cooldown period (e.g., 10 minutes), then try again. Someone might have pushed a fix in the meantime. This is more resilient but risks burning resources on a persistently broken repo.

### Should stuck detection interact with the "abandon tasks" mechanism?

#### Treat as independent mechanisms

The stuck detection aborts the entire loop. The abandon mechanism is guidance for Claude within a single iteration. These solve different problems: abandon handles Claude recognizing a task is too hard; stuck detection handles Claude not recognizing this.

#### Stuck detection triggers forced abandon

After N stuck iterations on the same task, automatically create a blocking task that describes the problem ("This task has failed N consecutive times") and add it as a blocker. This uses the existing mechanism but adds automation. The risk is generating unhelpful blocker tasks if Claude genuinely can't diagnose the problem.

### Should there be a `git reset --hard` when aborting?

#### Yes, reset to clean state

When aborting due to infinite loop, run `git reset --hard` to discard any partial changes. This aligns with the inactivity timeout behavior and ensures a clean repository state.

#### No, preserve changes for debugging

Stuck loops may leave useful diagnostic information in the uncommitted changes. Resetting discards this. Alternatively, stash the changes before aborting so they can be reviewed later.
