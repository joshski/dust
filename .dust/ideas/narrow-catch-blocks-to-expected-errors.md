# Narrow catch blocks to expected errors

Several catch blocks catch all errors when only ENOENT (file not found) is expected. This can mask permission errors, I/O failures, and other unexpected conditions.

## Pattern

The codebase uses a pattern where optional files are read with a try/catch that catches all errors:

```typescript
try {
  const content = await fileSystem.readFile(path)
  return content
} catch {
  return fallbackValue
}
```

When the intention is to handle "file not found", catching all errors can hide:
- Permission denied (EACCES)
- I/O errors
- Memory allocation failures
- Other unexpected conditions

## Locations

1. **`lib/bucket/auth.ts:40`** - `loadStoredToken` catches all errors, returns null
2. **`lib/bucket/auth.ts:65`** - `clearToken` catches all errors silently
3. **`lib/cli/commands/agent-shared.ts:54`** - `loadAgentInstructions` returns empty string on any error
4. **`lib/validation/index.ts:190`** - Catches all errors reading principles directory
5. **`lib/config/settings.ts:389`** - Settings loading catches all errors and returns defaults
6. **`lib/validation/overlay-filesystem.ts:70`** - Catches all errors reading base directory

## Proposed Fix

Follow the pattern already used in `lib/git/hooks.ts`:

```typescript
try {
  const content = await fileSystem.readFile(path)
  return content
} catch (error) {
  if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
    return fallbackValue
  }
  throw error  // Re-throw unexpected errors
}
```

## Trade-offs

**Propagate unexpected errors:**
- Aligns with "Stop the Line" principle
- Makes infrastructure failures visible
- Requires callers to handle or propagate errors

**Keep silent fallback:**
- Optional files should never block functionality
- Keeps commands resilient to filesystem issues
- Accepted risk of masking real problems

## Related Ideas

- [Establish consistent error handling](establish-consistent-error-handling.md) - documents the `loadAgentInstructions` case with open question

## Related Principles

- [Stop the Line](../principles/stop-the-line.md) - problems should be fixed at source, not hidden
- [Actionable Errors](../principles/actionable-errors.md) - error messages should tell you what to do next
