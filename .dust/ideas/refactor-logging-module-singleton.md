# Refactor logging module singleton

`lib/logging/index.ts` uses four mutable module-level variables to implement a lazy-initialized global logging service. The variables (`patterns`, `initialized`, `activeFileSink`, `ownedDustLogFile`) plus a `fileSinkCache` Map form a singleton. A `_reset()` function exists solely for tests to undo this global state between runs.

This is the clearest singleton in the codebase. It conflicts directly with the [Dependency Injection](../goals/dependency-injection.md) goal: "testing requires mocking those globals—which introduces hidden coupling, complicates test setup, and risks interference between tests."

## Possible approach

Encapsulate the logging state in a class or factory function. Instantiate it once at the CLI entry point and pass it as a dependency. Remove the `_reset()` escape hatch — tests would create their own logger instance instead.

## Open Questions

### Should the logger be a class instance or a factory-returned object?

#### Option: Class instance
A `Logger` class with `enable()`, `enableFileLogs()`, and `createLogger()` methods. State lives on the instance.

#### Option: Factory-returned plain object
A `createLoggingService()` factory that returns an object with the same methods, closing over the state. More consistent with the codebase's preference for functions over classes.
