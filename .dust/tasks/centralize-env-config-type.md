# Centralize Env Config Type

Define a typed `EnvConfig` object that captures all environment variables, read once at startup. Pass the config explicitly to functions that need it.

## Context

The codebase currently accesses `process.env` in 12+ locations across different subsystems. This creates hidden dependencies, test complexity, and no single source of truth for environment variable names.

The decision is to create an `EnvConfig` type and read once at startup, following the "Functional Core, Imperative Shell" principle: the shell reads `process.env` once, then the functional core receives typed configuration.

## Approach

1. Create `lib/env-config.ts` with:
   - An `EnvConfig` type with sub-types for each logical subsystem
   - A `readEnvConfig(env: NodeJS.ProcessEnv): EnvConfig` function that reads and validates all environment variables once
   - Sub-types organized by purpose:
     - `LoggingConfig`: `DEBUG`, `DUST_LOG_DIR`, `DUST_LOG_FILE`
     - `BucketConfig`: `DUST_BUCKET_HOST`, `DUST_BUCKET_TOKEN`, `DUST_BUCKET_AGENT_CONNECT_URL`
     - `SessionConfig`: `DUST_PROXY_PORT`, `DUST_UNATTENDED`, `DUST_SKIP_AGENT`, `DUST_REPOSITORY_ID`, `DUST_REPOS_DIR`
     - `RuntimeConfig`: `BUN_INSTALL`, `DUST_EVENTS_URL`
     - `AgentDetectionConfig`: `CLAUDECODE`, `CLAUDE_CODE_REMOTE`, `CODEX_HOME`, `CODEX_CI`
     - `AuthConfig`: `CLAUDE_CODE_OAUTH_TOKEN`, `OPENAI_API_KEY`
     - `TestingConfig`: `CLAUDE_CODE_VCR_MODE`

2. Update `lib/cli/run.ts` (the imperative shell) to call `readEnvConfig(process.env)` once at startup

3. Thread the config through to one function as a proof of concept (e.g., `createLoggingService`)

4. Add unit tests for `readEnvConfig` to verify parsing and defaults

## Principles

- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md)
- [Dependency Injection](../principles/dependency-injection.md)
- [Test Isolation](../principles/test-isolation.md)
- [Environment-Independent Tests](../principles/environment-independent-tests.md)

## Blocked By

(none)

## Definition of Done

- [ ] `EnvConfig` type with sub-types defined in `lib/env-config.ts`
- [ ] `readEnvConfig()` function reads all environment variables once
- [ ] `lib/cli/run.ts` calls `readEnvConfig(process.env)` at startup
- [ ] At least one existing function updated to receive config instead of reading `process.env`
- [ ] Unit tests verify `readEnvConfig` behavior
- [ ] `bin/dust check` passes
