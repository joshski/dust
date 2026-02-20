# Extract repos dir environment variable logic

Extract the `DUST_REPOS_DIR` fallback logic from `bucket.ts` and `repository.ts` into a testable utility function. Both files contain identical logic that reads the environment variable with a default fallback.

## Background

The `getReposDir()` implementations in both files are wrapped in `/* v8 ignore */` blocks. Extracting the pure logic (string concatenation with fallback) from environment access enables testing while keeping thin wrappers ignored.

## Requirements

1. Create a `getReposDir(env: { DUST_REPOS_DIR?: string }, homeDir: string)` function in a shared location
2. The function takes explicit parameters rather than reading `process.env` directly
3. Both `bucket.ts` and `repository.ts` should use this function via thin wrappers
4. Add unit tests covering both the environment variable case and the default fallback

## Implementation Notes

- This follows the "functional core, imperative shell" pattern
- The thin wrappers that read `process.env` remain in ignore blocks
- Consider placing the function in an existing utility module or creating `lib/bucket/paths.ts`

## Principles

- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md)
- [Comprehensive Test Coverage](../principles/comprehensive-test-coverage.md)

## Blocked By

(none)

## Definition of Done

- [ ] `getReposDir(env, homeDir)` pure function created
- [ ] Tests cover both environment variable and default paths
- [ ] `bucket.ts` and `repository.ts` use the shared function
- [ ] Existing `/* v8 ignore */` wrappers remain for process.env access
- [ ] `bin/dust check` passes
