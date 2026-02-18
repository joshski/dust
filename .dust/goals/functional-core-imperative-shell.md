# Functional Core, Imperative Shell

Separate code into a pure "functional core" and a thin "imperative shell." The core takes values in and returns values out, with no side effects. The shell handles I/O and wires things together.

Purely functional code makes some things easier to understand: because values don't change, you can call functions and know that only their return value matters—they don't change anything outside themselves.

The functional core contains business logic as pure functions that take values and return values. The imperative shell sits at the boundary, reading input, calling into the core, and performing side effects with the results. This keeps the majority of code easy to test (no mocks or stubs needed for pure functions) and makes the I/O surface area small and explicit.

## Parent Goal

- [Decoupled Code](decoupled-code.md)

## Sub-Goals

- (none)
