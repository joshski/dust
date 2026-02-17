# Consolidate Duplicate SpawnFn Types

Move the duplicated `SpawnFn` type to a shared location.

`SpawnFn` is defined identically in `lib/cli/commands/check.ts` and `lib/cli/commands/pre-push.ts`. Extract it to a shared types file so both commands import from one place. See `.dust/ideas/consolidate-duplicate-spawnfn-types.md` for the original observation.

## Goals

- [Reasonably DRY](../goals/reasonably-dry.md)
- [Maintainable Codebase](../goals/maintainable-codebase.md)

## Blocked By

(none)

## Definition of Done

- [ ] `SpawnFn` is defined in one shared location
- [ ] Both `check.ts` and `pre-push.ts` import from the shared location
- [ ] The idea file is deleted after completion
- [ ] All tests pass
