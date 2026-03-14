# Bucket dead loop recovery

When a repository loop exits in `dust bucket`, the repository becomes permanently dead with no recovery path. The remote service has no way to detect or restart it.

## Context

The `dust bucket` repository loop ([`lib/bucket/repository.ts:321`](../../lib/bucket/repository.ts)) runs `while (!repoState.stopRequested)`. If the loop exits for any reason other than `stopRequested` — an unhandled exception, a future "abort after N failures" mechanism, or any other early exit — the repository becomes a zombie:

1. The `loopPromise` resolves (or rejects), but nothing monitors it
2. The repository remains in `manager.repositories`, so `handleRepositoryList` (line 464) skips it on subsequent reconciliation: `if (!manager.repositories.has(name))` means the remote can't restart it by re-sending the same `repository-list`
3. The remote service has no visibility into the problem — there's no "loop died" event, no health check, no heartbeat

The only recovery path today is removing the repo from the remote's list (triggering cleanup) and then re-adding it (triggering a fresh clone and new loop). But since the remote doesn't know the loop died, it wouldn't know to do this.

This is especially relevant to [Run dust check before starting agent session](run-dust-check-before-starting-agent-session.md) and [Abort infinite loops](abort-infinite-loops.md), both of which propose exiting the loop under certain conditions. Without recovery, those features would leave repositories permanently stuck.

## Related Code

- [`lib/bucket/repository.ts:321-338`](../../lib/bucket/repository.ts) - The repository loop (`while (!repoState.stopRequested)`)
- [`lib/bucket/repository.ts:447-475`](../../lib/bucket/repository.ts) - `handleRepositoryList` which reconciles repos but skips already-known ones
- [`lib/bucket/repository.ts:415-442`](../../lib/bucket/repository.ts) - `removeRepositoryFromManager` which sets `stopRequested`
- [`lib/cli/commands/bucket.ts:537-573`](../../lib/cli/commands/bucket.ts) - WebSocket message handler that receives `repository-list`

## Implementation Considerations

The core problem has two parts: detecting a dead loop and restarting it.

**Detection** could happen by monitoring `loopPromise`. After each `repository-list` reconciliation (or on a timer), check whether any repo's `loopPromise` has settled unexpectedly (i.e., `stopRequested` is false but the promise is resolved/rejected). This is cheap — just `Promise.race` with an already-resolved sentinel.

**Restart** could re-invoke `runRepositoryLoop` with the existing repo state, or remove and re-add the repository for a clean start. Re-invoking is simpler but requires that the repo state is still valid after whatever caused the crash.

**Reporting** should emit a new event (e.g., `bucket.loop_died` or `bucket.repository_restarted`) so the remote service can track reliability.

## Open Questions

### Should dead loops be detected proactively or on reconciliation?

#### Check on every `repository-list` message

When the remote sends `repository-list`, check each known repo's `loopPromise`. If it has settled but `stopRequested` is false, restart it. This piggybacks on an existing trigger and adds no new timers. The downside is that detection is delayed until the next message from the remote, which could be infrequent.

#### Run a periodic health check timer

Poll all repos every N seconds to check if their `loopPromise` has settled unexpectedly. This detects problems quickly regardless of remote message frequency, but adds a timer and complexity.

#### Both

Check on reconciliation for reliability, plus a periodic timer for faster detection. Belt and suspenders.

### Should a dead loop restart automatically or require intervention?

#### Automatic restart with backoff

Restart the loop immediately, but track consecutive restarts. If the loop keeps dying (e.g., 3 restarts in 5 minutes), stop trying and emit an event for human intervention. This balances resilience with safety.

#### Automatic restart, no limit

Always restart. If the underlying cause is transient (a network blip, a one-off error), this is the most resilient option. But if the cause is persistent, this burns resources. Combined with the pre-flight check idea, repeated check failures would be the more likely persistent failure mode.

#### Never auto-restart, just report

Emit an event and let the remote service decide. This is the safest option and keeps the bucket agent simple, but requires the remote service to implement restart logic (remove + re-add the repo).

### Should recovery preserve or reset repository state?

#### Preserve state, restart loop in place

Keep `repoState` (log buffer, path, etc.) and just call `runRepositoryLoop` again. This is fast and preserves log history, but the repo state might be the reason the loop died.

#### Clean restart via remove + re-add

Call `removeRepositoryFromManager` then `addRepository`. This gets a fresh clone and clean state but is slower and loses log history.

#### Preserve state but reset git

Keep the `repoState` shell but run `git reset --hard origin/main && git clean -fd` before restarting the loop. This handles the case where corrupted working tree state caused the crash.
