# Reduce complexity in command functions

Refactor `list` and `validatePatch` to reduce their cyclomatic complexity below 20.

## Background

These functions handle CLI command logic and validation with multiple conditional branches for different scenarios and options.

Current complexity levels:
- `list` (lib/cli/commands/list.ts:141) - complexity 37
- `validatePatch` (lib/validation/index.ts:150) - complexity 26

## Implementation

For each function:

1. Identify groups of related conditionals that can be extracted into helper functions
2. Apply "Functional Core, Imperative Shell" - separate pure decision logic from I/O
3. Use early returns to reduce nesting depth
4. Consider breaking up large functions into smaller, focused functions

For `list` at complexity 37, significant decomposition is needed. Consider extracting format-specific logic and filtering into separate helpers.

## Principles

- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md) - Separate command logic from I/O
- [Decoupled Code](../principles/decoupled-code.md) - Extract independent concerns
- [Lint Everything](../principles/lint-everything.md) - Part of enabling complexity checking

## Blocked By

(none)

## Definition of Done

- `list` complexity ≤ 20
- `validatePatch` complexity ≤ 20
- Existing tests pass (`bin/dust check`)
