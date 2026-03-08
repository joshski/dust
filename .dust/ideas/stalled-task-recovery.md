# Stalled task recovery

Detect and recover from tasks failing multiple times on the same commit SHA. When a task is repeatedly executed without making progress, mark it as "stalled" and take corrective action rather than silently retrying forever.

## Context

A task is "stalled" when the agent keeps attempting it but the underlying problem can't be solved by the agent alone. This is distinct from:

- **A hard task** that takes multiple iterations but makes progress each time (commits, partial changes)
- **A transient failure** that resolves on its own (rate limits, network issues)
- **An infinite loop** where the loop itself is broken (covered by [Abort infinite loops](abort-infinite-loops.md))

A stalled task is one where the agent completes (or crashes) quickly, produces no commits, and the same task file remains. The root cause is typically external: a provider rate limit, a missing credential, an impossible requirement, or a dependency that's down.

The [commit-gate task retries](commit-gate-task-retries.md) idea prevents tight retry loops, but doesn't help the user understand what happened or take action. This idea adds visibility and recovery mechanisms on top of that.

## Recovery strategies

### Notify the user

When a task is detected as stalled (e.g., 3 failures on the same SHA), emit an event that the server can surface to the user. In dustbucket, this could appear as a banner on the session UI: "Task X has stalled — last error: rate limit exceeded."

### Create a blocking diagnostic task

Automatically create a new task file (e.g., `.dust/tasks/diagnose-stalled-<task>.md`) that blocks the original task. The diagnostic task describes what went wrong and asks the agent (or user) to investigate. This uses the existing blocker mechanism to prevent further retries while preserving the original task for later.

### Pause and wait for external signal

In bucket mode, mark the repository as "stalled" and stop the loop. When the server receives a push webhook (indicating someone may have fixed the problem), unblock the repository. This is similar to the `checks_failed` blocking in [Run dust check before starting agent session](run-dust-check-before-starting-agent-session.md).

## Related ideas

- [Commit-gate task retries](commit-gate-task-retries.md) — prevents the tight retry loop; stalled-task-recovery adds visibility and user-facing recovery
- [Abort infinite loops](abort-infinite-loops.md) — aborts after N consecutive failures; stalled recovery is a gentler alternative that preserves the task
- [Bucket dead loop recovery](bucket-dead-loop-recovery.md) — recovers from loop death; stalled recovery prevents the need to kill the loop
- [Per-repository credit system](per-repository-credit-system.md) — credits would naturally throttle stalled tasks, but don't provide diagnostic information

## Open Questions

### What threshold defines "stalled"?

#### N failures on the same SHA (recommended)

If a task has failed N times (e.g., 3) and HEAD hasn't changed between attempts, it's stalled. This is precise — it means the same code was tried multiple times with the same result.

#### N failures regardless of SHA

Count total consecutive failures across commits. Even if someone pushes a "fix" that doesn't actually fix the problem, the counter keeps incrementing. More aggressive but catches cases where pushes don't address the root cause.

### Should stalled tasks block other tasks in the same repo?

#### No, only the stalled task is affected

Other unblocked tasks continue to run normally. The stalled task is just skipped. This maximizes throughput but means the loop keeps running (and consuming resources) for other work.

#### Yes, pause the entire repo

If one task is stalled, something is likely wrong with the repo or environment. Pause everything until the stall is resolved. Safer but too aggressive if the stall is task-specific (e.g., one task needs an API key that's expired).

### How does the user recover from a stall?

#### Push a new commit

The simplest recovery: fix the problem and push. The new SHA clears the commit gate, and the task is retried. Works naturally with existing git workflows.

#### Manual signal via CLI

Add a `dust unstall <task>` command (or similar) that clears the stall state for a specific task. Useful when the fix is external (e.g., renewing an API key) and doesn't require a code change.

#### Automatic retry after cooldown

After marking a task as stalled, schedule a retry after a longer cooldown (e.g., 1 hour). If the problem was transient (rate limit), it may resolve. If not, the task stalls again after one more attempt. This adds complexity but handles the "rate limit that clears after 30 minutes" case.
