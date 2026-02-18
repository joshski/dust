# Automatically enable agent when running `dust bucket` from repo clone

When `dust bucket` connects to the dustbucket WebSocket server, it should send a handshake message with environment details. The server can use this to automatically configure the agent's repository assignments.

## Current State

When `dust bucket` establishes a WebSocket connection (`lib/cli/commands/bucket.ts:477-531`), the client sends no initial message. The server sends a `repository-list` message to which the client responds by cloning and managing those repositories. There is no mechanism for the client to tell the server about its own environment.

The `ws.onopen` handler (line 522) currently only updates local state and logs "Connected to dustbucket" — no data is sent to the server.

## Proposed Change

On `ws.onopen`, send a message to the server with:

```typescript
{
  type: 'agent-connect'
  platform: string   // e.g. "darwin 24.6.0"
  gitRemote?: string // e.g. "git@github.com:joshski/dust.git"
}
```

The `platform` is already computed by `getEnvironmentContext()` in `lib/cli/commands/loop.ts` as `${os.platform()} ${os.release()}`.

The `gitRemote` is the URL of the `origin` remote in the current working directory (from `git remote get-url origin`). If no git remote is configured, the field is omitted.

## Motivation

When a developer runs `dust bucket` from within a git repository clone, the server can infer which repository to assign to this agent without requiring manual configuration. By knowing the git remote URL and OS, the server can:

- Match the agent to the correct repository
- Tailor behavior to the client's operating system

## Related Goals

- [Agent Autonomy](../goals/agent-autonomy.md) - Enabling agents to work effectively without human intervention
- [Easy Adoption](../goals/easy-adoption.md) - Reducing friction when starting with dust

## Open Questions

### How should git remote be detected?

#### Use `git remote get-url origin`

Run `git remote get-url origin` (or `git remote get-url --all origin`) in the current working directory. If this fails (no git repo, no origin remote), omit `gitRemote` from the message.

#### Parse `.git/config` directly

Read `.git/config` to extract the remote URL without spawning a subprocess. More portable but requires manual parsing.

#### Support multiple remotes

Send all configured remote URLs, not just `origin`. The server could match on any of them.

### When should the `agent-connect` message be sent?

#### On initial `onopen` only

Send once when the connection first opens. On reconnection, send again (since the server may have restarted and lost state).

#### On every reconnection

Always send on `onopen`, whether initial connection or reconnect. This is simpler and ensures server state is always refreshed.

### What if the current directory is not a git repository?

#### Omit `gitRemote`

Send the message without `gitRemote`. The server proceeds with manual repository configuration.

#### Omit the field entirely

Same as above but explicitly: the field is optional in the message type.

### Should the message type be `agent-connect` or something else?

#### Use `agent-connect`

The name should reflect that this is an initial greeting from the client, not a repository event. `agent-connect` is clear and descriptive, and matches the pattern of other typed messages in the protocol.

#### Use `client-hello`

Follows common WebSocket handshake conventions.

#### Use `connect`

Short and simple, though less specific about who is connecting.

### Where in bucket.ts should the send occur?

#### In `connectWebSocket()` `ws.onopen` handler

Send after emitting `bucket.connected` (line 523). This is the natural place since it's where the connection is acknowledged.

#### In a new `sendHandshake()` function

Extract into a named function for clarity and testability.
