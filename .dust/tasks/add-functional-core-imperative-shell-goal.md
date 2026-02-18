# Add Functional Core, Imperative Shell Goal

Add a new goal file for the Functional Core, Imperative Shell pattern as a sub-goal of [Decoupled Code](../goals/decoupled-code.md). The goal should describe the pattern: separating code into a pure, testable "functional core" (values in, values out, no side effects) and a thin "imperative shell" that handles I/O and wires things together.

Include this text in the goal description:

> Purely functional code makes some things easier to understand: because values don't change, you can call functions and know that only their return value matters—they don't change anything outside themselves.

Update the [Decoupled Code](../goals/decoupled-code.md) goal to list this new goal as a sub-goal.

## Goals

- [Decoupled Code](../goals/decoupled-code.md)

## Blocked By

(none)

## Definition of Done

- [ ] New goal file exists at `.dust/goals/functional-core-imperative-shell.md`
- [ ] Goal is a sub-goal of Decoupled Code
- [ ] Decoupled Code lists the new goal in its Sub-Goals section
- [ ] `bin/dust check` passes
