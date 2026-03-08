# Commit-gate task retries

When a task fails, don't retry it until a new commit lands on the branch. If nothing has changed since the last attempt, retrying the same task on the same SHA is likely to produce the same failure.

## Context

The `dust loop claude` and `dust bucket` loops currently retry failed tasks immediately (with only a 10-second sleep in bucket mode). This creates a failure mode where:

1. A task fails (e.g., because of a rate limit, a flaky dependency, or an impossible requirement)
2. The loop picks the same task again on the next iteration
3. The codebase hasn't changed, so the same failure occurs
4. This repeats indefinitely, generating thousands of junk sessions

This was observed in production on 2026-03-06/07 when a Codex rate limit caused ~6,800 sessions to be created for 3 tasks on `dobiedad/ordra` — each session lasting ~1.2 seconds before failing with the same error.

The loop already does a `git pull` at the start of each iteration. After a failed task, the loop could record the HEAD commit SHA and skip that task until the SHA changes (indicating someone pushed a fix or new context).

## Related ideas

- [Abort infinite loops](abort-infinite-loops.md) — complementary; abort-infinite-loops counts consecutive failures, this idea prevents retries until the codebase changes
- [Run dust check before starting agent session](run-dust-check-before-starting-agent-session.md) — pre-flight checks catch some failures earlier, but don't address rate limits or provider errors
- [Bucket dead loop recovery](bucket-dead-loop-recovery.md) — handles loop death; commit-gating prevents the loop from needing to die

## Implementation Considerations

The core mechanism: after a task fails, record `{ taskFile, commitSha }` in memory. Before picking a task, filter out any task whose last failure was on the current HEAD SHA.

This could live in `runOneIteration` (loop.ts) — after `git pull`, get the current SHA, then pass it to `findUnblockedTasks` as a filter. Or keep the filter in the loop layer itself, wrapping the task selection.

For bucket mode, the `task-available` WebSocket signal already triggers a `wakeUp` which re-runs the iteration. A new push (new SHA) would naturally trigger this signal, unblocking the stalled task.

## Open Questions

### Should failed tasks be skipped entirely, or just deprioritized?

#### Skip until new commit (recommended)

Don't attempt the task at all until HEAD changes. Simple, prevents the tight loop. If there are other unblocked tasks, those can still run. If the failed task was the only one, the loop goes idle until a push arrives.

#### Deprioritize with exponential backoff

Still retry, but with increasing delays (10s, 30s, 2min, 10min, ...). This handles cases where the failure is transient (e.g., a rate limit that clears after an hour). More complex and still burns some resources.

### What about transient errors vs permanent errors?

#### Treat all failures the same

Any non-zero exit gates the task until a new commit. Simple, but rate limits and network errors might resolve on their own without a code change.

#### Classify errors and gate only permanent ones

Parse the error output to distinguish "rate limit" (transient) from "task impossible" (permanent). Transient errors use exponential backoff; permanent errors gate on commit SHA. More nuanced but requires maintaining error classification logic.

### Should the gate persist across loop restarts?

#### In-memory only (recommended)

The gate resets when the loop process restarts. This is simple and avoids stale state. If someone restarts the loop, they probably want a fresh attempt.

#### Persist to disk

Write the gate state to a file (e.g., `.dust/.task-gates.json`). Survives restarts but needs cleanup logic and could prevent tasks from running after legitimate fixes if the file isn't cleared.
