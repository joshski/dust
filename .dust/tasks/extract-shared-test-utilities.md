# Extract shared test utilities

The mock factory functions `createMockContext()`, `createMockFs()`, and `createMockGlob()` are duplicated across seven test files with slight variations. This violates DRY and makes maintenance harder.

Create a shared `lib/cli/test-utilities.ts` file that exports unified, flexible mock factories that all test files can import.

## Goals

- [Decoupled Code](../goals/decoupled-code.md)

## Blocked by

(none)

## Definition of done

- [ ] Create `lib/cli/test-utilities.ts` with exported mock factories
- [ ] `createMockContext()` returns context with captured stdout/stderr lines
- [ ] `createMockFileSystem()` supports both file content maps and write tracking
- [ ] `createMockGlobScanner()` accepts a list of files to yield
- [ ] All test files import from the shared utilities instead of defining their own
- [ ] No duplicate mock factory definitions remain in test files
- [ ] All tests pass
