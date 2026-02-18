# Decoupled Code

Code should be organized into independent units with explicit dependencies.

Decoupled code is easier to test, understand, and modify. Dependencies are passed in rather than hard-coded, enabling units to be tested in isolation and composed flexibly. This reduces the blast radius of changes and makes the system more maintainable.

## Parent Goal

- [Make Changes with Confidence](make-changes-with-confidence.md)

## Sub-Goals

- [Dependency Injection](dependency-injection.md)
- [Stubs Over Mocks](stubs-over-mocks.md)
- [Functional Core, Imperative Shell](functional-core-imperative-shell.md)
