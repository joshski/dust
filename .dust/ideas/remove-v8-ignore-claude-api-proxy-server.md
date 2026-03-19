# Remove v8 Ignore: Claude API Proxy Server

Remove coverage exclusions from `lib/proxy/claude-api-proxy.ts` by extracting testable logic.

## Current State

Three regions are excluded (~120 lines total):

1. **Default dependencies** (lines 42-48) - Runtime dependency wiring
2. **HTTP helpers** (lines 261-287) - `sendErrorResponse()` and `streamResponseBody()`
3. **Server creation** (lines 299-377) - `createClaudeApiProxyServer()` HTTP handler

## Why This Matters

The excluded code contains real logic that could regress:
- URL construction and request forwarding
- Response header filtering
- Token reading and injection
- Error handling paths

The pure functions (`buildProxyRequest`, `filterResponseHeaders`, `buildNoTokenResponse`, etc.) are already well-tested. The exclusion covers the imperative shell that wires them together.

## Restructuring Approach

**Extract the request handler as a testable function:**

```typescript
// New: testable handler that takes pure request/response abstractions
export async function handleProxyRequest(
  request: { method: string; pathname: string; search: string; headers: Record<string, string>; body?: Buffer },
  dependencies: ClaudeApiProxyDependencies
): Promise<{ status: number; headers: Record<string, string>; body: AsyncIterable<Uint8Array> }>

// Excluded: only the HTTP server boilerplate
const server = httpCreateServer(async (nodeRequest, nodeResponse) => {
  const result = await handleProxyRequest(adaptNodeRequest(nodeRequest), dependencies)
  writeNodeResponse(nodeResponse, result)
})
```

This moves all logic into the testable handler, leaving only Node.js HTTP adaptation excluded.

## Relationship to Git Credential Proxy

Both proxy servers follow the same pattern. A shared approach could:
- Define a common request/response abstraction
- Extract handlers as pure async functions
- Minimize exclusions to ~20 lines of Node.js wiring each

## Benefits

- Request forwarding logic verified by unit tests
- Error handling paths covered
- Response streaming behavior tested
- Consistent with git credential proxy refactoring

## Open Questions

### Should HTTP helpers be dependency-injected or extracted?

#### Option: Dependency injection

Pass `writeResponse` and `streamBody` as dependencies. Allows testing with mock implementations.

#### Option: Extract to testable module

Move HTTP helpers to a shared module that can be tested once and reused.

#### Option: Accept exclusion for thin wiring

The helpers are thin wrappers. Focus testing effort on the business logic.
