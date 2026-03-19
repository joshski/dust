# Remove v8 Ignore: Bucket Worker Effects

Remove coverage exclusions from `lib/cli/commands/bucket-worker.ts` by restructuring for testability.

## Current State

The bucket-worker has extensive coverage exclusions (~300 lines across multiple regions):

1. **Helper functions** (lines 110-122, 259-332) - `findRepoPathByRepositoryId`, `toRepositoryDependencies`, helper functions called by effect handlers
2. **Initial state stubs** (lines 229-244) - Stub functions in `createInitialState`
3. **Defensive guards** (lines 354-359, 422-426, 899-904, 910-914) - Guards for edge cases that are difficult to trigger in tests
4. **Effect execution** (lines 725-828) - `executeEffects` switch statement
5. **Keypress handling** (lines 976-1047) - Internal keypress effect execution
6. **Authentication flow** (lines 1081-1114) - `resolveToken` function
7. **Tool execution** (lines 1177-1277, 1315-1380) - `forwardToolExecution` and callbacks

## Why This Matters

The exclusions hide significant logic:
- Effect execution interprets all server messages
- Tool execution forwarding involves request construction, timeout handling, result mapping
- Keypress handling affects all TUI navigation

Some exclusions are legitimate (defensive guards, stub initialization), but others contain testable business logic.

## Restructuring Approach

### Phase 1: Extract effect handlers to testable functions

The `executeEffects` switch statement delegates to helper functions. These helpers are already partially extracted (`syncUIWithRepoList`, `handleRepositoryListSuccess`, etc.). Continue this pattern:

```typescript
// Instead of inline effect handling:
case 'handleRepositoryList':
  const repoDeps = toRepositoryDependencies(...)
  handleRepositoryListFromRepo(...)

// Extract to named, testable function:
export function executeRepositoryListEffect(
  effect: RepositoryListEffect,
  state: BucketState,
  dependencies: EffectDependencies
): void
```

### Phase 2: Test tool execution via proxy interface

The `forwardToolExecution` function builds requests and handles responses. Test by:
1. Starting a mock WebSocket server
2. Calling `forwardToolExecution` with known inputs
3. Verifying the message format and response handling

### Phase 3: Accept exclusions for legitimate wiring

Some exclusions are appropriate:
- Stub initializers (no logic, just placeholders)
- Defensive guards (truly unreachable in normal flow)
- Real WebSocket callback wiring

## Benefits

- Effect execution logic verified
- Tool execution request/response format tested
- Keypress navigation behavior covered
- Clear separation between testable logic and wiring

## Open Questions

### Should `executeEffects` be split or kept as a single function?

#### Option: Split by effect category

Separate functions for message effects, lifecycle effects, tool effects. Clearer boundaries but more code.

#### Option: Keep unified switch

Single entry point is easier to maintain. Just test the public interface.

### Should defensive guards be removed or restructured?

#### Option: Keep guards, accept exclusion

Guards document edge cases. Exclusion is honest about what's tested.

#### Option: Restructure to eliminate guards

Refactor state machines so guards become unreachable at compile time. More complex but cleaner.

#### Option: Test guards via error injection

Create test helpers that put the system in invalid states. Ensures guards work if ever reached.
