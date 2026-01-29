# Replace mocks with emulators

The test utilities in `lib/cli/test-utilities.ts` are named `createMock*` but they're actually stubs/emulators as described in the [Stubs over mocks](../goals/stubs-over-mocks.md) goal. They don't verify call order or arguments - they provide in-memory implementations for testing observable behavior.

## Current issues

1. **Misleading names** - `createMockContext`, `createMockFileSystem`, `createMockGlobScanner` suggest mock-style testing but are actually emulators
2. **Duplication** - Tests must specify the same file paths twice: once in `createMockFileSystem` and again in `createMockGlobScanner`
3. **Unrealistic separation** - Real glob scanners operate on the file system; separating them in tests allows inconsistencies

## Approach

1. Rename utilities to reflect what they actually are:
   - `createMockContext` → `createContextEmulator`
   - `createMockFileSystem` → `createFileSystemEmulator`
   - `createMockGlobScanner` → (removed, merged into file system)

2. Have `createFileSystemEmulator` return an object that implements both `FileSystem` and `GlobScanner` interfaces. The `scan()` method iterates over the files the emulator knows about.

3. Update all test files to use the new names and combined emulator.

## Goals

- [Stubs over mocks](../goals/stubs-over-mocks.md)
- [Decoupled Code](../goals/decoupled-code.md)

## Blocked by

(none)

## Definition of done

- [ ] `createMockContext` renamed to `createContextEmulator`
- [ ] `createMockFileSystem` renamed to `createFileSystemEmulator`
- [ ] `createFileSystemEmulator` implements both `FileSystem` and `GlobScanner`
- [ ] `createMockGlobScanner` removed (functionality merged)
- [ ] All test files updated to use new utilities
- [ ] Tests pass
