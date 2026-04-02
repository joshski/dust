# Implement Test Determinism Audit

Add a `test-determinism` stock audit that searches unit test files for determinism issues and creates ideas for tests that need refactoring. This is the "imperative shell" that orchestrates file search, invokes the detection logic, and produces output.

## Context

With the functional core for determinism detection in place, this task implements the audit command. The audit should search unit test files, apply the detector, and create idea files for issues found.

The audit follows existing patterns from other stock audits like `data-access-review` and `coverage-exclusions`.

## Principles

### Functional Core, Imperative Shell

Separate code into a pure "functional core" and a thin "imperative shell." The core takes values in and returns values out, with no side effects. The shell handles I/O and wires things together.

Purely functional code makes some things easier to understand: because values don't change, you can call functions and know that only their return value matters—they don't change anything outside themselves.

The functional core contains business logic as pure functions that take values and return values. The imperative shell sits at the boundary, reading input, calling into the core, and performing side effects with the results. This keeps the majority of code easy to test (no mocks or stubs needed for pure functions) and makes the I/O surface area small and explicit.

### Keep Unit Tests Pure

Unit tests (those run very frequently as part of a tight feedback loop) should be pure and side-effect free. A test is **not** a unit test if it:

- Accesses a database
- Communicates over a network
- Touches the file system
- Cannot run concurrently with other tests
- Requires special environment setup

"Unit tests" here means tests run frequently during development — not system tests, which intentionally exercise the full stack including I/O. Pure unit tests exercise only business logic, not infrastructure.

The value of pure unit tests is that they are fast, deterministic, and isolate business logic from infrastructure concerns. When unit tests pass but integration or system tests fail, developers can immediately narrow the problem to the boundary layer — a diagnostic "binary chop" that accelerates debugging.

### Environment-Independent Tests

Tests must produce the same result regardless of where they run. A test that passes locally but fails in CI (or vice versa) is a broken test.

Concretely, tests should never depend on:
- Ambient environment variables (e.g. `CLAUDECODE`, `CI`, `HOME`)
- The current working directory or filesystem layout of the host machine
- Network availability or external services
- The identity of the user or agent running the tests

When a function's behavior depends on environment variables, the test must explicitly control those variables (via `stubEnv`, dependency injection, or passing an `env` parameter) rather than relying on whatever happens to be set in the current shell.

### Test Isolation

Tests should not interfere with one another. Each test must be independently runnable and produce the same result regardless of execution order or which other tests run alongside it.

This means:
- No shared mutable state between tests
- No reliance on test execution order
- No file system or environment pollution
- Each test sets up its own dependencies

Test isolation enables parallel execution, makes failures easier to diagnose, and prevents cascading false failures when one test breaks.

### Dependency Injection

Avoid global mocks. Dependency injection is almost always preferable to testing code that depends directly on globals.

When code depends on global state or singletons, testing requires mocking those globals—which introduces hidden coupling, complicates test setup, and risks interference between tests. Dependency injection makes dependencies explicit: they're passed in as arguments, making the code's requirements visible and enabling tests to supply controlled implementations.

This approach improves testability (each test controls its own dependencies), readability (dependencies are declared upfront), and flexibility (swapping implementations doesn't require changing the consuming code). It also makes refactoring safer since dependencies are explicit rather than implicit.

### Comprehensive Test Coverage

A project's test suite is its primary safety net, and agents depend on it even more than humans do. When agents modify code, they rely on tests to catch regressions immediately. Comprehensive test coverage ensures that agents get fast feedback about whether their changes work correctly.

Aim for complete test coverage of the codebase. Every meaningful code path should have corresponding tests.

## Guidance

### Audit Template Structure

Follow the pattern from existing audits in `lib/audits/stock-audits.ts`:

1. Function returns markdown template string
2. Include the standard `ideasHint` at the top
3. Define clear scope and analysis steps
4. Include "Applicability" section (this applies to codebases with unit tests)
5. Definition of Done with specific checklist items

### Search Strategy

The audit should:
1. Search for unit test files (`*.test.ts`, `*.test.js`, excluding system/exploratory tests)
2. Read each test file and run the detector
3. Group findings by test file
4. Create idea files for tests needing refactoring

### Output Format

For each issue found, the idea should include:
- Test file path and line number
- Issue category (time, randomness, environment, etc.)
- Current problematic pattern
- Recommended refactoring approach
- Link to relevant principle

### Integration Point

Add the new audit to the `stockAudits` export in `lib/audits/stock-audits.ts` alongside existing audits.

## Task Type

implement

## Blocked By

- [Implement Test Determinism Detector](implement-test-determinism-detector.md)

## Definition of Done

- Added `testDeterminism()` function to `lib/audits/stock-audits.ts`
- Function returns markdown template following existing audit patterns
- Template includes scope, analysis steps, applicability, and definition of done
- Template instructs agent to search unit test files and create ideas
- Template references the test determinism detector from previous task
- New audit added to `stockAudits` export array
- Manual test: `dust audit test-determinism` runs successfully
- `bin/dust check` passes
