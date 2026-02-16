# Support DUST_BUCKET_TOKEN environment variable

Add support for the `DUST_BUCKET_TOKEN` environment variable to authenticate with dustbucket, and remove the CLI argument token option.

## Context

The `dust bucket` command currently resolves authentication tokens through:
1. Explicit CLI argument (e.g., `dust bucket my-token`)
2. Stored credential in `~/.dust/credentials.json`
3. Browser authentication flow

This task changes the resolution order to:
1. `DUST_BUCKET_TOKEN` environment variable (new)
2. Stored credential in `~/.dust/credentials.json`
3. Browser authentication flow

The CLI argument is removed because environment variables are the standard way to inject secrets in CI/CD environments.

## Implementation

In `lib/cli/commands/bucket.ts`, modify `resolveToken()`:
- Remove the check for `commandArgs[0]` (CLI argument)
- Add a check for `process.env.DUST_BUCKET_TOKEN` at the start
- Treat empty string as unset (fall through to next option)
- Do not log which token source was used

This aligns with existing patterns like `DUST_BUCKET_HOST` and `DUST_BUCKET_AGENT_CONNECT_URL`.

## Goals

(none)

## Blocked By

(none)

## Definition of Done

- [ ] `resolveToken()` checks `DUST_BUCKET_TOKEN` env var first
- [ ] Empty string `DUST_BUCKET_TOKEN` is treated as unset
- [ ] CLI argument token option is removed
- [ ] Tests verify environment variable takes precedence over stored credential
- [ ] Tests verify empty string falls through to stored credential
- [ ] All existing tests pass
