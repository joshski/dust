# Test Pyramid Audit

Add a stock audit that evaluates whether tests are optimally organized according to the test pyramid pattern.

## Background

The test pyramid is a model for organizing tests where a codebase should have:
- **Many fast unit tests** (base of pyramid) — pure, isolated, testing single units
- **Fewer integration tests** (middle) — testing interactions between components
- **Minimal end-to-end tests** (top) — slow, broad tests exercising full systems

Projects with an inverted pyramid (many slow, broad tests; few fast unit tests) suffer from slow feedback loops, flaky builds, and difficulty isolating failures. The [Fast Feedback Loops](../principles/fast-feedback-loops.md) principle explicitly promotes "unit tests over integration tests for speed."

## Relationship to Existing Audits

- **`slow-tests`** — Identifies individual slow tests. The pyramid audit is complementary: it analyzes the distribution of test types rather than individual test performance.
- **`test-coverage`** — Measures whether code is tested. The pyramid audit measures whether tests are appropriately categorized and balanced.
- **`agent-developer-experience`** — Reviews feedback loop speed. The pyramid audit provides specific guidance on achieving fast feedback through test organization.

## Proposed Audit

Add a stock audit named `test-pyramid` in `lib/audits/stock-audits.ts`.

Template focus:
1. Classify tests by type (unit, integration, end-to-end/system)
2. Measure the distribution of tests across categories
3. Identify tests miscategorized or in wrong locations
4. Flag anti-patterns like integration tests masquerading as unit tests

Analysis signals:
- Test file locations (e.g., `__tests__/unit/` vs `integration/` vs `e2e/`)
- Test dependencies (file system access, network calls, database connections, process spawning)
- Test execution time patterns
- Presence of mocking/stubbing vs real dependencies
- Test naming conventions

Required output per finding:
- Current test distribution (counts and percentages per category)
- Tests that appear miscategorized (e.g., "unit" tests with I/O)
- Specific files or directories to reorganize
- Recommendations for improving the pyramid shape

## Principle Alignment

- [Fast Feedback Loops](../principles/fast-feedback-loops.md) — Unit-heavy pyramids enable fast feedback
- [Keep Unit Tests Pure](../principles/keep-unit-tests-pure.md) — Defines what makes a test a "unit test"
- [Unit Test Coverage](../principles/unit-test-coverage.md) — Values unit tests for specific, fast feedback
- [Comprehensive Test Coverage](../principles/comprehensive-test-coverage.md) — Agents depend on tests; proper organization improves reliability
- [Design for Testability](../principles/design-for-testability.md) — Testable code enables unit tests; untestable code forces integration tests

## Open Questions

### How should tests be classified into pyramid tiers?

#### Classify by dependency analysis

Analyze test code for I/O operations (file system, network, database, process spawning). Tests with no I/O are unit tests; tests with I/O are integration or e2e. This is objective and automatable.

#### Classify by directory convention

Trust existing directory structure (e.g., `unit/`, `integration/`, `e2e/`). Report distribution based on location. Simpler but misses miscategorized tests.

#### Hybrid approach

Use directory conventions as primary classification, then flag tests that appear miscategorized based on dependency analysis. Provides both the overall picture and actionable findings.

### What constitutes a "healthy" pyramid shape?

#### Prescriptive ratios

Define target ratios (e.g., 70% unit, 20% integration, 10% e2e) and flag deviations. Provides clear guidance but may not fit all projects.

#### Descriptive reporting only

Report the current distribution without prescribing targets. Let teams decide what's healthy for their context. Avoids one-size-fits-all guidance but provides less actionable output.

#### Relative guidance

Flag obvious inversions (more e2e than unit tests) without prescribing exact ratios. Catches serious problems without being overly prescriptive.

### Should the audit account for test execution time distribution?

#### Include time analysis

Measure total execution time per tier, not just test count. A pyramid with 100 unit tests that take 10 seconds each and 10 e2e tests that take 1 second each has problems the count alone wouldn't reveal.

#### Count only

Focus on test counts. Time analysis overlaps with the existing `slow-tests` audit. Keep this audit focused on structural organization.
