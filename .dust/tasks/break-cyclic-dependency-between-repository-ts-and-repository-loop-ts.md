# Break cyclic dependency between repository.ts and repository-loop.ts

Extract shared types to break the circular import between `lib/bucket/repository.ts` and `lib/bucket/repository-loop.ts`.

## Background

This is the last remaining cyclic dependency flagged by `omen all`. It is a residual from the 5-node cycle that was partially broken in a prior commit.

- `repository.ts` imports `runRepositoryLoop` from `repository-loop.ts` (and re-exports it)
- `repository-loop.ts` imports types `RepositoryDependencies` and `RepositoryState` from `repository.ts`

## Approach

Move `RepositoryDependencies` and `RepositoryState` into a shared types file (e.g. `lib/bucket/repository-types.ts`). Both `repository.ts` and `repository-loop.ts` then import from that file instead of from each other. The `repository-loop.ts` imports are already type-only, so this is a straightforward extraction.

## Files

- `lib/bucket/repository.ts` - defines `RepositoryDependencies` and `RepositoryState`, imports `runRepositoryLoop`
- `lib/bucket/repository-loop.ts` - imports types from `repository.ts`

## Task Type

implement

## Principles

- [Decoupled Code](../principles/decoupled-code.md)

## Blocked By

(none)

## Definition of Done

- `repository-loop.ts` no longer imports from `repository.ts`
- `RepositoryDependencies` and `RepositoryState` are importable from a shared module
- All existing tests pass
- `omen all` reports 0 cycles
