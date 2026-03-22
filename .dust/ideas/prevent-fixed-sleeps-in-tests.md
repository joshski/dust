# Prevent fixed sleeps in tests

Add a lint rule to detect and fail on fixed-duration sleeps in test files.

## Background

Fixed-duration sleeps in tests cause intermittent failures because they rely on timing that varies across environments. Mozilla's [no-arbitrary-setTimeout](https://firefox-source-docs.mozilla.org/code-quality/lint/linters/eslint-plugin-mozilla/rules/no-arbitrary-setTimeout.html) rule documents this pattern: "Using arbitrary times for setTimeout may cause intermittent failures in tests."

The dust codebase already uses dependency injection for sleep in production code (e.g., `loop.test.ts` tests the sleep behavior via a stubbed `sleep` dependency). This pattern should be enforced more broadly.

## Current Usage in Dust

A review of test files shows two patterns:

1. **Zero-delay setTimeout** (`setTimeout(resolve, 0)`) — Used extensively to yield the event loop. This is acceptable because it doesn't introduce actual delays.

2. **Non-zero fixed delays** (`setTimeout(..., 10)`, `setTimeout(..., 10000)`) — Found in `bucket-worker.test.ts` for simulating keyboard input timing. These are potential flakiness sources.

## Implementation Options

### Option A: Policy checker rule

Add a rule to `lib/lint/policy-checker.ts` that:
- Detects `setTimeout` calls with non-zero numeric literals in `*.test.ts` files
- Detects `await sleep(N)` where N > 0
- Reports violations with guidance to use event-based waiting or injected dependencies

This follows the existing `no-vitest-mocking` and `no-unsafe-double-cast` patterns.

### Option B: Oxlint plugin rule

Add a rule to `lib/oxlint/plugins/dust.js` similar to `no-thin-delegate-wrappers`. This integrates with the existing oxlint infrastructure.

### Option C: ESLint no-restricted-syntax

Use the standard [no-restricted-syntax](https://eslint.org/docs/latest/rules/no-restricted-syntax) rule with a custom selector. However, this would require ESLint as an additional dependency.

## Related Ideas

- [Lint for test resource cleanup](./lint-for-test-resource-cleanup.md) — Another test-specific lint rule
- [Built in "agent-friendly" lints](./built-in-agent-friendly-lints.md) — Broader context for custom linting

## Related Principles

- [Environment-Independent Tests](../principles/environment-independent-tests.md) — Tests must produce the same result regardless of where they run
- [Test Isolation](../principles/test-isolation.md) — Tests should not interfere with one another
- [Reproducible Checks](../principles/reproducible-checks.md) — Every check must produce the same result

## Open Questions

### Where should the rule be implemented?

#### Policy checker (TypeScript AST)

Add to `lib/lint/policy-checker.ts` alongside existing rules. Uses TypeScript's AST for precise detection. Runs as part of `bun run scripts/lint/policy-checks.ts`.

#### Oxlint plugin (JavaScript)

Add to `lib/oxlint/plugins/dust.js`. Integrates with the primary linter. Runs as part of `bunx oxlint`.

### Should setTimeout(fn, 0) be allowed?

#### Yes, allow zero delays

Zero-delay setTimeout is a standard pattern for yielding the event loop and doesn't cause timing-related flakiness. Mozilla's rule explicitly permits this.

#### No, ban all setTimeout in tests

Even zero delays can hide synchronization issues. Tests should be fully synchronous or use explicit event-driven waiting.

### How should legitimate timing tests be handled?

#### Comment directive escape hatch

Allow `// eslint-disable-next-line dust/no-fixed-sleep` or equivalent for cases where timing is intentionally tested.

#### Whitelist specific test files

Maintain a list of files that genuinely need timing behavior (e.g., timeout tests). Less flexible but more discoverable.

#### Require injected time dependencies

No escape hatch. Tests that need timing must use dependency injection for time, making them deterministic.
