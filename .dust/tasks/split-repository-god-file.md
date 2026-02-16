# Split repository god file

Extract git operations and loop orchestration from `lib/bucket/repository.ts` into focused modules.

## Goals

- [Small units](../goals/small-units.md)
- [Context-optimised code](../goals/context-optimised-code.md)
- [Decoupled code](../goals/decoupled-code.md)

## Blocked By

(none)

## Definition of Done

- [ ] Git operations (clone, sync, remove) moved to `lib/bucket/repository-git.ts`
- [ ] Loop orchestration moved to `lib/bucket/repository-loop.ts`
- [ ] `lib/bucket/repository.ts` contains only types and `parseRepository`
- [ ] All existing tests pass without modification
- [ ] No circular dependencies introduced
