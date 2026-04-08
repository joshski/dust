# Break cyclic dependency in lib/artifacts

Extract the `ReadOnlyArtifactsRepository` type dependency out of the cycle between `repository-principle-hierarchy.ts` and `index.ts`.

## Background

`omen all` identifies a 2-node cyclic dependency:

- `repository-principle-hierarchy.ts` imports `ReadOnlyArtifactsRepository` from `index.ts`
- `index.ts` imports `RepositoryPrincipleNode` and `getRepositoryPrincipleHierarchy` from `repository-principle-hierarchy.ts`

## Approach

Extract the `ReadOnlyArtifactsRepository` type into a separate types file (e.g. `lib/artifacts/types.ts`) so that `repository-principle-hierarchy.ts` no longer imports from `index.ts`. Then `index.ts` can continue to re-export from `repository-principle-hierarchy.ts` without creating a cycle.

## Files

- `lib/artifacts/index.ts` - barrel file that re-exports principle hierarchy
- `lib/artifacts/repository-principle-hierarchy.ts` - imports `ReadOnlyArtifactsRepository` from index

## Task Type

implement

## Principles

- [Decoupled Code](../principles/decoupled-code.md)

## Blocked By

(none)

## Definition of Done

- `ReadOnlyArtifactsRepository` type is importable without going through `index.ts`
- `repository-principle-hierarchy.ts` no longer imports from `index.ts`
- `index.ts` still re-exports `RepositoryPrincipleNode` and `getRepositoryPrincipleHierarchy`
- All existing tests pass
- `omen all` no longer reports this cycle
