# Replace CLI token argument with DUST_BUCKET_TOKEN env var

Replace the CLI argument token mechanism in `resolveToken()` (`lib/cli/commands/bucket.ts:675-705`) with support for the `DUST_BUCKET_TOKEN` environment variable. This aligns with the existing `DUST_BUCKET_HOST` and `DUST_BUCKET_AGENT_CONNECT_URL` patterns and enables CI/CD integration via standard secret injection.

## Implementation

1. In `resolveToken()` at `lib/cli/commands/bucket.ts:675-705`:
   - Remove the CLI argument check (`commandArgs[0]`)
   - Add a check for `process.env.DUST_BUCKET_TOKEN` as the first resolution step
   - Treat empty string as unset (use `process.env.DUST_BUCKET_TOKEN || null` pattern, matching `getDustbucketHost()`)
   - Do not log which token source was used

   The new resolution order should be:
   1. `DUST_BUCKET_TOKEN` environment variable (non-empty)
   2. Stored credential in `~/.dust/credentials.json`
   3. Browser authentication flow

2. Update or add tests in the bucket command test file to cover:
   - `DUST_BUCKET_TOKEN` env var is used when set
   - Empty `DUST_BUCKET_TOKEN` falls through to stored credential
   - Stored credential is still used when env var is not set
   - Remove tests for CLI argument token if any exist

## Goals

- [Unsurprising UX](../goals/unsurprising-ux.md)

## Blocked By

(none)

## Definition of Done

- [ ] `resolveToken()` checks `DUST_BUCKET_TOKEN` env var before stored credential
- [ ] CLI argument is no longer accepted as a token
- [ ] Empty string `DUST_BUCKET_TOKEN` is treated as unset
- [ ] No logging of token source
- [ ] All tests pass
