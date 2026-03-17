# Reduce complexity in parsing functions

Refactor `parseRawEvent`, `parseServerMessage`, and `extractOpeningSentence` to reduce their cyclomatic complexity below 20.

## Background

These functions parse structured data (event streams, server messages, markdown sentences) and their complexity comes from handling multiple cases. Applying "Functional Core, Imperative Shell" principles can help separate the branching logic from side effects.

Current complexity levels:
- `parseRawEvent` (lib/claude/event-parser.ts:3) - complexity 28
- `parseServerMessage` (lib/bucket/server-messages.ts:136) - complexity 21
- `extractOpeningSentence` (lib/markdown/markdown-utilities.ts:29) - complexity 21

## Implementation

For each function:

1. Identify the branching logic that drives complexity
2. Consider extracting helper functions for distinct parsing cases
3. Use early returns to flatten nested conditionals
4. Apply lookup tables or maps where appropriate instead of switch/case chains

The goal is to reduce complexity while maintaining readability and existing behavior.

## Principles

- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md) - Separate pure parsing logic from I/O
- [Decoupled Code](../principles/decoupled-code.md) - Extract independent parsing helpers
- [Lint Everything](../principles/lint-everything.md) - Part of enabling complexity checking

## Blocked By

(none)

## Definition of Done

- `parseRawEvent` complexity ≤ 20
- `parseServerMessage` complexity ≤ 20
- `extractOpeningSentence` complexity ≤ 20
- Existing tests pass (`bin/dust check`)
