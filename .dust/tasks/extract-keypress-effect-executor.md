# Extract Keypress Effect Executor

Extract keypress effect execution from `bucket-worker.ts` into a testable function with explicit dependencies.

## Context

The `executeKeypressEffects` function (lines 996-1046) interprets keypress effects by calling terminal-ui functions. It's currently excluded from coverage because it's tightly coupled to the UI state object.

The function already follows the Functional Core, Imperative Shell pattern (effects come from the pure `handleKeypress` function), but the executor itself is not tested because it mutates `TerminalUIState` directly.

## Implementation

1. Extract `executeKeypressEffects` to a separate module or make it testable in place
2. Define a minimal interface for UI operations (`UIEffectTarget`) that the executor needs
3. Create the executor function that operates on the interface rather than concrete `TerminalUIState`
4. Write unit tests using a stub implementation of `UIEffectTarget`

## Out of Scope

- Changes to the pure `handleKeypress` function (already tested)
- Changes to terminal-ui state management

## Blocked By

(none)

## Principles

- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md)
- [Stubs Over Mocks](../principles/stubs-over-mocks.md)
- [Unit Test Coverage](../principles/unit-test-coverage.md)

## Definition of Done

- Keypress effect executor is testable via dependency injection
- Unit tests cover quit, openBrowser, navigation, and scroll effects
- Coverage exclusion removed from keypress effect handling code
- `bin/dust check` passes
