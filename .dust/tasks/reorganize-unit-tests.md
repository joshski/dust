# Reorganize unit tests

Move unit tests for support modules from `./tests/` to `./tests/support/`, placing them alongside the code they test.

Currently, the `tests/` directory mixes end-to-end scenario tests with unit tests for support modules:

**Unit tests (should move to `./tests/support/`):**
- `tests/agent-emulator.test.ts` - tests `tests/support/agent-emulator.ts`
- `tests/shell-emulator.test.ts` - tests `tests/support/shell-emulator.ts`

**End-to-end scenario tests (should remain in `./tests/`):**
- `tests/blocked-tasks.test.ts`
- `tests/check-command.test.ts`
- `tests/discover-available-work.test.ts`
- `tests/edge-cases.test.ts`
- `tests/explore-goals.test.ts`
- `tests/init-command.test.ts`
- `tests/list-tasks.test.ts`
- `tests/new-content.test.ts`
- `tests/pick-task.test.ts`

Moving unit tests next to their subjects makes the codebase structure more intuitive and makes it clearer which tests are testing which code.

## Goals

- [Intuitive Directory Structure](../goals/intuitive-directory-structure.md)

## Blocked by

(none)

## Definition of done

- [ ] Move `tests/agent-emulator.test.ts` to `tests/support/agent-emulator.test.ts`
- [ ] Move `tests/shell-emulator.test.ts` to `tests/support/shell-emulator.test.ts`
- [ ] Update import paths in moved test files (change `./support/` to `./`)
- [ ] Verify all tests pass with `bun test`
