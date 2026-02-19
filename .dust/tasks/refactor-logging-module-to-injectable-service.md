# Refactor logging module to injectable service

Replace the module-level mutable state in `lib/logging/index.ts` with an injectable service. See [Refactor logging module singleton](../ideas/refactor-logging-module-singleton.md) for analysis.

## Goals

- [Dependency Injection](../goals/dependency-injection.md)
- [Decoupled Code](../goals/decoupled-code.md)
- [Functional Core, Imperative Shell](../goals/functional-core-imperative-shell.md)

## Blocked By

(none)

## Definition of Done

- [ ] Logging state (`patterns`, `initialized`, `activeFileSink`, `fileSinkCache`) is encapsulated in a service object, not module-level variables
- [ ] The service is instantiated at the CLI entry point and passed as a dependency
- [ ] The `_reset()` export is removed — tests create their own service instance
- [ ] All existing tests pass
