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
- [Block repositories on persistent check failures](block-repositories-on-persistent-check-failures.md) — pre-flight checks catch some failures earlier; blocking prevents burning iterations on unfixable check failures
- [Bucket dead loop recovery](bucket-dead-loop-recovery.md) — handles loop death; commit-gating prevents the loop from needing to die

## Implementation Considerations

### Gate Data Structure

The gate is a `Map<taskPath, commitSha>` recording the SHA at which each task last failed. Tasks are filtered before selection: if `failedSha === currentSha`, skip the task.

### Getting the Current SHA

`gitPull` in `lib/loop/git-pull.ts` currently returns only success/failure. It needs to be extended to return the HEAD SHA after pulling, or a separate `getHeadSha` function is needed. The SHA is then passed through the iteration so the gate can be checked.

### Loop Layer Changes

The gate state lives in the loop layer (`runLoop` for standalone, `runRepositoryLoop` for bucket mode). After each iteration:

1. If result is `claude_error`, record `{ taskPath: lastTaskPath, sha: currentSha }` in the gate
2. If result is `ran_claude` (success), clear that task from the gate (if present)
3. Before task selection, filter out gated tasks

The filtering can happen either:
- In `runOneIteration` by passing the gate state and current SHA
- In the loop layer by wrapping `findAvailableTasks` results

Keeping the filter in the loop layer (option 2) is simpler since the gate state already lives there.

### Bucket Mode Integration

For bucket mode, `task-available` WebSocket signals trigger `wakeUp()` which restarts the iteration. A push event naturally triggers this signal. After a pull, if the SHA changed, previously gated tasks become eligible again. The gate clears naturally.

## Resolved Questions

### Should failed tasks be skipped entirely, or just deprioritized?

**Decision:** Skip until new commit

Don't attempt the task at all until HEAD changes. Simple, prevents the tight loop. If there are other unblocked tasks, those can still run. If the failed task was the only one, the loop goes idle until a push arrives.

### What about transient errors vs permanent errors?

**Decision:** Treat all failures the same

Any non-zero exit gates the task until a new commit. Simple. Rate limits and network errors might resolve on their own, but requiring a new commit (even a no-op commit) is an acceptable trade-off for simplicity.

### Should the gate persist across loop restarts?

**Decision:** In-memory only

The gate resets when the loop process restarts. This is simple and avoids stale state. If someone restarts the loop, they probably want a fresh attempt.

## Open Questions

### Should gated tasks be visible in events or logs?

#### Emit a loop event

Add a new `loop.task_gated` event containing the task path and the SHA at which it failed. This provides visibility for monitoring and debugging, consistent with other `LoopEvent` types.

#### Log internally only

Use the existing debug logger (`createLogger('dust:loop:iteration')`) without emitting a user-visible event. Keeps the event stream clean but makes debugging harder without enabling debug logs.

#### Include in existing no_tasks handling

When all tasks are gated, treat this as a `no_tasks` result but include the gated task paths in the event or log message. Reuses existing code paths but may conflate "no tasks exist" with "tasks exist but are gated."

### How should the gate interact with abort-infinite-loops?

#### Complementary mechanisms

Commit-gating prevents immediate retries; abort-infinite-loops catches tasks that fail repeatedly across multiple commits. The abort counter tracks failures regardless of SHA, so a task that fails on commit A, then again on commit B (after a push), would increment toward the abort threshold. These solve different problems.

#### Commit-gating makes abort unnecessary

If a task is gated until a new commit, it can only fail once per SHA. The abort mechanism becomes relevant only if someone pushes many commits that all fail the same task — an unlikely scenario. Consider simplifying to commit-gating only.

#### Abort counter resets on new SHA

Track abort counter per-SHA rather than globally. A task failing 3 times on the same SHA aborts; a new commit resets the counter. This combines both ideas but adds complexity.
