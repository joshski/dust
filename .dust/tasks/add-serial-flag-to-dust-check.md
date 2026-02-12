# Add --serial flag to dust check

Add a `--serial` flag to `dust check` that runs checks sequentially instead of in parallel.

## Background

Currently, `dust check` runs all configured checks in parallel using `Promise.all()`. This maximizes speed for the common case but creates issues when:

- **Resource contention**: Multiple CPU-intensive checks compete for resources
- **Dependent checks**: Some checks implicitly depend on others (e.g., tests assume the build completed)
- **Debugging**: Serial execution makes it easier to correlate output with specific checks
- **Deterministic output**: CI logs are easier to read with predictable ordering

## Implementation

Modify `lib/cli/commands/check.ts`:

1. Accept a `--serial` flag via the command arguments
2. When `--serial` is passed:
   - Run the built-in `lint markdown` check first
   - Then run configured checks sequentially using a `for...of` loop instead of `Promise.all()`
3. Keep parallel execution as the default behavior

## Goals

- [Fast Feedback](../goals/fast-feedback.md) - Parallel remains the default for speed
- [Unsurprising UX](../goals/unsurprising-ux.md) - The `--serial` flag is a common CLI convention

## Blocked By

(none)

## Definition of Done

- [ ] `dust check --serial` runs checks sequentially
- [ ] `dust check` (without flag) continues to run checks in parallel
- [ ] Built-in lint markdown check runs first in serial mode
- [ ] Output format is consistent between parallel and serial modes
- [ ] Tests cover both parallel and serial execution paths
