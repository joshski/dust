# Add default definition of done in buildTask function

The `buildTask` function in `tests/e2e/content-builders.ts` currently requires `definitionOfDone` as a mandatory parameter. Many tests use a simple placeholder like `['Done']` when they don't care about the specific definition of done.

Make `definitionOfDone` optional by providing a sensible default value. This reduces boilerplate in tests that don't need to specify custom completion criteria.

## Goals

- [Readable Test Data](../goals/readable-test-data.md)

## Blocked by

(none)

## Definition of done

- [ ] Update `TaskOptions` interface to make `definitionOfDone` optional
- [ ] Add a default value for `definitionOfDone` in the `buildTask` function (e.g., `['Task complete']`)
- [ ] Verify all existing tests still pass
