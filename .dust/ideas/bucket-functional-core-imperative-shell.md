# Bucket: Functional Core, Imperative Shell

Restructure `lib/cli/commands/bucket.ts` to separate pure logic from side-effectful wiring, reducing the need for `v8 ignore` blocks and making business logic directly testable.

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

Using immutable state (`{ ...state, reconnectDelay: newDelay }`) makes tests cleaner and prevents accidental mutation, but adds allocation overhead in a hot render loop (100ms interval). Could use immutable for message handling and mutable for UI state.

### How to handle the `BucketState.repositories` Map?

The `Map<string, RepositoryState>` is deeply mutable. Options:
- Keep it mutable but treat it as owned by the shell, with pure functions returning instructions to modify it
- Replace with a plain object for the pure core's view of state

### Should `syncTUI` and `syncAgentStatuses` be effects or direct mutations?

These are called on every render frame (100ms). Making them effects would be architecturally clean but adds overhead. Pragmatic approach: keep render-path mutations direct, only model message-handling as pure functions + effects.
