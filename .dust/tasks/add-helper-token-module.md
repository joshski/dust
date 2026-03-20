# Add Helper Token Module

Create a pure functional module for generating and validating short-TTL helper tokens. These tokens let containerized Claude Code authenticate with the host OAuth gateway.

## Context

When running Claude Code in Docker containers, the real OAuth token should never enter the container environment. Instead, the container fetches a synthetic "helper token" from the host gateway. The gateway validates this helper token before injecting the real OAuth token upstream.

This task creates the pure functional core for token generation and validation, with no I/O or side effects.

## Changes

1. **Create `lib/proxy/helper-token.ts`**: Pure functions for token operations:
   - `generateHelperToken(): HelperToken` - Generate a synthetic token that looks like a Claude API key format (`sk-ant-api03-...`)
   - `isHelperTokenValid(token: string, issued: HelperToken): boolean` - Check if a token matches and is within TTL
   - `createHelperTokenState(): HelperTokenState` - Create state object tracking current token and issue time
   - Export `HELPER_TOKEN_TTL_MS` constant (e.g., 60000ms = 1 minute)

2. **Add unit tests in `lib/proxy/helper-token.test.ts`**:
   - Token generation produces valid format
   - Token validation succeeds within TTL
   - Token validation fails after TTL
   - Token validation fails for wrong token
   - Token state creation and rotation

## Principles

- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md): Pure functions with no side effects
- [Design for Testability](../principles/design-for-testability.md): Easy to test without mocks
- [Decoupled Code](../principles/decoupled-code.md): No dependencies on I/O or HTTP

## Blocked By

(none)

## Definition of Done

- `lib/proxy/helper-token.ts` exports pure token generation and validation functions
- Unit tests cover generation, validation, TTL expiry, and state management
- No I/O or side effects in the module
- All existing tests pass
