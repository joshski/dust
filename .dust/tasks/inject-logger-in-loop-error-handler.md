# Inject logger in loop error handler

Refactor `runTask()` in `lib/cli/commands/loop.ts` to accept a logger dependency. The error handler (lines 408-422) has a log statement wrapped in `/* v8 ignore */` because `log()` is a no-op when `DEBUG` is unset.

## Requirements

1. Add an optional `logger` parameter to the `runTask()` function signature
2. Use the injected logger (defaulting to the current `log` function) for the error log statement
3. Update tests to inject a mock logger and verify the error is logged
4. Remove the `/* v8 ignore */` block once coverage is achieved

## Implementation Notes

- The `runTask` function is already well-structured for dependency injection (uses options object)
- Follow the existing pattern of optional dependencies that default to production implementations
- Keep the change minimal - only extract the single log statement that is currently ignored

## Principles

- [Dependency Injection](../principles/dependency-injection.md)
- [Comprehensive Test Coverage](../principles/comprehensive-test-coverage.md)

## Blocked By

(none)

## Definition of Done

- [ ] `runTask()` accepts an optional logger dependency
- [ ] Error handler uses the injected logger
- [ ] Test verifies the log statement is called with expected arguments
- [ ] `/* v8 ignore */` block on lines 410-414 is removed
- [ ] `bin/dust check` passes
