# Test Determinism Audit

Add a stock audit that reviews tests and creates ideas to make tests more deterministic.

## Context

Test determinism is a prerequisite for reliable continuous integration and agent-driven development. Non-deterministic tests that pass and fail unpredictably erode trust in the test suite and slow down development by forcing developers to re-run tests or investigate false failures.

The codebase already has strong principles around test determinism:
- Environment-Independent Tests (.dust/principles/environment-independent-tests.md:3)
- Test Isolation (.dust/principles/test-isolation.md:1)
- Keep Unit Tests Pure (.dust/principles/keep-unit-tests-pure.md:1)
- Reproducible Checks (.dust/principles/reproducible-checks.md:1)

However, there's no systematic audit to find tests that violate these principles or could be improved for better determinism.

## Determinism Issues to Detect

A test determinism audit should identify:

1. **Time-dependent tests** - Tests using `Date.now()`, `new Date()`, or `Date()` without stubbing or injection
2. **Randomness** - Tests using `Math.random()`, `crypto.randomBytes()`, or `uuid()` without seeding or stubbing
3. **Environment variable dependencies** - Tests reading `process.env` directly instead of using `stubEnv` or dependency injection
4. **File system pollution** - Tests writing to temp directories without cleanup, or assuming specific working directories
5. **Execution order dependencies** - Tests that rely on shared state or execution order
6. **Network/timing sensitivity** - Tests using real timers (`setTimeout`, `setInterval`) instead of fake timers
7. **Platform-specific behavior** - Tests assuming specific OS, filesystem layout, or line endings

## Current State

The codebase has several patterns that support test determinism:
- `lib/test-support/test-utilities.ts` provides `stubEnv` and test doubles
- Tests like `lib/loop/sleep.test.ts:5` inject dependencies to avoid real timers
- Tests like `lib/bucket/native-io.test.ts:10` use test doubles for I/O operations
- Tests like `lib/bucket/log-buffer.test.ts:45` control timestamps by passing explicit values

However, a grep through test files shows:
- 14 test files reference `Date.now()` or `new Date()`
- 15 test files use `setTimeout`, `setInterval`, or `randomUUID`
- 15 test files reference `tmpdir` or temp file operations

Not all of these are determinism issues (some tests properly stub dependencies), but they warrant systematic review.

## Proposed Audit

Add a stock audit named `test-determinism` in `lib/audits/stock-audits.ts`.

The audit should:
1. Search test files for potential determinism issues
2. For each finding, evaluate whether it's properly controlled
3. Create ideas for tests that need refactoring

Output per finding should include:
- Test file and location
- Type of determinism issue (time, randomness, environment, filesystem, etc.)
- Current pattern being used
- Recommended refactoring approach (stubbing, dependency injection, test doubles)

## Open Questions

### Should this audit target all tests or just unit tests?

#### Option: Unit tests only

Focus on tests that should be pure and fast. Exclude integration tests and exploratory tests that intentionally exercise I/O. Benefits: cleaner scope, aligns with "Keep Unit Tests Pure" principle.

#### Option: All tests with contextual guidance

Audit all tests but provide different guidance based on test type. Unit tests should be pure; integration tests can use I/O but should still avoid time/randomness issues. Benefits: comprehensive coverage, catches determinism issues in all test types.

### Should time-based testing patterns be detected statically or dynamically?

#### Option: Static analysis via grep/AST

Search for patterns like `Date.now()`, `Math.random()`, etc. Flag all occurrences for manual review. Benefits: fast, comprehensive, no false negatives. Drawbacks: requires manual filtering of properly-stubbed cases.

#### Option: Dynamic analysis via test runs

Run tests multiple times with different seeds/dates and detect flakiness. Benefits: catches actual non-determinism, not just potential issues. Drawbacks: slow, complex to implement, may miss issues that only surface under specific conditions.

#### Option: Hybrid approach

Use static analysis to identify candidates, then provide guidance for manual verification (checking for stubs, dependency injection, etc.). Benefits: balances speed and accuracy.

### Should this audit create ideas for lint rules?

#### Option: Create ideas for automated lint rules

For patterns that can be detected statically (e.g., `Date.now()` in test files without corresponding stub), propose custom lint rules. Benefits: prevents new determinism issues from being introduced.

#### Option: Keep audit as manual review

Focus on identifying issues and creating refactoring ideas, but don't propose lint automation. Benefits: simpler scope, avoids over-engineering for one-time issues.

### How should dependency injection patterns be evaluated?

#### Option: Flag any direct dependency usage

Flag all uses of `Date.now()`, `process.env`, etc. regardless of whether they're injected. Let reviewers verify injection. Benefits: comprehensive, no false negatives.

#### Option: Recognize common injection patterns

Parse test code to detect when functions accept time/env as parameters or when test doubles are used. Benefits: fewer false positives, less manual review needed. Drawbacks: more complex implementation, may miss uncommon patterns.
