# Flaky Tests Audit

Add a stock audit that identifies timing-dependent test assertions and suggests more deterministic approaches.

## Context

This audit is designed for **downstream users of dust** running the audit in their own repositories. It should provide general guidance applicable to arbitrary codebases, not assume any specific testing infrastructure or utilities.

Tests commonly become flaky through:
- **Fixed sleeps**: Using `setTimeout()` or `sleep()` with arbitrary delays instead of waiting for specific conditions
- **Race conditions**: Multiple async operations where outcome depends on relative timing
- **Event ordering assumptions**: Tests that assume events fire in a specific order without explicit synchronization
- **Missing synchronization**: Assertions on eventually-consistent state without polling or waiting
- **Timing assumptions**: Test setup that depends on microtask/macrotask queue ordering
- **Integration test timing**: Tests with real timing that could benefit from mocked/controlled time

The audit should detect these patterns and suggest deterministic alternatives, adapting recommendations to what's available in the target codebase.

## Proposed Audit

Add a stock audit named `flaky-tests` that reviews test files for timing-dependent patterns that static linting can't reliably catch.

This audit should be implemented as a template in `lib/audits/stock-audits.ts` following the same pattern as other stock audits (`data-access-review`, `coverage-exclusions`). The template guides agents to explore test files, identify flaky patterns, and create ideas for remediation.

### Scope

Focus on these areas:

1. **Event ordering assumptions** - Tests that assume events fire in a specific order without explicit synchronization
2. **Missing `waitFor()` usage** - Assertions on eventually-consistent state without polling
3. **Race conditions** - Multiple async operations where outcome depends on relative timing
4. **Integration tests with `realSleep()`** - Could these use `TimeEmulator` for faster, deterministic execution?
5. **Implicit timing dependencies** - Test setup that depends on microtask/macrotask queue ordering
6. **Process/subprocess tests** - Event emission timing in child process mocks

### Analysis Steps

#### 1. Fixed Sleep Detection

Search for fixed delay patterns in test files:
1. `setTimeout()`, `sleep()`, or framework-specific delay functions with hardcoded durations
2. Comments like "wait for X ms" or "give it time to settle"
3. Retry logic with fixed delays between attempts

Flag these as prime candidates for condition-based waiting instead of arbitrary delays.

#### 2. Event Ordering Review

For tests using event emitters or callbacks:
1. Search for patterns like `emitter.emit('event')` followed by immediate assertions
2. Check if events are properly scheduled asynchronously
3. Verify tests wait for events (via promises or polling) rather than assuming synchronous propagation
4. Flag tests asserting on event-driven state without synchronization

Example pattern to look for:
```typescript
// Potentially flaky
emitter.emit('event')
expect(state.changed).toBe(true) // May not have propagated yet

// More deterministic approaches:
// Option 1: Promise-based
await new Promise(resolve => emitter.on('event', resolve))
expect(state.changed).toBe(true)

// Option 2: Polling-based (if available)
await waitUntil(() => state.changed === true)
```

#### 3. Async Assertion Opportunities

Search for assertions on eventually-consistent state:
1. Assertions on state modified by async operations without awaiting
2. Polling with manual `while` loops and fixed delays
3. Comments mentioning "eventually" or "should become"
4. Integration test retries or manual delay logic

Suggest condition-based waiting utilities (custom or from testing frameworks).

#### 4. Race Condition Detection

Look for tests with multiple concurrent async operations:
1. Tests calling multiple promises without `Promise.all()` or ordering guarantees
2. State mutations from different async contexts without synchronization
3. Cleanup in `afterEach()`/`afterAll()` that might run before async operations complete
4. Shared state between tests without proper reset

Flag tests where outcome depends on which operation finishes first.

#### 5. Subprocess and Child Process Tests

Review tests using child processes or spawned commands:
1. Check that tests wait for process completion (exit/close events)
2. Look for race conditions between stdout/stderr events and exit events
3. Verify cleanup doesn't assume synchronous process termination
4. Check for proper async event handling

Suggest promise-based wrappers or event-to-promise utilities for cleaner async handling.

#### 6. Framework-Specific Patterns

If common testing frameworks are detected, check for framework-specific anti-patterns:
- **React**: Missing `act()` wrappers around state updates
- **Vue**: Not awaiting `nextTick()` after reactive changes
- **Playwright/Puppeteer**: Using hardcoded `page.waitForTimeout()` instead of `waitForSelector()`
- **Cypress**: Incorrect use of `.then()` or not leveraging built-in retry logic

#### 7. Time-Dependent Logic

Search for tests that rely on wall-clock time:
1. Tests using `Date.now()`, `new Date()`, or `performance.now()` without mocking
2. Assertions on timing precision or duration
3. Tests that may fail near midnight, month boundaries, or DST changes

Suggest time mocking utilities or design changes to inject time dependencies.

### Output Format

Create idea files for findings following the standard dust idea format. Each idea should include:

- **Title**: Descriptive name indicating the test file and issue (e.g., "Flaky Test: Auth Service Race Condition")
- **Summary**: Brief description of the flaky pattern detected
- **Context**:
  - Test file location and line numbers
  - Flakiness category (fixed sleep, race condition, event ordering, etc.)
  - Code excerpt showing the timing dependency
- **Proposed solution**:
  - Specific refactoring approach (condition-based waiting, proper synchronization, etc.)
  - Before/after code examples when applicable
  - Alternative approaches if multiple viable solutions exist
- **Related work**: Link to relevant testing utilities or patterns in the codebase

Adapt recommendations based on what's available in the target repository:
- If polling utilities exist (e.g., `waitFor`, `waitUntil`), suggest using them
- If time mocking is available (e.g., Jest fake timers, Sinon fake timers), recommend it for time-dependent tests
- If framework-specific helpers exist (e.g., React Testing Library's `waitFor`), prefer those
- Otherwise, suggest implementing simple polling helpers or promise-based patterns

### Applicability

This audit applies to codebases with:
- Async operations (promises, callbacks, event emitters)
- Subprocess or child process testing
- Integration tests with external timing
- Event-driven architectures

If the codebase has no async tests or only trivial synchronous tests, document that finding and skip detailed analysis.

## Research Findings

Industry research (2026) reveals key insights about flaky tests:

1. **Root causes**: Nearly 50% of flakiness stems from async waits—tests using fixed sleep timers instead of condition-based polling. Other major causes include resource contention, environment instability, shared state, and unreliable third-party services.

2. **Detection threshold**: Tests with <95% pass rate in CI require investigation. Tracking pass/fail rates as structured data helps identify patterns and root causes.

3. **Retry strategies**: Best practice is capping retries at 2-3 attempts with explicit logging. Retries should rerun the same test without code/environment changes.

4. **Prevention over detection**: Choosing frameworks with built-in auto-wait (e.g., Playwright) prevents the #1 root cause before it happens. Stable locators (data-test attributes) prevent UI change brittleness.

5. **Organizational patterns**: Microsoft's "fix within 2 weeks or remove" policy achieved 18% flakiness reduction in 6 months. AI-assisted repair (FlakyGuard, ASE 2025) can fix 47.6% of reproducible flaky tests with 51.8% developer acceptance.

6. **Race conditions in testing**: Testing with 100x expected concurrency reveals race conditions that may not appear under normal load. Stress testing should include slow network conditions, rapid user input, and multiple concurrent operations.

7. **Testing anti-patterns**: Common issues include assuming synchronous event propagation, asserting on async state without waiting, cleanup running before async operations complete, and implicit microtask/macrotask queue ordering.

These findings inform the audit's focus areas and suggest that combining static analysis (this audit) with execution metrics (pass/fail tracking) provides the most comprehensive flakiness detection.

## Blocked By

(none)

## Definition of Done

- Detected fixed sleep/delay patterns in test files
- Reviewed test files for event ordering assumptions
- Identified assertions on eventually-consistent state without synchronization
- Found tests with race conditions between concurrent operations
- Checked subprocess/child process tests for proper async event handling
- Detected framework-specific anti-patterns (if applicable frameworks found)
- Identified time-dependent logic without mocking
- Created ideas for any flaky patterns identified, with context-appropriate remediation suggestions
- No changes to files outside `.dust/`

## Related Work

**Dust principles aligned with this audit**:
- `environment-independent-tests.md` - Tests must produce same result regardless of where they run
- `test-isolation.md` - Tests should not interfere with one another
- `reproducible-checks.md` - Every check must produce the same result regardless of who runs it, when, or on what machine
- `fast-feedback-loops.md` - Flaky tests slow feedback by requiring re-runs and investigation

**Similar stock audits**:
- `coverage-exclusions` - Reviews test-related code for improvement opportunities
- `data-access-review` - Identifies performance issues (some race conditions appear as data access patterns)

## Open Questions

### Should this audit run on system tests?

#### Option: Include system tests

System tests in `/system-tests/` intentionally test end-to-end workflows and may legitimately use `realSleep()` for external process coordination. Include them in the audit but apply different standards (e.g., flag arbitrary sleep durations but allow documented timing needs).

#### Option: Exclude system tests

Focus only on unit/integration tests in `lib/**/*.test.ts`. System tests are expected to have some timing dependencies and reviewing them may create noise. Skip `/system-tests/` entirely.

#### Option: Separate system test review

Create ideas for both approaches: one audit for unit/integration tests (stricter), one for system tests (pragmatic).

### Should the audit suggest specific `waitFor()` patterns?

#### Option: Prescriptive suggestions

For each finding, include exact code showing how to replace timing assumptions with `waitFor()`. More helpful but requires deeper analysis.

#### Option: General guidance

Point to existing `waitFor()` usage examples and let implementers adapt. Faster audit but may lead to inconsistent fixes.

### Should this become a lint rule?

#### Option: Extend lint rule for pattern detection

Add detection for common flaky patterns (e.g., immediate assertions after `emit()`) to the existing `no-fixed-sleep-in-tests` rule. Catches issues at development time. Challenging for semantic patterns beyond syntactic checks.

#### Option: Audit-only

Keep as audit for human/agent review. Lint rules are good for clear violations but flakiness often requires context and judgment.

#### Option: Hybrid approach

Lint rule for clear syntactic patterns (e.g., `emit()` followed by assertion on same line), audit for semantic review.

### How should findings be grouped in output ideas?

#### Option: One idea per test file

Create one idea file per test file that has flaky patterns, grouping all findings from that file together. Easier to implement fixes in a single context, but may mix different categories of flakiness.

#### Option: One idea per flakiness category

Create separate ideas for "Event Ordering Issues," "Race Conditions," "Missing waitFor()," etc., grouping findings by pattern type across all test files. Helps focus on specific remediation approaches, but may require jumping between files.

#### Option: One idea per finding

Create individual ideas for each flaky pattern detected. Maximum granularity and traceability, but could create noise if many patterns are found. Aligns with the "Small Units" principle.

### Should the audit detect framework-specific anti-patterns?

#### Option: Framework-agnostic only

Focus on universal async/timing patterns that apply to any JavaScript/TypeScript codebase (promises, event emitters, timers). Works everywhere but may miss common framework-specific pitfalls.

#### Option: Include common framework patterns

Detect framework-specific anti-patterns for popular testing libraries (Jest, Vitest, Mocha) and UI frameworks (React Testing Library act(), Vue nextTick()). More helpful for typical projects, but requires framework detection logic.

#### Option: Configurable framework support

Allow `.dust/config/settings.json` to specify which frameworks to check for, with sensible defaults. Most flexible but adds complexity.

### How should the audit handle legitimate timing dependencies?

#### Option: Flag all timing dependencies

Report every timing-dependent pattern found, even if legitimately necessary. Agent/developer decides which are acceptable. Simple but may create noise and false positives.

#### Option: Smart filtering with context analysis

Analyze surrounding code and comments to detect legitimate timing needs (e.g., testing timeout behavior, external service integration). Only flag suspicious patterns. More helpful but requires sophisticated analysis.

#### Option: Severity levels

Categorize findings as Critical (likely flaky), Warning (potentially flaky), or Info (timing dependency exists but may be intentional). Allows prioritization while surfacing all patterns.

### Should findings include test execution metrics?

#### Option: Metrics-enhanced findings

If the codebase has test execution history (CI logs, test reports), include pass/fail rates and timing variance for flagged tests. Helps prioritize based on actual flakiness observed. Requires test history infrastructure.

#### Option: Static analysis only

Focus purely on code patterns without execution data. Works everywhere regardless of CI setup, but can't distinguish between theoretical and actual flakiness.

### How should the audit adapt to codebase-specific testing utilities?

#### Option: Detect and use existing utilities

Search for common utility names (`waitFor`, `waitUntil`, `poll`, `eventually`) and adapt recommendations to use what's already available. Most helpful but requires pattern matching logic.

#### Option: Suggest standard patterns

Always recommend standard promise-based patterns or common library solutions (e.g., "add a polling utility like `waitFor`"). Consistent but may duplicate existing utilities.

#### Option: Framework-first approach

Prioritize framework built-ins (Jest's `waitFor`, Testing Library's `waitFor`, Playwright's auto-wait) over custom utilities. Aligns with ecosystem best practices but may miss good custom solutions.
