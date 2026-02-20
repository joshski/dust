# Extract bucket auth filesystem construction

Extract the `authFileSystem` construction from `createDefaultBucketDependencies()` in `lib/cli/commands/bucket.ts`. This logic (lines 216-242) contains conditional error handling that should be covered by tests.

## Background

The `authFileSystem` object construction includes `try/catch` blocks in `exists`, `isDirectory`, and `getFileCreationTime`. These conditional branches represent testable logic, not thin wrappers. Currently the entire file is excluded from coverage in `vitest.config.ts`.

## Requirements

1. Create a `createAuthFileSystem()` function that constructs and returns the `authFileSystem` object
2. The function should use dependency injection for the underlying fs operations (`accessSync`, `statSync`, `readFile`, `writeFile`, `mkdir`, `readdir`, `chmod`, `rename`)
3. Add unit tests for `createAuthFileSystem()` covering the thin wrapper behavior (e.g., exists returning true/false, isDirectory returning true/false)
4. Keep the thin wrapper functions (e.g., `defaultCreateWebSocket`, `defaultSetupKeypress`) in `/* v8 ignore */` blocks

## Implementation Notes

- The extracted function can be exported and tested independently
- After extraction, evaluate whether `bucket.ts` can be removed from vitest exclusions

## Principles

- [Dependency Injection](../principles/dependency-injection.md)
- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md)
- [Comprehensive Test Coverage](../principles/comprehensive-test-coverage.md)

## Blocked By

(none)

## Definition of Done

- [ ] `createAuthFileSystem()` function extracted with appropriate dependencies
- [ ] Unit tests cover the conditional branches (exists, isDirectory, getFileCreationTime)
- [ ] Thin wrapper functions remain in `/* v8 ignore */` blocks
- [ ] `bin/dust check` passes
