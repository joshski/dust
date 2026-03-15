# Migrate Settings to Env Config

Update settings detection functions to receive configuration from `EnvConfig` instead of reading `process.env` directly.

## Context

The settings module (`lib/config/settings.ts`) reads `BUN_INSTALL` and `DUST_EVENTS_URL` from `process.env` in multiple locations. The `DUST_EVENTS_URL` access is repeated in three places (a DRY violation documented separately).

## Approach

1. Update `detectDustCommand()` to accept `RuntimeConfig` as a parameter
2. Update `detectTestCommand()` to accept `RuntimeConfig` as a parameter
3. Update `loadSettings()` to accept `RuntimeConfig` as a parameter
4. Remove direct `process.env` access from these functions
5. Update callers to pass the runtime config from `EnvConfig`

## Principles

- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md)
- [Dependency Injection](../principles/dependency-injection.md)
- [Reasonably DRY](../principles/reasonably-dry.md)

## Blocked By

(none)

## Definition of Done

- [ ] Settings detection functions accept `RuntimeConfig` parameter
- [ ] No direct `process.env` access in `lib/config/settings.ts`
- [ ] `bin/dust check` passes
