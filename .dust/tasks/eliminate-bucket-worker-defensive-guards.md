# Eliminate Bucket Worker Defensive Guards

Restructure state handling in `bucket-worker.ts` to eliminate runtime defensive guards via compile-time guarantees.

## Context

Four defensive guard regions are excluded from coverage:
- Lines 354-359: URL update guard in `syncUIWithRepoList`
- Lines 422-426: Repository state existence check in `handleRepositoryListSuccess`
- Lines 899-904: Lifecycle type check in `shutdown`
- Lines 910-914: Error logging for rejected loop promises in `shutdown`

Per the decision to "restructure to eliminate guards," these runtime checks should become unnecessary through type refinement or control flow restructuring.

## Implementation

### URL Update Guard (lines 354-359)

The guard checks `if (repo.url)` after the repository already exists. Restructure to handle URL presence in the conditional branch that adds new repositories, making the else branch's URL handling explicit.

### Repository State Guard (lines 422-426)

After `syncTUI` completes, repository state should exist for all items in the list. Either:
- Use `Map.get()` with assertion (if truly impossible to be undefined)
- Or restructure `handleRepositoryListFromRepo` to return the created states

### Shutdown Lifecycle Guards (lines 899-914)

The lifecycle type check guards against stopping already-stopped loops. Restructure the loop state machine so that:
- `RepositoryState.lifecycle` is narrowed before iteration
- Or filter repositories to only running ones before processing

## Blocked By

(none)

## Principles

- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md)
- [Design for Testability](../principles/design-for-testability.md)
- [Lint Everything](../principles/lint-everything.md)

## Definition of Done

- Defensive guard v8 ignore comments removed from the four regions
- Type system or control flow prevents the guarded conditions
- No new runtime guards introduced
- `bin/dust check` passes
