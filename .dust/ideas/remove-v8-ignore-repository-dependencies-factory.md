# Remove v8 Ignore: Repository Dependencies Factory

Remove the v8 coverage exclusion for `createDefaultRepositoryDependencies()` in [`lib/bucket/repository.ts`](../../lib/bucket/repository.ts) by extracting to a dedicated module.

## Current State

Lines 134-146 define a factory function excluded from coverage:

```typescript
/* v8 ignore start - simple wrappers around native functions */
export function createDefaultRepositoryDependencies(
  fileSystem: FileSystem
): RepositoryDependencies {
  return {
    spawn: nodeSpawn,
    run: claudeRun,
    fileSystem,
    sleep: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
    getReposDir: () => getReposDir(process.env, homedir()),
  }
}
/* v8 ignore stop */
```

## Why This Matters

The function creates dependencies for the repository loop. While simple today, it may accumulate logic that should be tested.

## Restructuring Approach

Move `createDefaultRepositoryDependencies()` to a dedicated module (e.g., `lib/bucket/default-deps.ts`) that is file-level excluded or tested via integration tests. The main `repository.ts` remains fully covered.

Alternatively, test this function by verifying its return value matches the expected shape (property presence, not invocation behavior).

## Benefits

- `repository.ts` inline ignore removed
- Clear separation between wiring code and business logic
- Consistent with how `bucket-worker.ts` handles similar concerns

## Open Questions

### Should factory functions be tested for shape or behavior?

#### Option: Test shape only

Assert that returned object has expected properties. Simple, stable tests that don't exercise native calls.

#### Option: Test via integration tests

Exercise the factory through system tests that actually use the dependencies. More realistic but slower.

#### Option: Extract to excluded module

No unit tests for wiring code; coverage exclusion made explicit at file level.
