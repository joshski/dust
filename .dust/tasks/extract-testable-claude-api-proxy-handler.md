# Extract Testable Claude API Proxy Handler

Extract the HTTP request handling logic from `createClaudeApiProxyServer` into a testable `handleProxyRequest` function.

## Context

The `createClaudeApiProxyServer` function (lines 294-378 in `lib/proxy/claude-api-proxy.ts`) has ~80 lines excluded from coverage with `/* v8 ignore */`. This excluded code contains real logic that could regress:
- URL construction and request forwarding
- Response header filtering
- Token reading and injection
- Error handling paths

The pure functions (`buildProxyRequest`, `filterResponseHeaders`, `buildNoTokenResponse`, etc.) are already well-tested. The exclusion covers the imperative shell that wires them together.

Per the decision to use **dependency injection** for HTTP helpers, this task extracts the request handler as a testable function.

## Implementation

1. Define a `ProxyRequest` type representing the incoming request (method, pathname, search, headers, body)
2. Define a `ProxyResponse` type representing the result (status, headers, body stream or buffer)
3. Create `handleProxyRequest(request: ProxyRequest, dependencies: ClaudeApiProxyDependencies): Promise<ProxyResponse>` as a pure async function
4. Add `writeResponse` and `streamBody` to `ClaudeApiProxyDependencies` for HTTP response helpers
5. Move all request handling logic into `handleProxyRequest`
6. Update `createClaudeApiProxyServer` to adapt Node.js HTTP objects and call `handleProxyRequest`
7. Write unit tests for `handleProxyRequest` covering:
   - Successful request forwarding
   - Missing token (401 response)
   - Upstream error (502 response)
   - Response header filtering
8. Remove `/* v8 ignore */` comments from testable code (only Node.js HTTP adaptation remains excluded)

## Out of Scope

- The default dependencies wiring (lines 42-48) remains excluded - it's runtime-only
- Shared abstractions with git credential proxy - that's a separate refactoring

## Blocked By

(none)

## Principles

- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md)
- [Dependency Injection](../principles/dependency-injection.md)
- [Design for Testability](../principles/design-for-testability.md)
- [Unit Test Coverage](../principles/unit-test-coverage.md)

## Definition of Done

- `handleProxyRequest` function exists with pure input/output types
- HTTP helpers are dependency-injected
- Unit tests cover success, no-token, and upstream-error paths
- Coverage exclusion reduced to ~20 lines of Node.js HTTP adaptation
- `bin/dust check` passes
