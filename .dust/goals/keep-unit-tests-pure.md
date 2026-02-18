# Keep Unit Tests Pure

Unit tests (those run very frequently as part of a tight feedback loop) should be pure and side-effect free. A test is **not** a unit test if it:

- Accesses a database
- Communicates over a network
- Touches the file system
- Cannot run concurrently with other tests
- Requires special environment setup

"Unit tests" here means tests run frequently during development — not system tests, which intentionally exercise the full stack including I/O. Pure unit tests exercise only business logic, not infrastructure.

The value of pure unit tests is that they are fast, deterministic, and isolate business logic from infrastructure concerns. When unit tests pass but integration or system tests fail, developers can immediately narrow the problem to the boundary layer — a diagnostic "binary chop" that accelerates debugging.

## Migration Guidance

Where existing tests are impure (e.g. they spawn processes, write temporary files, or make network calls), prefer converting them to use in-memory alternatives — stubs, fakes, or dependency-injected doubles — rather than leaving them as-is. Opportunistic migration is fine; a big-bang rewrite is not required.

## Parent Goal

- [Make Changes with Confidence](make-changes-with-confidence.md)

## Sub-Goals

- (none)
