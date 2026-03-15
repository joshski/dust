# Remove v8 Ignore: Command Events Proxy Error Catch

Remove the v8 coverage exclusion for the error catch block in `lib/bucket/command-events-proxy.ts`.

## Current State

Lines 137-141 exclude an error catch block:

```typescript
try {
  handlers.forwardEvent(parsedBody)
  log(`forwarded event: ${parsedBody.event.type}`)
  response.writeHead(202).end('Accepted')
} catch (error) /* v8 ignore start */ {
  const msg = error instanceof Error ? error.message : String(error)
  log(`event forwarding failed: ${msg}`)
  response.writeHead(PROXY_ERROR_STATUS).end('Event forwarding failed')
} /* v8 ignore stop */
```

The catch block handles errors from `handlers.forwardEvent()`. Currently excluded because:
1. `forwardEvent` is typically a simple callback that doesn't throw
2. The error path is difficult to exercise in tests without forcing the callback to throw

## Why This Matters

Error handling paths are exactly what should be tested. If `forwardEvent` can throw in production, tests should verify the error response behavior.

## Restructuring Approach

**Option A: Test with throwing callback**

In tests, provide a `forwardEvent` that throws and verify:
- Error is logged
- Response status is `PROXY_ERROR_STATUS`
- Response body is 'Event forwarding failed'

```typescript
const proxy = await startCommandEventsProxy({
  forwardEvent: () => { throw new Error('test error') },
  // ...
})
// POST to /events
// Verify 500 response
```

**Option B: Remove try-catch if forwardEvent can't throw**

If the callback is guaranteed not to throw (e.g., it only calls synchronous safe operations), remove the defensive catch. The current code may be over-defensive.

**Option C: Type forwardEvent as throwing**

If errors are possible, document this in the type:

```typescript
forwardEvent: (event: CommandEvent) => void | never
```

Then test the error path explicitly.

## Benefits

- Error handling verified
- Response behavior tested
- Defensive code justified by tests

## Open Questions

### Can forwardEvent actually throw in production?

#### Option: Analyze call sites

Review all implementations of `forwardEvent`. If none can throw, remove the try-catch.

#### Option: Assume it can throw

Network callbacks, logging, and event emission can all fail. Keep defensive error handling and test it.
