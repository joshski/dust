# Inject Env into Utility Functions

Add optional `env` parameter to `getDustbucketHost()` and `shouldDisableColors()` for consistency with the codebase's dependency injection pattern.

## Context

The codebase follows a convention of injecting `env: NodeJS.ProcessEnv = process.env` into functions that need environment variables. Two utility functions still access `process.env` directly:

- `lib/bucket/auth.ts:9` - `getDustbucketHost()` reads `DUST_BUCKET_HOST`
- `lib/cli/colors.ts:40` - `shouldDisableColors()` reads `NO_COLOR` and `TERM`

The logging service (which also accesses `process.env`) already provides a `createLoggingService()` factory for testing, so no changes are needed there.

## Implementation

### getDustbucketHost

```typescript
export function getDustbucketHost(env: NodeJS.ProcessEnv = process.env): string {
  return env.DUST_BUCKET_HOST || DEFAULT_DUSTBUCKET_HOST
}
```

### shouldDisableColors

```typescript
export function shouldDisableColors(env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.NO_COLOR !== undefined) return true
  if (env.TERM === 'dumb') return true
  if (!process.stdout.isTTY) return true
  return false
}
```

Note: `process.stdout.isTTY` remains unchanged as it's a different kind of dependency (not an env var).

## Principles

- [Dependency Injection](../principles/dependency-injection.md)
- [Test Isolation](../principles/test-isolation.md)
- [Decoupled Code](../principles/decoupled-code.md)

## Blocked By

(none)

## Definition of Done

- [ ] `getDustbucketHost()` accepts optional `env` parameter with default `process.env`
- [ ] `shouldDisableColors()` accepts optional `env` parameter with default `process.env`
- [ ] Tests pass
