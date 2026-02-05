# Fix TOCTOU Race Conditions

Replace check-then-act file operations with atomic patterns to prevent race conditions.

## Affected Files

### `lib/cli/commands/init.ts`

Lines 54-59, 93-99, 106-113 use the pattern:

```typescript
if (fileSystem.exists(path)) {
  // skip
} else {
  await fileSystem.writeFile(path, content)
}
```

Between the `exists()` check and the `writeFile()` call, the file could be created by another process, leading to silent overwrites or unexpected behavior.

### `lib/git/hooks.ts`

Lines 64-74, 85-87, 108-122, 126-140 use similar patterns:

```typescript
if (!fileSystem.exists(prePushPath)) {
  return false
}
const content = await fileSystem.readFile(prePushPath) // File could be deleted
```

The file could be deleted between the existence check and the read operation, causing an unhandled exception.

### `lib/cli/commands/lint-markdown.ts`

Lines 497, 522, 558, 579 check directory existence before scanning:

```typescript
if (!fileSystem.exists(dirPath)) continue
for await (const file of glob.scan(dirPath)) { ... }
```

## Recommended Fix

Replace check-then-act patterns with try-catch-based approaches that handle errors gracefully:

```typescript
// Instead of:
if (fileSystem.exists(path)) {
  const content = await fileSystem.readFile(path)
}

// Use:
try {
  const content = await fileSystem.readFile(path)
  // process content
} catch (error) {
  if (error.code === 'ENOENT') {
    // File doesn't exist - handle appropriately
  } else {
    throw error
  }
}
```

For write operations, use `wx` flag (write exclusive) to ensure atomic creation:

```typescript
// Atomic "create if not exists"
try {
  await fileSystem.writeFile(path, content, { flag: 'wx' })
} catch (error) {
  if (error.code === 'EEXIST') {
    // File already exists - expected case
  } else {
    throw error
  }
}
```

## Goals

- [Maintainable Codebase](../goals/maintainable-codebase.md)

## Blocked By

(none)

## Definition of Done

- [ ] `init.ts` uses atomic file creation instead of check-then-write
- [ ] `hooks.ts` handles file-not-found errors gracefully in read operations
- [ ] `lint-markdown.ts` handles directory-not-found errors during scanning
- [ ] All existing tests pass
- [ ] Edge cases are tested (concurrent access scenarios if feasible)
