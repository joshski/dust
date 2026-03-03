# Extract bucket connection lifecycle to pure functions

Extract WebSocket lifecycle handlers (onclose, onerror, onopen) into pure functions. This enables direct testing of reconnection logic.

## Context

`lib/cli/commands/bucket.ts:540-597` handles WebSocket events with logic for:
- Reconnection delays with exponential backoff
- Special handling for code 4000 (replaced by another connection)
- Error logging

This logic is interleaved with side effects (setTimeout, logging) making it hard to test the reconnection strategy.

## Implementation

1. Add to `lib/bucket/bucket-state.ts`:
   - `handleClose(state, code, reason) -> { state, effects }` - returns reconnect effect with calculated delay
   - `handleError(state, errorMessage) -> { state, effects }` - returns log effect
   - `handleOpen(state) -> { state, effects }` - resets reconnect delay, returns connected log

2. Update `connectWebSocket` in `bucket.ts`:
   - Wire `onclose`, `onerror`, `onopen` to call pure handlers
   - Execute returned effects (log, scheduleReconnect, etc.)

3. Write tests for lifecycle handlers:
   - Test exponential backoff calculation
   - Test code 4000 prevents reconnection
   - Test successful connection resets delay
   - No mocks needed - just state in, state + effects out

## Principles

- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md)
- [Unit Test Coverage](../principles/unit-test-coverage.md)
- [Keep Unit Tests Pure](../principles/keep-unit-tests-pure.md)

## Blocked By

- [Extract bucket message handling to pure functions](extract-bucket-message-handling-to-pure-functions.md)

## Definition of Done

- [ ] `handleClose`, `handleError`, `handleOpen` functions exist in `bucket-state.ts`
- [ ] Reconnection logic is tested directly without setTimeout mocks
- [ ] `connectWebSocket` uses the pure handlers and executes effects
- [ ] All existing tests pass
