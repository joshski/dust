# Extract Testable Proxy Request Handler

Extract pure functions from `createClaudeApiProxyServer()` to enable unit test coverage.

## Context

The `createClaudeApiProxyServer()` function is currently excluded from v8 coverage (lines 139-266, ~120 lines). It mixes HTTP server mechanics with testable business logic:

- Building proxy request configuration (URL, headers)
- Filtering and forwarding headers
- Building response headers from upstream response
- Generating error responses

The decision has been made that only the `server.listen()` call should remain untested.

## Approach

1. Extract a `buildProxyRequest(request, token)` pure function that returns the upstream URL and headers configuration
2. Extract a `filterResponseHeaders(upstreamHeaders)` pure function that returns headers suitable for the node response
3. Extract error response helpers (`buildNoTokenResponse`, `buildUpstreamErrorResponse`)
4. Keep only the HTTP server wiring (request body streaming, response streaming, `server.listen()`) in the excluded section
5. Add unit tests for all extracted functions
6. Remove or narrow the v8 ignore comment

## Principles

- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md)
- [Unit Test Coverage](../principles/unit-test-coverage.md)
- [Dependency Injection](../principles/dependency-injection.md)

## Blocked By

(none)

## Definition of Done

- [ ] Pure functions extracted from `createClaudeApiProxyServer()` for request/response handling
- [ ] Unit tests cover all extracted functions
- [ ] v8 ignore comment narrowed to cover only the HTTP server wiring (`httpCreateServer` callback and `server.listen`)
- [ ] `bin/dust check` passes
