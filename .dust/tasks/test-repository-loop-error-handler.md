# Test Repository Loop Error Handler

Write a unit test that exercises the defensive error handler in `runRepositoryLoop()` that catches unexpected errors from `runOneIteration()`.

## Context

The function `runRepositoryLoop()` in `lib/bucket/repository-loop.ts:272-288` contains a catch block that handles unexpected errors:

```typescript
} catch (error) {
  const msg = error instanceof Error ? error.message : String(error)
  log(`iteration error for ${repoName}: ${msg}`)
  appendLogLine(
    repoState.logBuffer,
    createLogLine(`Loop error: ${msg}`, 'stderr')
  )
  await sleep(10000)
  continue
}
```

This error handler is currently excluded from coverage. A test can exercise this path by injecting a stub `run` function that throws an error.

## Implementation

Add a test case to `lib/bucket/repository-loop.test.ts` that:

1. Creates test dependencies with a `run` function that throws an error
2. Calls `runRepositoryLoop()` with these dependencies
3. Asserts that the error is logged to the repo's log buffer
4. Verifies the loop continues after the error (waits 10s then retries)

The test should use the existing dependency injection pattern in the file. After the test passes, remove the `v8 ignore` comments.

## Principles

- [Unit Test Coverage](../principles/unit-test-coverage.md)
- [Stubs Over Mocks](../principles/stubs-over-mocks.md)
- [Dependency Injection](../principles/dependency-injection.md)

## Blocked By

(none)

## Definition of Done

- [ ] Test exercises the catch block in `runRepositoryLoop()` around lines 272-288
- [ ] `v8 ignore` comments are removed from those lines
- [ ] `bin/dust check` passes with 100% coverage
