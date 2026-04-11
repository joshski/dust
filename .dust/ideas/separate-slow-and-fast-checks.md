# Separate Slow and Fast Checks

Allow users to categorise each check as `"fast"` or `"slow"` so that dust can run different subsets of checks depending on the context.

## Background

Checks are configured in `.dust/config/settings.json` as an array of `{ name, command }` objects with optional `hints` and `timeoutMilliseconds` fields. All checks currently run together as a single pipeline — there is no mechanism to distinguish checks that complete quickly (milliseconds to a few seconds) from those that are slow (tens of seconds or more, e.g. integration tests, full builds, type checking across large codebases).

In the loop (`lib/loop/iteration.ts`), `dust check` runs as a pre-flight step before each agent task session. If any check is slow, every iteration pays that cost — including iterations where the agent is doing incremental work and only fast feedback is needed. This conflicts with the [Fast Feedback Loops](../principles/fast-feedback-loops.md) principle, which emphasises that the write-check-iterate loop should be as fast as possible, especially for agents operating in tight loops.

The [Keep Unit Tests Pure](../principles/keep-unit-tests-pure.md) principle already recognises the distinction between fast, pure unit tests and slower integration/system tests. This idea extends that thinking to the broader `dust check` configuration.

## Proposal

Add a `speed` field (`"fast"` | `"slow"`) to the `CheckConfig` type in `lib/cli/types.ts`. Checks without a `speed` field are treated as fast.

```json
{
  "checks": [
    { "name": "lint", "command": "oxlint .", "speed": "fast" },
    { "name": "typecheck", "command": "tsc --noEmit", "speed": "fast" },
    { "name": "test", "command": "vitest run --testPathPattern=unit", "speed": "fast" },
    { "name": "integration", "command": "vitest run --testPathPattern=integration", "speed": "slow" },
    { "name": "build", "command": "npm run build", "speed": "slow" }
  ]
}
```

`dust check` runs fast and uncategorised checks only. `dust check all` runs everything. This means:

- Existing configs (no `speed` fields) continue to work: all checks are treated as fast, so `dust check` runs them all as before.
- Users who want to exclude slow checks from the tight loop mark them as `"slow"` and rely on `dust check all` for comprehensive validation.
- The loop's existing `${dustCommand} check` call (in `lib/loop/iteration.ts:222`) automatically becomes fast-only without any loop code changes.

The built-in `lint .dust directory` check (prepended in `lib/cli/commands/check.ts`) is always fast and always runs — it is not affected by the speed distinction.

## Open Questions

### Should the loop run slow checks at any point during automated iteration?

#### Option A: Never in the loop — user responsibility

With `dust check` now fast-only, slow checks are never run automatically by the loop. Users run `dust check all` at their own cadence (e.g. before push). Simple, no loop changes required.

#### Option B: Before each push milestone

The loop detects when an iteration includes a `git push` and runs `dust check all` before it. Slow checks run at the natural outer loop boundary without paying the cost on every iteration.

#### Option C: Configurable in loop settings

A new loop configuration option (e.g. `"slowChecks": "pre-push"` or `"slowChecks": "every-n-iterations"`) allows users to tune when slow checks run. More flexible but adds configuration complexity.

### Should the check-fix agent verify with fast or all checks?

#### Option A: Check-fix agent uses `dust check` (fast only)

When checks fail, the loop spawns a check-fix agent that currently runs `${dustCommand} check` to verify its fix (`lib/loop/iteration.ts:504–516`). With `dust check` fast-only, the agent verifies fast checks only. If a slow check originally failed, the loop re-encounters the failure on the next pre-flight. Simple — no special-casing in the fix prompt.

#### Option A: Check-fix agent uses `dust check` (fast only)

The agent fixes and verifies fast checks only. If a slow check originally failed, the loop will re-encounter the failure on the next iteration's pre-flight. Simple — no special-casing in the fix prompt.

#### Option B: Check-fix agent uses `dust check all`

The fix prompt instructs the agent to run `dust check all`. The agent verifies both fast and slow checks, fully resolving the failure before the next loop iteration. Slower fix cycle but fewer surprise failures.

#### Option C: Check-fix agent uses the same command that revealed the failure

If `dust check` (fast) reported the failure, use `dust check`. If `dust check all` reported the failure, use `dust check all`. Matches the context but requires the loop to thread this information into the fix prompt.
