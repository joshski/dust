# Reduce complexity in lint functions

Refactor `lintMarkdown`, `checkNode`, and `detectCIChecks` to reduce their cyclomatic complexity below 20.

## Background

These functions perform linting and validation checks with many conditional branches. Their high complexity comes from handling numerous validation rules and edge cases.

Current complexity levels:
- `lintMarkdown` (lib/cli/commands/lint-markdown.ts:71) - complexity 40
- `checkNode` (lib/lint/policy-checker.ts:113) - complexity 30
- `detectCIChecks` (lib/audits/checks-audit.ts:534) - complexity 26

## Implementation

For each function:

1. Extract distinct validation rules into separate helper functions
2. Use composition to combine smaller validators
3. Consider a registry or lookup pattern for rule dispatch
4. Apply early returns to flatten nested conditionals

`lintMarkdown` at complexity 40 will likely need the most aggressive decomposition - consider extracting each lint check into its own function.

## Principles

- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md) - Validation logic should be pure functions
- [Decoupled Code](../principles/decoupled-code.md) - Each lint rule should be independent
- [Lint Everything](../principles/lint-everything.md) - Part of enabling complexity checking

## Blocked By

(none)

## Definition of Done

- `lintMarkdown` complexity ≤ 20
- `checkNode` complexity ≤ 20
- `detectCIChecks` complexity ≤ 20
- Existing tests pass (`bin/dust check`)
