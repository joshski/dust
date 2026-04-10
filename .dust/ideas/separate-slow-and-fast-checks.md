# Separate Slow and Fast Checks

Allow users to categorise each check as `"fast"` or `"slow"` so that dust can run different subsets of checks depending on the context.

## Background

Checks are configured in `.dust/config/settings.json` as an array of `{ name, command }` objects with optional `hints` and `timeoutMilliseconds` fields. All checks currently run together as a single pipeline — there is no mechanism to distinguish checks that complete quickly (milliseconds to a few seconds) from those that are slow (tens of seconds or more, e.g. integration tests, full builds, type checking across large codebases).

In the loop (`lib/loop/iteration.ts`), `dust check` runs as a pre-flight step before each agent task session. If any check is slow, every iteration pays that cost — including iterations where the agent is doing incremental work and only fast feedback is needed. This conflicts with the [Fast Feedback Loops](../principles/fast-feedback-loops.md) principle, which emphasises that the write-check-iterate loop should be as fast as possible, especially for agents operating in tight loops.

The [Keep Unit Tests Pure](../principles/keep-unit-tests-pure.md) principle already recognises the distinction between fast, pure unit tests and slower integration/system tests. This idea extends that thinking to the broader `dust check` configuration.

## Proposal

Add a `speed` field to the `CheckConfig` type:

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

Dust could then expose something like `dust check --fast` to run only fast checks during tight implementation loops, while `dust check` (or `dust check --all`) continues to run everything.

## Relevant Context

- Current `CheckConfig` type is defined in `lib/cli/types.ts` and validated in `lib/config/settings.ts`
- The loop pre-flight runs `${dustCommand} check` as a shell command (`lib/loop/iteration.ts:222`)
- `dust check` prints per-check status lines progressively in deterministic order (parallel execution by default)
- The loop already has a check-fix agent that spawns when checks fail — the speed distinction would affect how that agent is triggered

## Open Questions

### How should uncategorised checks be treated?

#### Option A: Uncategorised checks are treated as fast

Existing configurations work without changes. Any check without a `speed` field runs in fast mode. Users only need to explicitly mark checks they want to exclude from fast runs.

#### Option B: Uncategorised checks are treated as slow

Forces users to explicitly opt in to fast mode for each check. Safer default (no check is accidentally excluded from slow runs), but requires migration effort and is a breaking change for existing configs.

#### Option C: Uncategorised checks run in both modes

Checks without a `speed` field always run, regardless of which mode is requested. This makes `--fast` strictly additive — fast mode runs uncategorised checks plus fast checks, slow mode runs everything. Simple mental model but may defeat the purpose if many checks are uncategorised.

### What should the `dust check` command name be for fast-only checks?

#### Option A: `dust check --fast` flag

Runs only fast checks. `dust check` with no flags runs all checks. Fits the existing CLI pattern (`dust check` is already documented in `dust help`).

#### Option B: `dust check fast` subcommand

Treats speed as a positional argument. Feels more command-like but is unusual for dust's verb-noun CLI pattern.

#### Option C: Two separate commands: `dust check` (fast) and `dust check all`

Inverts the default — `dust check` runs only fast checks, and users must explicitly opt in to run everything. Optimises for the most common case (tight loop) but is a breaking change for existing integrations.

### Should the loop use fast checks by default?

#### Option A: Loop always runs fast checks only

The loop orchestration layer automatically runs `dust check --fast` before each agent session. Full checks (`dust check`) run only at explicit milestones (e.g. before push). This maximises loop speed but risks accumulating slow-check failures across many iterations.

#### Option B: Loop runs all checks, but users can configure it

The loop continues to run `dust check` (all checks) by default. A new loop configuration option (e.g. `preflight: "fast"`) allows users to opt in to fast-only pre-flight checks.

#### Option C: Loop configures checks per phase

The loop runs fast checks before each implementation session and all checks before each push (or at a configurable milestone). This matches the natural distinction between the inner loop (implement → commit) and the outer loop (push → review).

### Should the `speed` field support more than two values?

#### Option A: Binary: `"fast"` | `"slow"`

Simple, covers the primary use case. Most projects only need two tiers.

#### Option B: Numeric priority or time budget

Users specify an expected duration or tier number. More flexible but adds complexity and requires users to know how long their checks take.

#### Option C: Named groups (arbitrary string labels)

`speed` becomes a tag or group name (e.g. `"pre-commit"`, `"pre-push"`, `"ci-only"`). More flexible than binary, allows `dust check --group pre-commit`. Aligns with how some CI systems model check stages.
