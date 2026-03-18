# Connection handshake redesign

Redesign the bucket WebSocket handshake to use a request/response pattern. The server should respond to the client's opening message with a single payload containing both tool definitions and the repository list, fixing a bug where tool definitions are lost on reconnection.

## Current State

The current handshake has a fragile ordering dependency:

1. Client connects
2. Server immediately sends `tool-definitions` and `repository-list` as separate fire-and-forget messages
3. Client buffers both while discovering agent capabilities
4. Client sends `agent-capabilities` (fire-and-forget, server ignores it)
5. Client drains buffer, processes `tool-definitions` then `repository-list`

On reconnect after a server restart, `state.tools` should be repopulated from the new `tool-definitions` message, but in practice tool definitions are lost — agents run without tools until the dust process is fully restarted.

## Proposed Change

Replace the fire-and-forget pattern with a request/response handshake:

1. Client connects
2. Client sends a `connection-init` message (renamed from `agent-capabilities`, broadened to include version info)
3. Server validates the client version and responds with a single `connection-ready` message containing tools and repositories
4. Client processes `connection-ready` atomically

### Client message: `connection-init`

Replaces `agent-capabilities`. Includes everything the server needs from the client upfront:

```typescript
interface ConnectionInitMessage {
  type: 'connection-init'
  dustVersion: string
  platform: string
  gitRemote?: string
  agents: AgentCapability[]
}
```

- `platform` follows the existing loop context format (`${os.platform()} ${os.release()}`)
- `gitRemote` comes from `git remote get-url origin` when available; omit if not in a git repo or no origin exists

### Server response: `connection-ready`

Replaces the separate `tool-definitions` and `repository-list` messages on connect:

```typescript
interface ConnectionReadyMessage {
  type: 'connection-ready'
  tools: ToolDefinition[]
  repositories: RepositoryListItem[]
}
```

### Version rejection: `connection-rejected`

If the server rejects the client's version, it responds with:

```typescript
interface ConnectionRejectedMessage {
  type: 'connection-rejected'
  reason: string
  minimumVersion?: string
}
```

On receiving `connection-rejected`, the client should log the reason and shut down cleanly — no reconnection attempts. This applies to both `dust bucket` and `dust loop` processes.

### Dynamic updates

`tool-definitions` and `repository-list` remain valid standalone messages that the server can push at any time after the handshake to update tools or repositories mid-session. The handshake just guarantees both are present on initial connect.

## Supersedes

This idea absorbs `send-platform-and-git-remote-on-bucket-connection.md` — the `connection-init` message now includes platform and git remote metadata.

## Resolved Questions

### Should the client buffer or reject messages before `connection-ready`?

**Decision:** Reject/ignore messages before `connection-ready`. The client waits for `connection-ready` before doing anything. Any `task-available` messages arriving before `connection-ready` are covered by `hasTask` in the repository list.

### Should `connection-init` include platform metadata?

**Decision:** Include platform and git remote now, absorbing the `send-platform-and-git-remote-on-bucket-connection` idea into this handshake.

## Open Questions

### Should git remote detection include multiple remotes?

#### Option: Use only `origin`

Run `git remote get-url origin` and omit `gitRemote` when unavailable. Simple and covers the common case.

#### Option: Include multiple remotes

Collect all configured remotes and send an array so the server can match any known URL. More flexible but adds complexity.

### Should the client have a handshake timeout?

#### Option: Add a timeout

Fail the connection after N seconds if `connection-ready` isn't received. The client logs an error and shuts down (or reconnects with backoff). The current implementation waits indefinitely for agent capability discovery, so adding an explicit timeout would surface this class of failure faster.

#### Option: No timeout

Trust the server to respond promptly. If it doesn't, the WebSocket will eventually fail with a network timeout or close event. Keeps the client simpler and relies on underlying transport timeouts.

### How should version rejection interact with WebSocket close codes?

#### Option: Use a message then close

Server sends `connection-rejected` message with reason, then closes the WebSocket normally. Client processes the message before shutdown, giving it a chance to display the reason clearly.

#### Option: Close with a custom code

Use a new close code (e.g., `4001`) for version rejection. Simpler wire protocol but less descriptive — the reason would need to come from the close reason string (max 123 bytes).

#### Option: Keep the connection open

Server sends `connection-rejected` but leaves the WebSocket open. Client reads the reason, logs it, and initiates its own close. Allows for potential back-and-forth (e.g., "upgrade available at X").

### How should older clients interoperate with newer servers?

#### Option: Server supports both message types

Server accepts either `agent-capabilities` or `connection-init`. For `agent-capabilities`, it responds as it does today (separate `tool-definitions` and `repository-list`). For `connection-init`, it responds with `connection-ready`. Allows gradual rollout without coordination.

#### Option: Require simultaneous upgrade

Deploy the server change only after all clients are updated. Simpler protocol but requires coordinated rollout and risks breaking clients that haven't updated.

#### Option: Protocol version negotiation

Client sends a protocol version in an initial message. Server responds based on the version. Adds complexity now but makes future protocol changes easier to roll out incrementally.
