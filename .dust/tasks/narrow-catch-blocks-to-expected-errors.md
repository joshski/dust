# Narrow Catch Blocks to Expected Errors

Refactor catch blocks that silently swallow all errors to only catch expected errors (like ENOENT for missing files) and re-throw unexpected ones. This follows the pattern already established in `lib/git/hooks.ts`.

## Context

Several catch blocks catch all errors when only ENOENT (file not found) is expected. This can mask permission errors, I/O failures, and other unexpected conditions that should be surfaced.

## Locations to Fix

1. **`lib/bucket/auth.ts:40`** - `loadStoredToken` catches all errors, returns null
2. **`lib/bucket/auth.ts:65`** - `clearToken` catches all errors silently
3. **`lib/cli/commands/agent-shared.ts:54`** - `loadAgentInstructions` returns empty string on any error
4. **`lib/validation/index.ts:190`** - Catches all errors reading principles directory
5. **`lib/config/settings.ts:389`** - Settings loading catches all errors and returns defaults
6. **`lib/validation/overlay-filesystem.ts:70`** - Catches all errors reading base directory

## Pattern to Apply

Follow the existing pattern from `lib/git/hooks.ts`:

```typescript
try {
  // ... operation
} catch (error) {
  if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
    return fallbackValue
  }
  throw error
}
```

## Principles

- [Stop the Line](../principles/stop-the-line.md)
- [Actionable Errors](../principles/actionable-errors.md)

## Blocked By

(none)

## Definition of Done

- [ ] All 6 locations use narrowed catch blocks that only catch ENOENT
- [ ] Unexpected errors (permission denied, I/O failures, etc.) are re-thrown
- [ ] `bin/dust check` passes
- [ ] Unit tests cover both ENOENT and unexpected error scenarios
