# Remove v8 Ignore: Auth Server Wrappers

Remove the v8 coverage exclusion for native wrappers in `lib/bucket/auth-server.ts`.

## Current State

The entire file (lines 4-50) is excluded:

```typescript
/* v8 ignore start - thin wrappers around native functions */
export function createLocalServer(handler): { port: number; stop: () => void }
export function openBrowser(url: string): void
/* v8 ignore stop */
```

- `createLocalServer()` - Creates HTTP server for OAuth callback, ~30 lines
- `openBrowser()` - Spawns platform-specific browser command, ~5 lines

## Why This Matters

While `openBrowser()` is truly a thin wrapper, `createLocalServer()` contains logic:
- URL parsing
- Request object construction
- Response handling
- Port resolution

This logic could regress without tests.

## Restructuring Approach

**Option A: Split the file**

1. Keep `openBrowser()` excluded (genuinely untestable)
2. Extract server logic to testable function:
   ```typescript
   export function handleAuthCallback(request: Request): Response
   ```
3. Test the callback handler, exclude only the server creation boilerplate

**Option B: Accept current exclusion for this small file**

The file is only 50 lines and serves a narrow purpose. The cost of restructuring may exceed the benefit.

**Option C: Test via mocked child_process**

For `openBrowser()`, inject `spawn` dependency and verify it's called with correct arguments.

## Relationship to Other Ideas

This file is small enough that it could remain excluded while larger proxy servers are prioritized. However, `createLocalServer()` follows the same pattern as the other proxy servers and could benefit from the same refactoring approach.

## Open Questions

### Is the browser opener worth testing?

#### Option: Leave untested

Platform-specific process spawning is difficult to test meaningfully. Manual verification suffices.

#### Option: Test spawn invocation

Inject `spawn` dependency, verify correct command per platform. Adds test coverage without exercising real behavior.
