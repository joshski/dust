# Migrate Session to Env Config

Update session-related functions to receive configuration from `EnvConfig` instead of reading `process.env` directly.

## Context

The session module (`lib/session.ts`) defines constants for environment variable names (`DUST_UNATTENDED`, `DUST_SKIP_AGENT`, `DUST_REPOSITORY_ID`, `DUST_PROXY_PORT`) and provides functions that read from `process.env`. The `buildUnattendedEnv()` function also reads `process.env[DUST_PROXY_PORT]` directly.

## Approach

1. Update `isUnattended()` to require explicit config (remove default)
2. Update `buildUnattendedEnv()` to accept config instead of reading `process.env`
3. Update callers to pass session config from `EnvConfig`

## Principles

- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md)
- [Dependency Injection](../principles/dependency-injection.md)

## Blocked By

(none)

## Definition of Done

- [ ] Session functions accept config parameters without `process.env` defaults
- [ ] No direct `process.env` access in `lib/session.ts`
- [ ] `bin/dust check` passes
