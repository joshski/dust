# Lint for test resource cleanup

Add a lint rule to detect tests that create resources without corresponding cleanup hooks.

## Background

Several test files in the codebase create resources that persist beyond test execution:

- `system-tests/bucket-worker-rpc.test.ts:51` - Creates temp directories with `mkdtempSync` but has no `afterEach`/`afterAll` cleanup
- `system-tests/proxy-command-events.test.ts` - Creates HTTP servers
- `system-tests/proxy-tool-execution.test.ts` - Creates HTTP servers

When tests create resources without cleanup:
- Temp directories accumulate in `/tmp`
- Servers may leave ports bound
- Processes may leak
- Flaky tests may arise from stale state

## Implementation Approach

Add a policy check to `lib/lint/policy-checker.ts` that:
1. Detects resource creation calls (`mkdtempSync`, `mkdirSync`, `createServer`, `spawn`) in test files
2. Checks for presence of `afterEach` or `afterAll` hooks in the same test suite
3. Reports violations when resources are created without cleanup hooks

The check would be scoped to `*.test.ts` files (matching the existing `no-unsafe-double-cast` pattern).

## Caveats

Not all resource creation needs cleanup:
- Test utilities may handle cleanup internally
- Some tests may intentionally rely on OS cleanup (temp files)
- `spawn` with `stdio: 'ignore'` often terminates naturally

The rule may need an escape hatch (comment directive or configuration) for intentional cases.

## Related

- [Biome Custom Rules](../facts/biome-custom-rules.md) - Describes the policy checker infrastructure
- [Test Isolation](../principles/test-isolation.md) - Tests should not interfere with one another
- [Environment-Independent Tests](../principles/environment-independent-tests.md) - Tests should be reproducible

## Open Questions

### How strict should the rule be?

#### Strict: flag any resource creation without cleanup

Flag all `mkdtempSync`, `mkdirSync`, `createServer`, `spawn` calls in test files unless an `afterEach`/`afterAll` hook exists. Errs on the side of caution but may produce false positives for well-designed test utilities.

#### Moderate: only flag direct calls in test functions

Only flag resource creation that appears directly inside `test()` or `it()` blocks, not in helper functions. Assumes helpers handle their own cleanup.

#### Lenient: require cleanup only for certain patterns

Only flag specific patterns known to be problematic (e.g., `mkdtempSync` without `rmSync` in cleanup). Reduces noise but may miss edge cases.

### Should the rule auto-detect test utilities that handle cleanup?

#### Yes, whitelist known utilities

Maintain a list of utility functions (like `createBucketServerEmulator`) that handle their own cleanup. Don't flag calls to these utilities.

#### No, keep it simple

Require explicit cleanup hooks even when using utilities. This documents the cleanup expectation and makes tests self-documenting.
