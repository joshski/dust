# Block repositories on persistent check failures

After implementing pre-flight checks in the loop, add a mechanism to stop burning iterations when agents repeatedly fail to fix checks.

## Context

The loop now runs `dust check` before spawning agents and assigns "fix the checks" sessions when checks fail. However, if an agent repeatedly fails to fix the same problem, iterations are wasted.

## Proposed Design

### Consecutive Failure Counter

Track consecutive check-fix failures per repository:

1. After a check-fix agent session, re-run `dust check` to verify the fix
2. If checks still fail, increment a per-repository consecutive failure counter
3. After N consecutive failures (2-3), block the repository
4. A successful iteration (checks pass, real work happens) resets the counter to 0

### Bucket Mode

- Server tracks the counter per repository
- After N failures, server blocks the repo — stops sending `task-available` and sets `hasTask: false`
- A `blocked?: string` field on `RepositoryListItem` surfaces the reason (e.g., `'checks_failed'`)
- Unblocking: when the server receives a push webhook for a blocked repo, it clears the blocked state

### Standalone Loop Mode

- Track failures locally in the loop
- After N consecutive check-fix failures, exit with a clear error message indicating human intervention is needed
