# Implement Repository Lifecycle State Type

Create a discriminated union type representing all valid repository lifecycle states. This replaces the current scattered state fields (`loopPromise`, `stopRequested`, `agentStatus`, `wakeUp`, `cancelCurrentIteration`) with explicit typed states.

## Context

The current `RepositoryState` interface in `lib/bucket/repository.ts` mixes concerns:
- Business state (`repository`, `path`, `logBuffer`)
- Lifecycle state (`loopPromise`, `stopRequested`, `agentStatus`)
- Callbacks (`wakeUp`, `cancelCurrentIteration`)

This change extracts lifecycle state into an explicit discriminated union, making invalid state combinations unrepresentable.

## Implementation

Create a new type in `lib/bucket/repository-lifecycle.ts`:

```typescript
export type RepositoryLifecycleState =
  | { type: 'idle' }
  | { type: 'starting' }
  | { type: 'running'; loopPromise: Promise<void>; cancel: () => void }
  | { type: 'stopping' }
  | { type: 'stopped' }
```

Update `RepositoryState` to use this:

```typescript
export interface RepositoryState {
  repository: Repository
  path: string
  logBuffer: LogBuffer
  lifecycle: RepositoryLifecycleState
  wakeUp?: () => void
  taskAvailablePending?: boolean
}
```

This task intentionally does not change any behavior -- it only restructures the types. The next task will add transition logic.

## Principles

- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md)
- [Design for Testability](../principles/design-for-testability.md)
- [Decoupled Code](../principles/decoupled-code.md)

## Blocked By

(none)

## Definition of Done

- New `RepositoryLifecycleState` type exists in `lib/bucket/repository-lifecycle.ts`
- `RepositoryState` interface uses the new lifecycle type
- All existing code compiles and tests pass
- No behavioral changes (pure refactor)
