# Extract bucket keypress handling to pure function

Extract keypress handling into a pure function that returns effects. This enables direct testing without stdin dependencies.

## Context

`lib/cli/commands/bucket.ts:804-819` defines `createKeypressHandler` which currently:
- Calls `handleKeyInput` from terminal-ui (which mutates UI state)
- Triggers shutdown callback directly

This can be made more testable by returning effects instead of executing them inline.

## Implementation

1. Add to `lib/bucket/bucket-state.ts`:
   - `handleKeypress(uiState, key, options) -> { uiState, effects }` - pure function
   - Effects include `{ type: 'quit' }`, `{ type: 'openBrowser', url }`, etc.

2. Update `createKeypressHandler` in `bucket.ts`:
   - Call pure `handleKeypress`
   - Execute returned effects (quit triggers shutdown, openBrowser calls deps)

3. Write tests for `handleKeypress`:
   - Test 'q' key returns quit effect
   - Test navigation keys update UI state correctly
   - Test browser shortcuts return openBrowser effect

## Principles

- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md)
- [Unit Test Coverage](../principles/unit-test-coverage.md)
- [Keep Unit Tests Pure](../principles/keep-unit-tests-pure.md)

## Blocked By

(none)

## Definition of Done

- [ ] `handleKeypress` function exists in `bucket-state.ts`
- [ ] Keypress handling is tested directly without mocking stdin
- [ ] `createKeypressHandler` uses the pure handler and executes effects
- [ ] All existing tests pass
