# Break cyclic dependency between bucket-worker.ts and native-io.ts

Extract shared types to break the circular import between `lib/cli/commands/bucket-worker.ts` and `lib/bucket/native-io.ts`.

## Background

`omen all` identifies a 2-node cyclic dependency:

- `bucket-worker.ts` imports `createDefaultBucketDependencies` and `storeMachineId` from `native-io.ts`
- `native-io.ts` imports `createAuthFileSystem` and `BucketDependencies` type from `bucket-worker.ts`

## Approach

Extract `BucketDependencies` type and `createAuthFileSystem` into a new file (e.g. `lib/bucket/bucket-dependencies.ts`). Both files then import from this shared module instead of from each other.

## Files

- `lib/cli/commands/bucket-worker.ts` - defines `BucketDependencies` type and `createAuthFileSystem`
- `lib/bucket/native-io.ts` - imports both from `bucket-worker.ts`

## Task Type

implement

## Principles

- [Decoupled Code](../principles/decoupled-code.md)

## Blocked By

(none)

## Definition of Done

- `native-io.ts` no longer imports from `bucket-worker.ts`
- `BucketDependencies` and `createAuthFileSystem` live in a shared module
- All existing tests pass
- `omen all` no longer reports this cycle
