# Repository Lifecycle State Machine

Replace imperative state mutation in repository loop management with an explicit state machine pattern.

## Current State

Repository lifecycle in `lib/bucket/repository.ts` uses imperative state management with callbacks and manual cleanup:

```typescript
export function startRepositoryLoop(
  repoState: RepositoryState,
  repoDeps: RepositoryDependencies,
  sendEvent?: SendEventFn,
  sessionId?: string
): void {
  log(`starting loop for ${repoState.repository.name}`)
  repoState.stopRequested = false
  repoState.loopPromise = runRepositoryLoop(...)
    .catch(error => { ... })
    .finally(() => {
      log(`loop finished for ${repoState.repository.name}`)
      repoState.loopPromise = null
      repoState.agentStatus = 'idle'
      repoState.wakeUp = undefined
      repoState.cancelCurrentIteration = undefined
    })
}
```

The `RepositoryState` interface mixes concerns:
- Business logic (`repository`, `agentStatus`, `taskAvailablePending`)
- UI concerns (`wakeUp` callback)
- Lifecycle (`loopPromise`, `stopRequested`, `cancelCurrentIteration`)
- Observability (`logBuffer`)

## Proposed Pattern

Introduce an explicit state machine with typed transitions:

```typescript
type RepositoryLifecycleState =
  | { type: 'idle' }
  | { type: 'starting' }
  | { type: 'running'; loopPromise: Promise<void>; cancel: () => void }
  | { type: 'stopping' }
  | { type: 'stopped' }

interface RepositoryStateMachine {
  current(): RepositoryLifecycleState
  start(): Promise<void>
  stop(): Promise<void>
  onTransition(callback: (from: RepositoryLifecycleState, to: RepositoryLifecycleState) => void): void
}
```

## Trade-offs

### Benefits

- **Explicit states** — impossible to be in invalid combinations
- **Typed transitions** — compile-time checking of state changes
- **Testability** — state machine can be tested independently of side effects
- **Debuggability** — clear state transitions make lifecycle issues easier to diagnose
- **Separation of concerns** — lifecycle logic separate from business state

### Costs

- **Complexity** — adds abstraction where imperative code currently works
- **Migration effort** — requires refactoring multiple files
- **Learning curve** — state machine patterns less familiar to some developers
- **Overhead** — may be over-engineering for current needs

## Open Questions

### Is a full state machine necessary, or would a simpler typed state union suffice?

#### Option: Full state machine with transitions

Implement formal transitions with guards and callbacks. Maximum safety but highest complexity.

#### Option: Typed state union only

Use discriminated union for state representation but keep imperative transition logic. Captures benefits of typed states without machine abstraction.

### Should the state machine be a generic utility or repository-specific?

#### Option: Generic reusable state machine

Create a general-purpose `StateMachine<S, T>` utility that could be used elsewhere. More upfront work but reusable.

#### Option: Repository-specific implementation

Build state machine directly into repository lifecycle. Simpler, tailored to the specific needs.
