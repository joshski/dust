# Progressive Output for dust check

Replace dot-based `dust check` progress with deterministic, progressive per-check output that appears as each declared check becomes displayable.

## Context

`dust check` currently runs configured checks in parallel by default and emits `.` once per second while waiting (`lib/cli/commands/check.ts`). It buffers each check's output and only prints status lines after all checks finish.

The current model hides useful intermediate feedback for slow check sets. Users see liveness (`...`) but not which checks have completed until the end.

The implementation already preserves deterministic final ordering for displayed results by flattening results as built-in lint first (when `.dust/` exists), then configured checks in declaration order.

## Current Behavior

- `check()` starts an interval that writes progress dots to `stdoutInline`/`stdout`.
- Checks execute in parallel unless `--serial` is set.
- `runSingleCheck()` emits command events immediately on start/pass/fail, but CLI output waits.
- `displayResults()` prints all statuses and failure output only after every check resolves.

Relevant tests:
- `lib/cli/commands/check.test.ts` asserts dot-based progress output.
- Event-emission tests already tolerate non-deterministic ordering in parallel mode.

## Idea

Keep parallel execution, but change terminal output so checks are displayed progressively in a deterministic declared order.

Suggested behavior:
- Track completion state for each check in declared display order.
- When any check completes, flush all newly contiguous completed checks from the current display cursor.
- Print each flushed check's status line immediately.
- If a flushed check failed, print its command/output/hints immediately after that check's status block.
- Keep the final summary line (`✓ x/y checks passed` or `✗ x/y checks passed`) once all checks complete.

This gives earlier actionable feedback while preserving deterministic output for logs and humans.

## Design Notes

Possible implementation shape in `lib/cli/commands/check.ts`:
- Replace the unconditional progress-dot interval with completion-triggered rendering.
- Maintain an ordered `CheckResult | pending` list based on final display order.
- Add a helper that flushes completed entries from `nextDisplayIndex` while contiguous.
- Reuse existing formatting logic from `displayResults()` by extracting per-check rendering helpers.

## Principle Alignment

- [Fast Feedback Loops](../principles/fast-feedback-loops.md): surfaces useful check outcomes sooner.
- [Slow Feedback Coping](../principles/slow-feedback-coping.md): replaces low-signal dots with actionable progress.
- [Unsurprising UX](../principles/unsurprising-ux.md): keeps deterministic order while improving visibility.

## Open Questions

### How should built-in `dust lint` participate in display ordering?

#### Option: Keep `dust lint` first (current behavior)

Preserves existing mental model and current output ordering guarantees when `.dust/` exists.

#### Option: Only order configured checks, and show built-in lint separately

Treat built-in lint as system metadata and avoid forcing it into user-declared order semantics.

### Should progress dots be removed entirely?

#### Option: Remove dots once progressive status output exists

Cleaner output and less noise if progressive completion lines provide enough liveness.

#### Option: Keep dots only until first check result is displayable

Retains immediate liveness for long first checks while still transitioning to higher-signal output.

### When a check fails, should full failure output be printed immediately or deferred?

#### Option: Print failure details immediately with that check

Maximizes fast diagnosis and matches the goal of progressive actionable feedback.

#### Option: Print only status progressively and keep detailed failure output at the end

Keeps streaming output concise and preserves the current final-report reading pattern.
