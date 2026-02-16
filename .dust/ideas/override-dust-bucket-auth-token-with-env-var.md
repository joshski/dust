# Override dust bucket auth token with env var

Allow `DUST_BUCKET_TOKEN` environment variable to override credentials stored in `~/.dust/credentials.json`.

## Current State

The `dust bucket` command resolves authentication tokens through a priority chain defined in `resolveToken()` at `lib/cli/commands/bucket.ts:675-705`:

1. **Explicit CLI argument** - A token passed as the first argument (e.g., `dust bucket my-token`)
2. **Stored credential** - Token loaded from `~/.dust/credentials.json` via `loadStoredToken()`
3. **Browser auth flow** - If neither exists, opens a browser to authenticate with dustbucket.com

The `loadStoredToken()` function in `lib/bucket/auth.ts:29-41` reads the JSON file and extracts the `token` field:

```typescript
export async function loadStoredToken(
  fileSystem: FileSystem,
  homeDir: string
): Promise<string | null> {
  const path = credentialsPath(homeDir)
  try {
    const content = await fileSystem.readFile(path)
    const data = JSON.parse(content)
    return typeof data.token === 'string' ? data.token : null
  } catch {
    return null
  }
}
```

Two similar environment variables already exist:
- `DUST_BUCKET_HOST` - Overrides the authentication host (used by `getDustbucketHost()`)
- `DUST_BUCKET_AGENT_CONNECT_URL` - Overrides the WebSocket URL (used by `getWebSocketUrl()`)

## Motivation

- **CI/CD integration**: Environment variables are the standard way to inject secrets in CI pipelines, containers, and cloud environments
- **Consistency**: Aligns with existing `DUST_BUCKET_HOST` and `DUST_BUCKET_AGENT_CONNECT_URL` patterns
- **No file dependencies**: Avoids needing to create/mount a credentials file in ephemeral environments
- **Secret management**: Works with tools like Vault, AWS Secrets Manager, or GitHub Actions secrets that inject values via environment variables

## Possible Implementation

Add a check for `process.env.DUST_BUCKET_TOKEN` in `resolveToken()` between the CLI argument check and the stored credential check:

```typescript
async function resolveToken(
  commandArgs: string[],
  authDeps: AuthDependencies,
  context: CommandDependencies['context']
): Promise<string | null> {
  // 1. Explicit token argument (backward compat)
  if (commandArgs[0]) {
    return commandArgs[0]
  }

  // 2. Environment variable
  if (process.env.DUST_BUCKET_TOKEN) {
    return process.env.DUST_BUCKET_TOKEN
  }

  // 3. Stored credential
  const stored = await loadStoredToken(...)
  // ... rest unchanged
}
```

This would give the following resolution order:
1. CLI argument
2. `DUST_BUCKET_TOKEN` environment variable
3. Stored credential in `~/.dust/credentials.json`
4. Browser authentication flow

## Open Questions

### Should the environment variable take precedence over stored credentials, or vice versa?

#### Environment variable wins over stored credential (recommended)

Environment variables are typically used for explicit overrides. A user setting `DUST_BUCKET_TOKEN` likely wants it to take effect regardless of what's in the credentials file. This matches how `DUST_BUCKET_HOST` and `DUST_BUCKET_AGENT_CONNECT_URL` work - they override defaults completely.

#### Stored credential wins over environment variable

Stored credentials are user-specific and intentionally persisted. However, this makes it harder to override behavior in CI/CD without modifying the credentials file.

### Should the CLI argument still take precedence over the environment variable?

#### Yes, CLI argument first (recommended)

This maintains backward compatibility and follows the principle of most-explicit-wins. Users who pass a token directly are being maximally explicit about their intent.

#### No, environment variable first

This would be unusual and could break existing scripts that rely on the CLI argument.

### Should we log or indicate which token source was used?

#### Yes, log the source (recommended)

A debug-level message like "Using token from DUST_BUCKET_TOKEN" helps troubleshoot authentication issues. This follows the pattern of logging "Opening browser to authenticate" when using browser auth.

#### No, keep it silent

Token resolution is an internal detail. Less output is cleaner, and logging could inadvertently reveal sensitive information in logs.

### Should an empty string value of DUST_BUCKET_TOKEN be treated as unset?

#### Yes, treat empty string as unset (recommended)

An empty `DUST_BUCKET_TOKEN=""` should fall through to the next resolution step. This prevents accidental authentication failures when the variable is set but empty.

#### No, use the value as-is

The WebSocket connection would fail with an invalid token, which is arguably correct behavior for a misconfigured environment.
