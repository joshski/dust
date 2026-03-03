# Remove v8 ignore: Async Callback Internals

Refactor async callback code that v8 coverage doesn't track. Enable removal of v8 ignore comments and potentially the file-level exclusion in vitest.config.ts.

## Locations

1. `lib/cli/commands/bucket.ts:672-701` - Async callback internals in handleRepositoryList case. The `.then()` and `.catch()` handlers are not tracked by v8 coverage.

2. `lib/bucket/repository-loop.ts:321-330` - Codex path that mirrors claude path, tested in loop-codex.test.ts.

## v8 Limitation Context

From `.dust/facts/vitest-testing.md`: The v8 coverage provider does not honor `/* v8 ignore */` comments for function-level metrics on anonymous functions inside async callbacks. This file (`lib/cli/commands/bucket.ts`) is currently excluded at the file level in vitest.config.ts.

## Approach

1. Extract async callback internals to named, synchronous functions that can be tested directly
2. The async wrapper becomes a thin shell that calls the testable function
3. If successful, remove the file-level exclusion from vitest.config.ts

Example refactoring:
```typescript
// Before
handleRepositoryListFromRepo(repos, state, repoDeps, repoContext)
  .then(() => {
    // complex logic
  })

// After
function handleRepositoryListSuccess(state, repos, ...): void {
  // complex logic - now testable
}
// In the handler:
handleRepositoryListFromRepo(repos, state, repoDeps, repoContext)
  .then(() => handleRepositoryListSuccess(state, repos, ...))
```

## Blocked By

(none)

## Definition of Done

- [ ] Async callback internals are extracted to testable functions
- [ ] v8 ignore comments are removed from refactored code
- [ ] `lib/cli/commands/bucket.ts` is removed from vitest.config.ts exclude list (if all ignores are removed)
- [ ] All tests pass
- [ ] Coverage remains at 100%

## Principles

- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md)
- [Dependency Injection](../principles/dependency-injection.md)
- [Unit Test Coverage](../principles/unit-test-coverage.md)
