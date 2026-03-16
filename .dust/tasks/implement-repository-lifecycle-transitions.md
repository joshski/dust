# Implement Repository Lifecycle Transitions

Add pure transition functions that validate and compute lifecycle state changes, embodying the "functional core" of the state machine.

## Context

With the `RepositoryLifecycleState` type in place, this task adds the transition logic. The transitions are pure functions that take the current state and an action, returning the new state or an error. This keeps all state validation logic testable without side effects.

## Implementation

Add to `lib/bucket/repository-lifecycle.ts`:

```typescript
export type LifecycleAction =
  | { type: 'start' }
  | { type: 'started'; loopPromise: Promise<void>; cancel: () => void }
  | { type: 'stop' }
  | { type: 'stopped' }

export type TransitionResult =
  | { ok: true; state: RepositoryLifecycleState }
  | { ok: false; error: string }

export function transition(
  current: RepositoryLifecycleState,
  action: LifecycleAction
): TransitionResult {
  // Valid transitions:
  // idle -> starting (on 'start')
  // starting -> running (on 'started')
  // running -> stopping (on 'stop')
  // stopping -> stopped (on 'stopped')
  // Any state except idle -> idle (on 'stop' when not running)
}
```

Write comprehensive unit tests covering:
- All valid transitions
- Invalid transition attempts (error paths)
- Idempotent operations where appropriate

## Principles

- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md)
- [Design for Testability](../principles/design-for-testability.md)
- [Comprehensive Test Coverage](../principles/comprehensive-test-coverage.md)

## Blocked By

(none)

## Definition of Done

- Pure `transition` function implemented
- Unit tests cover all valid and invalid transitions
- Tests are side-effect free (testable as pure functions)
- All existing tests continue to pass
