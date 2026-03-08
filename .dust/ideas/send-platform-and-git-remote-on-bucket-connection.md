# Send platform and git remote on bucket connection

Send a follow-up handshake with platform and git remote metadata.

## Current State

`dust bucket` now sends `agent-capabilities` immediately after a successful WebSocket connection, but it does not send host platform info or local git remote hints.

## Proposed Change

Add a second handshake payload (or extend the existing one) with:

```typescript
{
  type: 'agent-connect'
  platform: string
  gitRemote?: string
}
```

- `platform` should follow the existing loop context format (for example `${os.platform()} ${os.release()}`).
- `gitRemote` should come from `git remote get-url origin` when available.
- If not in a git repo (or no origin exists), omit `gitRemote`.

## Motivation

This allows dustbucket to infer repository assignment when an agent starts from a local clone, reducing manual setup.

## Open Questions

### Should platform and git remote use a new message type?

#### Option: Keep a separate `agent-connect` message

Use `agent-connect` for environment metadata and keep `agent-capabilities` focused on agent/model availability.

#### Option: Extend `agent-capabilities`

Add optional `platform` and `gitRemote` fields directly to `agent-capabilities` and keep a single connection handshake.

### Should remote detection include only origin?

#### Option: Use only `origin`

Run `git remote get-url origin` and omit `gitRemote` when it is unavailable.

#### Option: Include multiple remotes

Collect all configured remotes and send an array so the server can match any known URL.
