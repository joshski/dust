# Test Validation Guard for Non-.md Files

Write a unit test that exercises the guard clause in `validatePatch()` which filters non-.md files from principle directory listings.

## Context

The validation function `validatePatch()` in `lib/validation/index.ts:185-187` contains a guard clause:

```typescript
if (!file.endsWith('.md')) continue
```

This guard filters out non-markdown files that `readdir` may return from the principles directory. The guard is currently excluded from coverage with a `v8 ignore` comment. A test can exercise this path by providing a mock filesystem that includes a non-.md file in the principles directory.

## Implementation

Add a test case to `lib/validation/validation.test.ts` that:

1. Uses `createMemoryFileSystem` to set up a filesystem with a principles directory
2. Includes a non-.md file (e.g., `.DS_Store` or `notes.txt`) alongside valid principle files
3. Calls `validatePatch()` with a patch that triggers principle hierarchy validation
4. Asserts that validation completes without error (the non-.md file is ignored)

After the test passes, remove the `v8 ignore` comments around line 185-187.

## Principles

- [Unit Test Coverage](../principles/unit-test-coverage.md)
- [Stubs Over Mocks](../principles/stubs-over-mocks.md)

## Blocked By

(none)

## Definition of Done

- [ ] Test exercises the `if (!file.endsWith('.md')) continue` guard clause
- [ ] `v8 ignore` comments are removed from `lib/validation/index.ts:185-187`
- [ ] `bin/dust check` passes with 100% coverage
