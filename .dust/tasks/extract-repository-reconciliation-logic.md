# Extract repository reconciliation logic

Extract pure functions from `handleRepositoryList()` in `lib/bucket/repository.ts` to separate domain decision logic from orchestration.

## Background

The `handleRepositoryList()` function at `lib/bucket/repository.ts:387-427` mixes three responsibilities:
1. Parsing unknown data into a `Map<string, Repository>`
2. Computing reconciliation actions (add/remove/reclone/updateProvider)
3. Executing side effects via async calls

This makes the reconciliation logic difficult to unit test without mocking filesystem operations.

## Implementation

Extract a pure `computeRepositoryReconciliation()` function that takes existing and incoming repositories and returns a list of actions:

```typescript
type ReconciliationAction =
  | { type: 'add'; repository: Repository }
  | { type: 'remove'; name: string }
  | { type: 'reclone'; name: string; repository: Repository; reason: string }
  | { type: 'updateProvider'; name: string; newProvider: string | undefined }

function computeRepositoryReconciliation(
  existing: Map<string, Repository>,
  incoming: Map<string, Repository>
): ReconciliationAction[]
```

**Functional Core:** The new function compares maps and returns actions. It captures the decision logic for branch changes, provider updates, additions, and removals.

**Imperative Shell:** `handleRepositoryList()` becomes a thin orchestrator that:
1. Parses incoming data
2. Calls `computeRepositoryReconciliation()`
3. Applies each action by calling appropriate side-effecting functions

Optionally extract `parseRepositoryList()` as a helper if it improves clarity.

## Principles

- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md)
- [Design for Testability](../principles/design-for-testability.md)
- [Keep Unit Tests Pure](../principles/keep-unit-tests-pure.md)

## Blocked By

(none)

## Definition of Done

- `computeRepositoryReconciliation()` is a pure function taking two Maps and returning an action list
- `handleRepositoryList()` delegates to the pure function and applies actions
- Unit tests cover reconciliation logic (add, remove, reclone, updateProvider) without mocking async operations
- Existing behavior is preserved (integration tests still pass)
