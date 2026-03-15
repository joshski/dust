# Migrate Logging to Env Config

Update the logging subsystem to receive configuration from `EnvConfig` instead of reading `process.env` directly.

## Context

The logging module (`lib/logging/index.ts`) currently reads `DEBUG`, `DUST_LOG_DIR`, and `DUST_LOG_FILE` directly from `process.env`. This creates hidden dependencies and makes testing require global state manipulation.

## Approach

1. Update `createLoggingService()` to accept `LoggingConfig` as a parameter
2. Remove direct `process.env` access from `lib/logging/index.ts`
3. Update callers to pass the logging config from `EnvConfig`
4. Simplify logging tests by removing `process.env` manipulation

## Principles

- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md)
- [Dependency Injection](../principles/dependency-injection.md)
- [Test Isolation](../principles/test-isolation.md)

## Blocked By

- [Centralize Env Config Type](centralize-env-config-type.md)

## Definition of Done

- [ ] `createLoggingService()` accepts `LoggingConfig` parameter
- [ ] No direct `process.env` access in `lib/logging/index.ts`
- [ ] Logging tests use explicit config instead of `process.env` manipulation
- [ ] `bin/dust check` passes
