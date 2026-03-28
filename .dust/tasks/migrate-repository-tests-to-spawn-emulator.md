# Migrate Repository Tests to Spawn Emulator

Replace local spawn helpers in `lib/bucket/repository.test.ts` with shared `createSpawnEmulator()`. Update tests to use the new API while preserving behavior.

## Context

`lib/bucket/repository.test.ts` has the most comprehensive spawn mock implementation with process tracking. This is the reference implementation that the shared emulator is based on. Migrating it first validates that the shared emulator handles the most complex use case.

The migration should:
- Remove local spawn helper functions
- Import and use `createSpawnEmulator()` from test-utilities
- Update test setup to use new emulator API
- Ensure all existing test assertions still pass
- Keep test behavior identical

## Principles

- [Stubs Over Mocks](../principles/stubs-over-mocks.md)
- [Make Changes with Confidence](../principles/make-changes-with-confidence.md)
- [Comprehensive Test Coverage](../principles/comprehensive-test-coverage.md)

## Task Type

implement

## Blocked By

- [Create Spawn Emulator Core](../tasks/create-spawn-emulator-core.md)

## Repository Hints

Repository tests track processes by command string in a Map. Ensure the emulator provides equivalent tracking capabilities.

## Definition of Done

- Local spawn helper functions removed from repository.test.ts
- All repository tests use `createSpawnEmulator()` from test-utilities
- All existing test assertions pass
- No test behavior changed
- Code is cleaner and more maintainable
