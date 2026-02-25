# Inject Env into Remaining Functions

Add dependency injection for `process.env` to a few remaining functions that access it directly.

## Context

The global state audit found the codebase follows dependency injection well. Most functions that need environment variables accept them as parameters with defaults (e.g., `env: NodeJS.ProcessEnv = process.env`).

A few functions still access `process.env` directly:

- `lib/bucket/auth.ts:10` - `getDustbucketHost()` reads `DUST_BUCKET_HOST`
- `lib/cli/colors.ts:42,47` - `shouldDisableColors()` reads `NO_COLOR` and `TERM`
- `lib/logging/index.ts:86,101,102,106` - Logging service reads `DEBUG`, `DUST_LOG_FILE`, `DUST_LOG_DIR` and writes `DUST_LOG_FILE`

## Proposed Changes

### getDustbucketHost

Add optional env parameter:

```typescript
export function getDustbucketHost(env: NodeJS.ProcessEnv = process.env): string {
  return env.DUST_BUCKET_HOST || DEFAULT_DUSTBUCKET_HOST
}
```

### shouldDisableColors

Add optional env parameter:

```typescript
export function shouldDisableColors(env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.NO_COLOR !== undefined) return true
  if (env.TERM === 'dumb') return true
  if (!process.stdout.isTTY) return true
  return false
}
```

### Logging service

The logging service already provides `createLoggingService()` factory for testing. The env access is internal to the service and acceptable for the current design.

## Impact

Low priority. The current code works fine for testing because:
- `process.env` can be modified before tests
- The logging service has a factory function for isolated testing
- Tests can use `stubEnv()` from test utilities

This change would make the dependencies more explicit and align with the existing patterns.

## Open Questions

### Should this be done?

#### Yes, for consistency

The codebase convention is to inject env vars. These few functions should follow the pattern for consistency, even if tests work without it.

#### No, low value

The functions work fine as-is. Tests can modify `process.env` directly. The change adds parameters without practical benefit.
