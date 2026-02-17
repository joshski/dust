# Extract Shared Lint Task File Helper

Extract the duplicated `lintTaskFile` test helper into a shared location.

The function is identical in `lib/workflow-tasks.test.ts` (line 444) and `lib/cli/commands/audit.test.ts` (line 412). Both call the same 7 validators in the same order to lint a task file's content. Extract it into `lib/test/test-utilities.ts` or a similar shared module so both test files import from one place.

## Goals

- [Reasonably DRY](../goals/reasonably-dry.md)
- [Maintainable Codebase](../goals/maintainable-codebase.md)

## Blocked By

(none)

## Definition of Done

- [ ] `lintTaskFile` is defined in one shared location
- [ ] Both test files import and use the shared version
- [ ] All tests pass
