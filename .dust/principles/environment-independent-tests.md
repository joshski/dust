# Environment-Independent Tests

Tests must produce the same result regardless of where they run. A test that passes locally but fails in CI (or vice versa) is a broken test.

Concretely, tests should never depend on:
- Ambient environment variables (e.g. `CLAUDECODE`, `CI`, `HOME`)
- The current working directory or filesystem layout of the host machine
- Network availability or external services
- The identity of the user or agent running the tests

When a function's behavior depends on environment variables, the test must explicitly control those variables (via `stubEnv`, dependency injection, or passing an `env` parameter) rather than relying on whatever happens to be set in the current shell.

## Parent Principle

- [Test Isolation](test-isolation.md)

## Sub-Principles

- (none)
