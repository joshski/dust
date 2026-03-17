# Reduce complexity in loop functions

Refactor `runRepositoryLoop` and `runOneIteration` to reduce their cyclomatic complexity below 20.

## Background

These functions orchestrate the agent iteration loop and contain significant branching for handling different states, errors, and agent types.

Current complexity levels:
- `runRepositoryLoop` (lib/bucket/repository-loop.ts:300) - complexity 25
- `runOneIteration` (lib/loop/iteration.ts:98) - complexity 27

## Implementation

For each function:

1. Extract distinct phases of the loop into helper functions (setup, iteration, cleanup)
2. Apply "Functional Core, Imperative Shell" - separate state management from I/O
3. Consider extracting agent-specific logic into separate handlers
4. Use early returns for error cases to reduce nesting

Both functions coordinate complex workflows - the goal is to make the main function a thin orchestrator that delegates to focused helpers.

## Principles

- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md) - Thin shell orchestrating pure functions
- [Decoupled Code](../principles/decoupled-code.md) - Extract loop phases as independent units
- [Lint Everything](../principles/lint-everything.md) - Part of enabling complexity checking

## Blocked By

(none)

## Definition of Done

- `runRepositoryLoop` complexity ≤ 20
- `runOneIteration` complexity ≤ 20
- Existing tests pass (`bin/dust check`)
