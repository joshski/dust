# Integrate Repository Lifecycle State Machine

Wire the pure lifecycle state machine into the repository management code, replacing imperative state mutations with explicit state transitions.

## Context

With the `RepositoryLifecycleState` type and pure `transition` function in place, this task integrates them into the actual repository management code. This is the "imperative shell" that orchestrates side effects based on state machine outputs.

## Implementation

Update `lib/bucket/repository.ts`:

1. **`startRepositoryLoop`**: Instead of directly setting `repoState.stopRequested = false` and assigning `loopPromise`, use:
   ```typescript
   const result = transition(repoState.lifecycle, { type: 'start' })
   if (!result.ok) {
     log(`Cannot start loop: ${result.error}`)
     return
   }
   repoState.lifecycle = result.state
   // ... then on promise creation:
   repoState.lifecycle = { type: 'running', loopPromise, cancel }
   ```

2. **`removeRepositoryFromManager`**: Use transitions to move through stopping -> stopped states.

3. **Loop completion in `startRepositoryLoop`**: The `.finally()` handler should transition to 'idle' or 'stopped' appropriately.

4. **Add `onTransition` callback support**: Allow observing state changes for logging/debugging.

## Testing

Add integration tests that verify:
- Starting a loop transitions idle -> starting -> running
- Stopping a loop transitions running -> stopping -> stopped
- Attempting invalid transitions logs warnings and does nothing
- Observer callbacks fire on transitions

## Principles

- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md)
- [Design for Testability](../principles/design-for-testability.md)
- [Development Traceability](../principles/development-traceability.md)

## Blocked By

(none)

## Definition of Done

- `startRepositoryLoop` uses state machine transitions
- `removeRepositoryFromManager` uses state machine transitions
- Loop completion handlers use state machine transitions
- Invalid transitions are logged but don't crash
- All existing tests pass
- New integration tests verify state machine behavior
