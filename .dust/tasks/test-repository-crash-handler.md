# Test Repository Crash Handler

Write a unit test that exercises the defensive `.catch()` handler on `runRepositoryLoop()` in `startRepositoryLoop()`.

## Context

The function `startRepositoryLoop()` in `lib/bucket/repository.ts:101-110` chains a `.catch()` handler to the loop promise:

```typescript
.catch(error => {
  const message = error instanceof Error ? error.message : String(error)
  log(`loop crashed for ${repoState.repository.name}: ${message}`)
  appendLogLine(
    repoState.logBuffer,
    createLogLine(`Repository loop crashed: ${message}`, 'stderr')
  )
})
```

This handler catches errors that escape the loop's internal error handling. It's currently excluded from coverage. A test can exercise this path by injecting dependencies that cause `runRepositoryLoop()` to throw or reject.

## Implementation

Add a test case to `lib/bucket/repository.test.ts` that:

1. Creates test dependencies where the `run` function or another dependency throws synchronously or rejects during loop initialization (before the internal try/catch takes over)
2. Calls `startRepositoryLoop()` with these dependencies
3. Waits for the promise chain to settle
4. Asserts that the crash error is logged to the repo's log buffer

After the test passes, remove the `v8 ignore` comments.

## Principles

- [Unit Test Coverage](../principles/unit-test-coverage.md)
- [Stubs Over Mocks](../principles/stubs-over-mocks.md)
- [Dependency Injection](../principles/dependency-injection.md)

## Blocked By

(none)

## Definition of Done

- [ ] Test exercises the `.catch()` handler in `startRepositoryLoop()` at lines 101-110
- [ ] `v8 ignore` comments are removed from those lines
- [ ] `bin/dust check` passes with 100% coverage
