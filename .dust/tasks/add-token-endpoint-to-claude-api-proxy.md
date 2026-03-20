# Add Token Endpoint to Claude API Proxy

Extend the existing Claude API proxy to serve helper tokens via a `/token` endpoint and validate incoming requests against the issued helper token.

## Context

The Claude API proxy already handles OAuth token injection for containerized Claude Code. This task adds the apiKeyHelper authentication flow:

1. Container's `apiKeyHelper` command fetches a helper token from `GET /token`
2. Container sends API requests with the helper token
3. Proxy validates the helper token before proxying to Anthropic

This replaces the current "dummy token" approach with proper helper token validation.

## Changes

1. **Update `lib/proxy/claude-api-proxy.ts`**:
   - Import helper token functions from `lib/proxy/helper-token.ts`
   - Add `GET /token` route that returns the current helper token as plain text
   - Modify `handleProxyRequest` to validate incoming `Authorization` or `x-api-key` against the helper token
   - Return 401 for invalid/expired helper tokens
   - Maintain helper token state (regenerate on TTL expiry)

2. **Update unit tests in `lib/proxy/claude-api-proxy.test.ts`**:
   - `/token` endpoint returns valid helper token
   - Proxy accepts requests with valid helper token
   - Proxy rejects requests with invalid token (401)
   - Proxy rejects requests with expired token (401)

## Principles

- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md): Use pure helper token functions, handle I/O at the edge
- [Design for Testability](../principles/design-for-testability.md): Validation logic is testable via pure functions

## Blocked By

- [Add Helper Token Module](add-helper-token-module.md)

## Definition of Done

- Proxy serves helper tokens via `GET /token`
- Proxy validates helper tokens on incoming requests
- Unit tests cover token endpoint and validation behavior
- All existing tests pass
