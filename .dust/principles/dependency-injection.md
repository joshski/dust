# Dependency Injection

Avoid global mocks. Dependency injection is almost always preferable to testing code that depends directly on globals.

When code depends on global state or singletons, testing requires mocking those globals—which introduces hidden coupling, complicates test setup, and risks interference between tests. Dependency injection makes dependencies explicit: they're passed in as arguments, making the code's requirements visible and enabling tests to supply controlled implementations.

This approach improves testability (each test controls its own dependencies), readability (dependencies are declared upfront), and flexibility (swapping implementations doesn't require changing the consuming code). It also makes refactoring safer since dependencies are explicit rather than implicit.

## Parent Principle

- [Decoupled Code](decoupled-code.md)

## Sub-Principles

- (none)
