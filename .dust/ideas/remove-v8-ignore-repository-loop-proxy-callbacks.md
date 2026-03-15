# Remove v8 Ignore: Repository Loop Proxy Callbacks

Remove the v8 coverage exclusion for proxy callback setup in `lib/bucket/repository-loop.ts`.

## Current State

Lines 454-483 exclude the command events proxy initialization:

```typescript
/* v8 ignore start -- proxy callbacks only invoked by real subprocesses */
const proxy = await startCommandEventsProxy({
  forwardEvent: commandEvent => {
    if (sendEvent && sessionId) {
      // Build and send event message...
    }
  },
  getTools: () => repoDeps.getTools?.() ?? [],
  forwardToolExecution: repoDeps.forwardToolExecution ?? (/* fallback */),
})
/* v8 ignore stop */
```

The callbacks:
1. `forwardEvent` - Enriches command events with session context and forwards to bucket
2. `getTools` - Returns available tools
3. `forwardToolExecution` - Proxies tool execution requests

## Why This Matters

These callbacks contain meaningful logic (event enrichment, sequence numbering, context attachment) that executes during agent iterations. Testing would catch regressions in event formatting.

## Restructuring Approach

**Option A: Extract event enrichment to pure function**

```typescript
// Testable
export function enrichCommandEvent(
  commandEvent: CommandEvent,
  context: { sessionId: string; repository: string; repoId: number }
): EnrichedEvent

// Excluded (only wiring)
const proxy = await startCommandEventsProxy({
  forwardEvent: event => sendEvent(enrichCommandEvent(event, context)),
  // ...
})
```

**Option B: Test via proxy interface**

The `startCommandEventsProxy` function is already testable. Add tests that invoke the proxy's HTTP endpoints and verify callback behavior through the returned handlers.

**Option C: Integration test coverage**

System tests that run actual iterations exercise these callbacks. Document that this code path is covered by integration tests.

## Benefits

- Event enrichment logic verified
- Sequence numbering tested
- Context attachment validated

## Open Questions

### How should callback wiring be tested?

#### Option: Extract all logic to pure functions

Callbacks become thin wrappers. Maximum testability, minimal exclusion.

#### Option: Test through proxy HTTP interface

Start the proxy in tests, make HTTP requests, verify behavior. Tests the integration more realistically.

#### Option: Accept exclusion with integration test documentation

Document that system tests cover this path. Reduces unit test maintenance burden.
