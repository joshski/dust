# Per-repository credit system

Each repository has a number of "iteration credits" that limit how many agent sessions can run. The `dust loop` and `dust bucket` commands pause when credits are exhausted. The remote (bucket) service can replenish credits or grant infinite credits to a repository.

## Context

Currently, `dust loop claude` (`lib/loop/loop.ts`) uses a `maxIterations` parameter to cap the number of iterations before exiting. This is a local safeguard against runaway loops but doesn't provide external control. The `dust bucket` command (`lib/cli/commands/bucket.ts`) runs repositories indefinitely via the loop in `lib/bucket/repository-loop.ts` — there's no per-repository limit mechanism.

A credit system would:

1. **Enable remote throttling**: The bucket service could allocate credits to repositories based on billing, priority, or resource availability
2. **Support pay-per-use models**: Organizations could purchase iteration credits rather than paying per-seat or per-month
3. **Provide usage visibility**: Credit consumption becomes a clear metric for tracking agent activity
4. **Allow graceful pausing**: When credits run out, the repository pauses rather than terminating, preserving state for when credits are replenished

### Relevant code

- `lib/loop/loop.ts` — `runLoop()` has `maxIterations` counter; credits would be a similar mechanism but externally managed
- `lib/bucket/repository-loop.ts` — `runRepositoryLoop()` runs indefinitely while `!repoState.stopRequested`; would need to check credits before each iteration
- `lib/bucket/repository.ts` — `RepositoryState` type; credit balance would be stored here
- `lib/bucket/events.ts` — Event protocol for WebSocket communication; credit updates would use this channel
- `.dust/config/settings.json` — Local settings; initial credit allocation could be a setting

### Related ideas

- [Send events to dust bucket host in dust loop](send-events-to-dust-bucket-host-in-dust-loop.md) — Establishing authenticated bucket communication that credits would use
- [Abort infinite loops](abort-infinite-loops.md) — Another iteration-limiting mechanism, focused on detecting stuck tasks
- [Bucket dead loop recovery](bucket-dead-loop-recovery.md) — Handles loop failures; credit exhaustion is a controlled pause, not a failure

## Open Questions

### Where should credit state be stored?

#### Store credits only in the bucket service (remote-first)

The bucket service is the source of truth. When `dust loop` or `dust bucket` starts, it queries the service for current credits. Each iteration decrements the remote balance. This ensures consistency across multiple machines running the same repo but requires connectivity.

#### Store credits locally with periodic sync

Keep a local credit balance that's periodically synced with the remote. Allows offline operation (until credits run out) but introduces consistency challenges if the same repo runs on multiple machines.

#### Store credits in the repository itself

Add a `.dust/credits.json` or similar file. Simple but doesn't support remote control — the bucket service would need to commit changes to adjust credits.

### How should `dust loop` (without bucket) handle credits?

#### Skip credit checks in standalone mode

The existing `maxIterations` parameter is sufficient for local use. Credits only apply when connected to the bucket service. This keeps standalone operation simple.

#### Support local credit files

Allow `.dust/config/settings.json` to specify an initial credit balance that decrements locally. Useful for self-imposed limits without bucket service.

#### Require bucket connection for credit-limited operation

If you want credit limits, use `dust bucket` or configure `dust loop` to connect to a bucket host. This keeps the credit system centralized.

### What happens when credits are exhausted?

#### Pause and wait for replenishment

The loop sleeps (with exponential backoff) and periodically checks if credits have been restored. Repository state is preserved. This is the gentlest approach.

#### Exit cleanly with a specific status code

Exit with a code like `3` (distinct from error or success) indicating credit exhaustion. External tooling can handle restart logic. Simple for `dust loop`; for bucket mode, the repo would need to be re-added.

#### Notify and require manual restart

Log a clear message and stop. Don't automatically resume even if credits are replenished. This gives maximum control but requires human intervention.

### Should different iteration types cost different credits?

#### All iterations cost one credit

Simple accounting. Sleep iterations (no tasks available) don't cost credits since Claude doesn't run. Task iterations and git-conflict resolutions each cost one credit.

#### Weight by actual resource consumption

Track token usage or wall-clock time and deduct proportionally. More accurate for billing but significantly more complex to implement and predict.

#### Allow configurable credit costs per iteration type

The bucket service could configure that git-conflict iterations cost 0.5 credits while task iterations cost 1. Flexible but adds configuration surface.

### How should infinite credits be represented?

#### Special sentinel value (e.g., -1 or `Infinity`)

A negative or infinite credit balance means unlimited. Simple check: `if (credits < 0 || credits > 0) proceed()`. Risk of accidental misuse if someone sets credits to -1 meaning "deduct one."

#### Separate boolean flag (`unlimitedCredits: true`)

Explicit flag that overrides the numeric balance. Clear intent, no sentinel value confusion.

#### Absence of credit field means unlimited

If the repository has no credit balance configured, it runs unlimited. Credits only apply when explicitly set. This maintains backward compatibility.

### Should credit changes be pushed or pulled?

#### Push: Bucket service sends credit updates over WebSocket

When credits are added or the balance changes, the service sends a message. The loop updates its local state immediately. Requires active WebSocket connection.

#### Pull: Loop queries balance before each iteration

Before running an iteration, the loop checks the current balance. More requests but no push infrastructure needed. Could cache with short TTL.

#### Hybrid: Push for updates, pull on reconnection

Normal operation uses push notifications. After reconnection (or on startup), query the current balance to catch up on missed updates.

### How should this interact with the bucket service billing model?

#### Credits are a separate billable resource

Organizations purchase credit packs. The bucket service tracks balance and deducts per iteration. Straightforward commerce model.

#### Credits are derived from subscription tier

A "Pro" subscription grants 1000 credits/month, "Enterprise" gets unlimited. No direct credit purchase; credits refill on billing cycle.

#### Credits are informational only (soft limits)

Credits track usage for visibility but don't actually block execution. Useful for awareness without hard enforcement. Billing happens separately based on actual usage.
