# Inject fetch into loop dependencies

Add `fetch` as a dependency to `LoopDependencies` to enable testing of `defaultPostEvent` logic.

## Background

The `defaultPostEvent` function in `lib/cli/commands/loop.ts` (lines 144-155) is a thin wrapper around `fetch` that constructs HTTP requests. Currently marked with `/* v8 ignore */` because it uses the global `fetch` directly.

Injecting `fetch` via `LoopDependencies` enables:
1. Testing error handling paths (network failures, non-2xx responses)
2. Verifying request structure without actual HTTP calls
3. Removing the coverage ignore block

## Implementation Details

### Update LoopDependencies interface

Add an optional `fetch` property to `LoopDependencies`:

```typescript
export interface LoopDependencies {
  spawn: typeof nodeSpawn
  run: typeof claudeRun
  sleep: (ms: number) => Promise<void>
  postEvent: PostEventFn
  agentType?: string
  fetch?: typeof fetch  // New
}
```

### Update defaultPostEvent

Modify to accept `fetch` as a parameter or curry it from dependencies:

```typescript
function createPostEvent(fetchFn: typeof fetch): PostEventFn {
  return async (url: string, payload: EventMessage): Promise<void> => {
    await fetchFn(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  }
}
```

### Update createDefaultDependencies

```typescript
export function createDefaultDependencies(): LoopDependencies {
  return {
    spawn: nodeSpawn,
    run: claudeRun,
    sleep: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
    postEvent: createPostEvent(fetch),
  }
}
```

### Add tests

Test that `createPostEvent`:
- Calls fetch with correct URL, method, and headers
- Serializes payload as JSON body
- Propagates fetch errors (optional: test error handling if added)

## Principles

- [Dependency Injection](../principles/dependency-injection.md)
- [Comprehensive Test Coverage](../principles/comprehensive-test-coverage.md)
- [Decoupled Code](../principles/decoupled-code.md)

## Blocked By

(none)

## Definition of Done

- [ ] `fetch` injectable via `LoopDependencies` or `createPostEvent` factory
- [ ] `/* v8 ignore */` comment removed from `defaultPostEvent` / `createPostEvent`
- [ ] Unit tests cover the POST event construction logic
- [ ] Existing integration behavior unchanged
