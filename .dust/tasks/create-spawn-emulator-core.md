# Create Spawn Emulator Core

Create a shared `createSpawnEmulator()` function in `lib/test-support/test-utilities.ts` that provides configurable ChildProcess stub behavior. Extract and unify the spawn emulation pattern currently duplicated across test files, making it usable for any test that needs to simulate child process execution.

## Context

Multiple test files implement nearly identical `createMockSpawn()` and `createAutoResolvingSpawn()` helper functions. Each provides EventEmitter-based ChildProcess stubs with configurable exit codes, stdout/stderr emissions, and timing control. The implementations are similar but not identical.

The new emulator should:
- Return EventEmitter-based ChildProcess stubs (stdout, stderr, exit events)
- Support configurable exit codes per command pattern
- Support configurable stdout/stderr emission
- Support both manual control (for timing-sensitive tests) and auto-resolving mode (for integration-style tests)
- Track spawned processes for assertion
- Allow command-specific behavior through pattern matching

## Principles

- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md)
- [Stubs Over Mocks](../principles/stubs-over-mocks.md)
- [Design for Testability](../principles/design-for-testability.md)
- [Dependency Injection](../principles/dependency-injection.md)

## Task Type

implement

## Blocked By

(none)

## Repository Hints

The emulator should be a pure factory function that returns a spawn-compatible function and process tracking utilities. Keep the imperative shell thin - just EventEmitter manipulation and timing.

## Definition of Done

- `createSpawnEmulator()` function exists in `lib/test-support/test-utilities.ts`
- Supports manual process control (emit events, timing)
- Supports auto-resolving mode for integration tests
- Tracks spawned processes by command pattern
- Has comprehensive unit tests demonstrating all modes
- Exports from test-utilities.ts
- No existing tests are modified yet (migration comes later)
