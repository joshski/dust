# Extract bucket message handling to pure functions

Extract `connectWebSocket`'s `onmessage` logic into pure functions returning state and effects. This enables direct testing without mocks.

## Context

`lib/cli/commands/bucket.ts:599-703` contains `onmessage` handling that mixes:
- JSON parsing and validation
- State updates (e.g., syncing UI, signaling task availability)
- Side effects (logging, starting loops)

The decisions from the idea specify:
- **Immutable state for message handling**: Return `{ state, effects }` from pure functions
- **Plain object projection**: Pass plain object snapshots of repository state to pure functions
- **Keep render-path mutations direct**: Only model message-handling as effects (not the 100ms render loop)

## Implementation

1. Create `lib/bucket/bucket-state.ts` with:
   - `Effect` type union (`log`, `startLoop`, `wakeLoop`, `syncUI`, etc.)
   - `handleServerMessage(state, message) -> { state, effects }` - pure function for parsed messages
   - `handleMessageParseError(state, rawData) -> { state, effects }` - handles invalid JSON
   - State type that's a plain-object subset of `BucketState` (no functions or Maps)

2. In `bucket.ts`:
   - Keep `ws.onmessage` as thin shell that:
     - Parses JSON
     - Builds plain state projection
     - Calls pure handler
     - Executes returned effects via `executeEffects(effects, deps)`
   - Move the `v8 ignore` block (lines 657-680) logic into the pure handler

3. Write tests for `bucket-state.ts`:
   - Test `handleServerMessage` with `repository-list` messages
   - Test `handleServerMessage` with `task-available` messages
   - Test parse error handling
   - No mocks needed - just assert on returned state and effects

## Principles

- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md)
- [Unit Test Coverage](../principles/unit-test-coverage.md)
- [Keep Unit Tests Pure](../principles/keep-unit-tests-pure.md)

## Blocked By

(none)

## Definition of Done

- [ ] `lib/bucket/bucket-state.ts` exists with `Effect` type and `handleServerMessage` function
- [ ] Pure functions are tested directly without mocks
- [ ] `connectWebSocket` uses the pure handler and effect interpreter
- [ ] The `v8 ignore` block at lines 657-680 is removed or significantly reduced
- [ ] All existing tests pass
