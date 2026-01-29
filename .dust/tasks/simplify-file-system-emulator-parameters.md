# Simplify createFileSystemEmulator parameters

Replace the current Map/Set-based API for `createFileSystemEmulator` with a nested object literal that mirrors file system hierarchy.

## Current API

```typescript
const fs = createFileSystemEmulator({
  files: new Map([['/project/.dust/goals/my-goal.md', '# My Goal']]),
  existingPaths: new Set(['/project/.dust/ideas']),
})
```

## Proposed API

```typescript
const fs = createFileSystemEmulator({
  project: {
    '.dust': {
      goals: {
        'my-goal.md': '# My Goal'
      },
      ideas: {}
    }
  }
})
```

## Approach

1. Define a recursive type for the nested structure where:
   - String values represent file contents
   - Object values represent directories
   - Empty objects represent empty directories

2. Write a function to convert the nested structure to absolute paths, building both the files Map and existingPaths Set internally

3. Update `createFileSystemEmulator` to accept the new structure

4. Update all test files to use the new API

## Goals

- [Readable Test Data](../goals/readable-test-data.md)

## Blocked by

(none)

## Definition of done

- [ ] `createFileSystemEmulator` accepts a nested object literal representing file hierarchy
- [ ] String values in the object represent file contents
- [ ] Empty objects represent directories without files
- [ ] All existing tests are updated to use the new API
- [ ] The old Map/Set API is removed
