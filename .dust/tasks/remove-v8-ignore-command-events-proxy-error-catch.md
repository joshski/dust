# Remove v8 Ignore: Command Events Proxy Error Catch

Remove the v8 coverage exclusion for the error catch block in `lib/bucket/command-events-proxy.ts`.

## Context

Lines 137-141 exclude an error catch block:

```typescript
} catch (error) /* v8 ignore start */ {
  const msg = error instanceof Error ? error.message : String(error)
  log(`event forwarding failed: ${msg}`)
  response.writeHead(PROXY_ERROR_STATUS).end('Event forwarding failed')
} /* v8 ignore stop */
```

Analysis of call sites shows that `forwardEvent` can throw in production - the implementation in `repository-loop.ts:460-477` calls `sendEvent(buildEventMessage(...))` which could fail. However, the test "returns 502 when forward handler throws" (`command-events-proxy.test.ts:188-201`) already exercises this error path by providing a throwing `forwardEvent` callback.

Since the error path is already tested, the v8 ignore comments serve no purpose and can be removed.

## Approach

1. Remove the `/* v8 ignore start */` and `/* v8 ignore stop */` comments from the catch block
2. Run `bin/dust check` to verify coverage remains at 100%

## Principles

- [Unit Test Coverage](../principles/unit-test-coverage.md)
- [Comprehensive Test Coverage](../principles/comprehensive-test-coverage.md)

## Blocked By

(none)

## Definition of Done

- [ ] v8 ignore comments removed from catch block in `lib/bucket/command-events-proxy.ts`
- [ ] `bin/dust check` passes with 100% coverage
