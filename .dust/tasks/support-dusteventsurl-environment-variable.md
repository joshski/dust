# Support DUST_EVENTS_URL environment variable

Add support for an `eventsUrl` configuration setting that can be overridden via the `DUST_EVENTS_URL` environment variable.

## Context

The Progress Broadcasting idea (`.dust/ideas/progress-broadcasting.md`) describes streaming dust events to a central server. To support this, we need a configurable `eventsUrl` setting. Environment variable override is essential for:

- CI/CD pipelines where config may differ from local settings
- Testing with different event servers
- Containerized deployments with externalized configuration

## Implementation

### 1. Add `eventsUrl` to DustSettings type

In `lib/cli/types.ts`, add to the `DustSettings` interface:

```typescript
export interface DustSettings {
  dustCommand: string
  checks?: CheckConfig[]
  eventsUrl?: string  // URL for streaming events (e.g., websocket endpoint)
}
```

### 2. Modify loadSettings to support env override

In `lib/config/settings.ts`, modify `loadSettings()` to:

1. Load `eventsUrl` from settings.json if present
2. Override with `process.env.DUST_EVENTS_URL` if the env var is set

The env var should take precedence over the config file value. Example pattern (following existing `BUN_INSTALL` precedent):

```typescript
// After loading settings from JSON
if (process.env.DUST_EVENTS_URL) {
  result.eventsUrl = process.env.DUST_EVENTS_URL
}
```

### 3. Add tests

In `lib/config/settings.test.ts`, add tests for:

- Loading `eventsUrl` from settings.json
- `DUST_EVENTS_URL` env var overrides settings.json value
- `DUST_EVENTS_URL` env var works when settings.json has no eventsUrl
- Absence of both env var and config results in undefined eventsUrl

## Goals

- [Easy Adoption](../goals/easy-adoption.md) - Environment variables are a standard configuration pattern for CI/CD and containers

## Blocked by

(none)

## Definition of done

- [ ] `DustSettings` interface includes optional `eventsUrl` field
- [ ] `loadSettings()` reads `eventsUrl` from settings.json
- [ ] `DUST_EVENTS_URL` environment variable overrides config file value
- [ ] Tests cover all scenarios (config only, env only, both, neither)
- [ ] All existing tests pass
