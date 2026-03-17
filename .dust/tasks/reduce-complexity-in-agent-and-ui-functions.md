# Reduce complexity in agent and UI functions

Refactor `spawnClaudeCode` and `handleKeyInput` to reduce their cyclomatic complexity below 20.

## Background

These functions handle agent spawning and terminal UI input processing, with branching for different modes, options, and key handlers.

Current complexity levels:
- `spawnClaudeCode` (lib/claude/spawn-claude-code.ts:124) - complexity 22
- `handleKeyInput` (lib/bucket/terminal-ui.ts:636) - complexity 22

## Implementation

For each function:

1. Extract option handling and mode-specific logic into helper functions
2. For `handleKeyInput`, consider a key handler registry or dispatch map
3. Apply early returns to flatten conditionals
4. Separate pure input interpretation from side effects

## Principles

- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md) - Separate input handling from effects
- [Decoupled Code](../principles/decoupled-code.md) - Extract mode/key handlers as independent units
- [Lint Everything](../principles/lint-everything.md) - Part of enabling complexity checking

## Blocked By

(none)

## Definition of Done

- `spawnClaudeCode` complexity ≤ 20
- `handleKeyInput` complexity ≤ 20
- Existing tests pass (`bin/dust check`)
