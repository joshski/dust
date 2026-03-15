# Migrate Bucket to Env Config

Update bucket-related modules to receive configuration from `EnvConfig` instead of reading `process.env` directly.

## Context

Bucket modules access several environment variables directly:
- `lib/bucket/auth.ts`: `DUST_BUCKET_HOST`
- `lib/bucket/repository-loop.ts`: `CLAUDE_CODE_OAUTH_TOKEN`
- `lib/cli/commands/bucket-worker.ts`: `DUST_BUCKET_AGENT_CONNECT_URL`, `DUST_BUCKET_TOKEN`
- `lib/bucket/native-io.ts`, `lib/bucket/repository.ts`: `DUST_REPOS_DIR` (via `getReposDir`)

Some of these already accept `env` as a parameter with a default of `process.env`, which is a good pattern but incomplete.

## Approach

1. Ensure all bucket-related functions receive config from `EnvConfig`
2. Remove default `process.env` values from function signatures
3. Update callers to explicitly pass config
4. Simplify bucket tests by removing `process.env` manipulation

## Principles

- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md)
- [Dependency Injection](../principles/dependency-injection.md)
- [Test Isolation](../principles/test-isolation.md)

## Blocked By

(none)

## Definition of Done

- [ ] Bucket functions accept config parameters without `process.env` defaults
- [ ] No direct `process.env` access in bucket modules
- [ ] Bucket tests use explicit config instead of `process.env` manipulation
- [ ] `bin/dust check` passes
