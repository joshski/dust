# Add Test Pyramid Audit

Add a `test-pyramid` stock audit to `lib/audits/stock-audits.ts`. The audit evaluates whether tests follow the test pyramid pattern.

## Background

The test pyramid model suggests:
- **Many fast unit tests** (base) — pure, isolated, testing single units
- **Fewer integration tests** (middle) — testing interactions between components
- **Minimal end-to-end tests** (top) — slow, broad tests exercising full systems

Projects with an inverted pyramid suffer from slow feedback loops and difficulty isolating failures.

## Implementation

### Test Classification

Determine test types by examining project structure. Common patterns include:

- **Directory conventions**: `unit/`, `integration/`, `e2e/`, or co-located tests vs `system-tests/`
- **Test runners**: Different runners for different types (e.g., vitest for unit, bun test for system)
- **Configuration**: Look at test config files for exclusions or separate setups

The audit should first identify how the specific project organizes tests, then classify accordingly.

### Time Analysis

Include execution time per tier, not just test count. A pyramid with 100 unit tests taking 10 seconds each and 10 e2e tests taking 1 second each has problems the count alone wouldn't reveal.

Guidance on obtaining timing:
- For vitest: `npx vitest run --reporter=json` provides per-test duration
- For jest: `jest --json` provides timing data
- For bun test: parse verbose output

### Output

The audit template should guide the agent to report:

1. **Test distribution** — counts and percentages per category
2. **Time distribution** — total execution time per tier
3. **Pyramid health** — flag obvious inversions (more e2e than unit tests, or more time in e2e than unit)
4. **Miscategorized tests** — tests that appear to be in the wrong tier based on their behavior (e.g., "unit" tests with I/O)
5. **Recommendations** — specific actions to improve the pyramid shape

### Relative Guidance

The audit should flag obvious problems without prescribing exact ratios. Examples:
- More end-to-end tests than unit tests
- More time spent in integration/e2e than unit tests
- Unit tests that perform I/O (process spawning, network calls, file system access)

## Functional Core Approach

Keep the audit template focused on analysis steps and output format. The template itself is a string returned by a pure function — no I/O in the audit definition.

## Principles

- [Fast Feedback Loops](../principles/fast-feedback-loops.md) — Unit-heavy pyramids enable fast feedback
- [Keep Unit Tests Pure](../principles/keep-unit-tests-pure.md) — Defines what makes a test a "unit test"
- [Unit Test Coverage](../principles/unit-test-coverage.md) — Values unit tests for specific, fast feedback
- [Design for Testability](../principles/design-for-testability.md) — Testable code enables unit tests; untestable code forces integration tests
- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md) — Keep audit definition pure

## Blocked By

(none)

## Definition of Done

- [ ] `test-pyramid` audit function exists in `lib/audits/stock-audits.ts`
- [ ] Function is registered in `stockAuditFunctions` map
- [ ] Audit template guides classification by examining project structure
- [ ] Audit template includes time analysis guidance
- [ ] Audit template uses relative guidance (flag inversions, not prescribe ratios)
- [ ] Audit template follows existing patterns in `stock-audits.ts`
- [ ] `bin/dust check` passes
