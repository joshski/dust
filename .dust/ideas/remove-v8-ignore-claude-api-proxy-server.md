# Remove v8 Ignore: Claude API Proxy Server

Remove the v8 coverage exclusion for `createClaudeApiProxyServer()` in `lib/proxy/claude-api-proxy.ts` by restructuring for testability.

## Current State

Two exclusions exist in this file:

1. **Lines 41-47**: `defaultDependencies` object (runtime-only wiring)
2. **Lines 139-266**: `createClaudeApiProxyServer()` function (HTTP server integration)

The server function handles:
- HTTP server creation and request routing
- OAuth token injection
- Header forwarding
- Request/response body streaming
- Error handling

## Why This Matters

At ~120 lines, this is a substantial exclusion. The HTTP server logic includes error paths, header manipulation, and streaming behavior that could regress without test coverage.

## Restructuring Approach

**Option A: Extract request handler logic**

Separate the HTTP request handling into a pure function that takes `(request, token)` and returns a response configuration. Test the logic without starting a server.

```typescript
// Testable
export function buildProxyRequest(request: Request, token: string): ProxyConfig

// Integration-only (excluded)
export async function createClaudeApiProxyServer(): Promise<Server>
```

**Option B: HTTP test utilities**

Create test utilities that start the server and make real HTTP requests. Accept slower tests for higher fidelity.

**Option C: Narrow the exclusion**

Refactor so only the `httpCreateServer()` call is excluded, with all request handling logic tested via dependency injection.

## Benefits

- Error paths become testable
- Header manipulation logic verified
- Streaming behavior can be tested with mock responses

## Open Questions

### How much server boilerplate should remain untested?

#### Option: Only the server.listen() call

Extract all request handling to testable functions. Minimal exclusion.

#### Option: Request handler wrapper

Exclude the `httpCreateServer` callback wrapper but test the underlying logic functions.

#### Option: Full server exclusion with integration tests

Keep the current exclusion, add system tests that exercise the proxy end-to-end.
