# Implement Test Determinism Detector

Build the functional core for detecting test determinism issues. Create pure functions that analyze test code patterns to identify time dependencies, randomness, environment coupling, and other non-deterministic patterns.

## Context

Test determinism is essential for reliable CI and agent-driven development. The codebase has strong principles around test determinism but lacks systematic detection. This task implements the "functional core" - pure analysis functions that detect determinism issues without performing I/O.

The analysis should recognize common dependency injection patterns (parameters, test doubles) and flag only genuinely problematic cases. Focus on unit tests specifically, as these should be pure and side-effect free.

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

## Guidance

### Determinism Issues to Detect

The detector should identify these patterns in unit test files:

1. **Time dependencies** - `Date.now()`, `new Date()`, `Date()` without injection or stubbing
2. **Randomness** - `Math.random()`, `crypto.randomBytes()`, `randomUUID()` without seeding or stubbing
3. **Environment variables** - `process.env.*` access without `stubEnv` or injection
4. **File system operations** - `tmpdir()`, file writes/reads without cleanup or in-memory alternatives
5. **Real timers** - `setTimeout`, `setInterval` without fake timers
6. **Platform-specific behavior** - OS-dependent paths, line endings, or platform checks

### Injection Pattern Recognition

The detector should recognize these common patterns and NOT flag them:

1. **Parameter injection** - Functions accepting `now: Date`, `random: () => number`, `env: Record<string, string>`
2. **Test doubles** - Usage of stub functions passed as parameters
3. **Explicit stubbing** - Code using `stubEnv()` from test utilities
4. **Vitest fake timers** - Tests calling `vi.useFakeTimers()`

### Implementation Strategy

Create pure analysis functions in a new module (e.g., `lib/audits/test-determinism-detector.ts`):

- `detectDeterminismIssues(testFileContent: string, filePath: string): DeterminismIssue[]`
- Pattern matching functions for each issue type
- Helper to distinguish injected vs. global usage
- Type definitions for issue categories and recommendations

The module should export only pure functions with no side effects, no file I/O, and comprehensive unit test coverage.

## Task Type

implement

## Blocked By

(none)

## Definition of Done

- Created `lib/audits/test-determinism-detector.ts` with pure analysis functions
- `detectDeterminismIssues()` function accepts test file content and returns issues
- Pattern detection for: time, randomness, environment, filesystem, timers, platform
- Injection pattern recognition to reduce false positives
- Type definitions for `DeterminismIssue` with category, location, pattern, recommendation
- Comprehensive unit tests covering all detection patterns
- Tests verify false positives are avoided when injection patterns are present
- No I/O operations in detector module
- `bin/dust check` passes
