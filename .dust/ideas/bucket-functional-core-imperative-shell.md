# Bucket: Functional Core, Imperative Shell

Restructure `lib/cli/commands/bucket.ts` to separate pure logic from side-effectful wiring. This reduces `v8 ignore` blocks and makes business logic directly testable.

## Context

`bucket.ts` currently has ~960 lines mixing pure state transitions with imperative I/O wiring. This leads to:

- **8 `v8 ignore` blocks** (lines 95-269) wrapping thin native wrappers that exist solely for dependency injection
- **1 `v8 ignore` block** (lines 657-680) around an async callback whose internals v8 can't track
- Heavy use of `BucketDependencies` (12 fields) threaded through most functions
- Functions like `connectWebSocket` and `ws.onmessage` that mix message parsing, state mutation, and I/O in one place

The "Functional Core, Imperative Shell" pattern would make the core logic testable without mocking, and push all I/O to a thin outer shell that doesn't need coverage.

## Proposed Structure

### 1. Extract pure state machine (`bucket-state.ts`)

Pure functions that take state + event and return new state + effects:

- `handleMessage(state, serverMessage)` -> `{ state, effects }` where effects are descriptions like `{ type: 'log', message }`, `{ type: 'startLoop', repo }`, `{ type: 'reconnect', delayMs }`
- `handleClose(state, code, reason)` -> `{ state, effects }`
- `handleError(state, errorMessage)` -> `{ state, effects }`
- `handleKeypress(state, key, useTUI)` -> `{ state, effects }` where effects include `{ type: 'quit' }` or `{ type: 'uiAction', ... }`

These are trivially testable: pass in state, assert on returned state and effect list. No mocks needed.

### 2. Keep imperative shell in `bucket.ts`

The shell becomes a thin interpreter that:

- Creates real dependencies (WebSocket, stdin, signals) - still `v8 ignore`d but now just a few lines
- Runs an event loop: receives events from I/O, feeds them through pure functions, executes returned effects
- The `v8 ignore` surface shrinks to only the truly untestable bits (real WebSocket construction, process signal setup)

### 3. Effect interpreter pattern

```typescript
// Pure core returns effect descriptions
type Effect =
  | { type: 'log'; message: string; stream?: 'stdout' | 'stderr' }
  | { type: 'startLoop'; repoName: string }
  | { type: 'wakeLoop'; repoName: string }
  | { type: 'reconnect'; delayMs: number }
  | { type: 'closeWebSocket' }
  | { type: 'quit' }

// Imperative shell interprets them
function executeEffects(effects: Effect[], deps: BucketDependencies): void {
  for (const effect of effects) {
    switch (effect.type) {
      case 'log': deps.writeStdout(effect.message); break
      case 'reconnect': setTimeout(() => reconnect(), effect.delayMs); break
      // ...
    }
  }
}
```

## What This Eliminates

| Current v8 ignore | After refactor |
|---|---|
| 8 wrapper blocks (lines 95-269) | Collapsed into single `createDefaultDeps()` block in shell |
| async callback ignore (lines 657-680) | Logic moves to pure `handleMessage` returning `startLoop` effects |
| `connectWebSocket` mixing parsing + state + I/O | Split into pure `handleMessage` + shell `executeEffects` |

## Migration Path

1. **Extract `bucket-state.ts`** with pure `handleMessage`, `handleClose`, `handleKeypress` functions. Write tests for them directly (no mocks).
2. **Add `Effect` type** and refactor `connectWebSocket`'s `onmessage` handler to build effects from pure function output, then execute them.
3. **Simplify `BucketDependencies`** - many fields become internal to the shell and don't need to be in the public interface.
4. **Remove `v8 ignore` blocks** that are no longer needed because the logic they wrapped is now in testable pure functions.

## Open Questions

### Should state be immutable?

#### Immutable state for message handling only

Use immutable state (`{ ...state, reconnectDelay: newDelay }`) for message-handling pure functions where it makes tests cleaner. Keep mutable state for the UI render path (100ms interval) to avoid allocation overhead.

#### Fully mutable state

Keep all state mutable as it is today. Pure functions mutate state in place and return only the effects list. Simpler migration but loses some testability benefits.

### How should the pure core view repository state?

#### Plain object projection

The pure core receives a plain object snapshot of repository state. The shell owns the `Map<string, RepositoryState>` and builds projections before calling pure functions.

#### Effects-only approach

Pure functions never read repository state directly. They return effects like `{ type: 'startLoop', repo }` and the shell checks whether the loop is already running.

### Should render-path syncs be modeled as effects?

#### Keep render-path mutations direct

`syncTUI` and `syncAgentStatuses` run every 100ms. Keep them as direct mutations in the shell to avoid effect allocation overhead. Only model message-handling as pure functions + effects.

#### Model everything as effects

All state changes go through the effect system for consistency. Accept the minor overhead since the effect objects are small and short-lived.
