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
  agents: AgentCapability[]
}
```

### Server response: `connection-ready`

Replaces the separate `tool-definitions` and `repository-list` messages on connect:

```typescript
interface ConnectionReadyMessage {
  type: 'connection-ready'
  tools: ToolDefinition[]
  repositories: RepositoryListItem[]
}
```

### Dynamic updates

`tool-definitions` and `repository-list` remain valid standalone messages that the server can push at any time after the handshake to update tools or repositories mid-session. The handshake just guarantees both are present on initial connect.

## Supersedes

This idea supersedes `send-platform-and-git-remote-on-bucket-connection.md` — the `connection-init` message provides a natural place for platform metadata if needed later.

## Open Questions

### Should the client buffer or reject messages before `connection-ready`?

#### Option: Buffer all messages until `connection-ready` arrives

Similar to today's buffering during capability discovery. Safe but adds complexity.

#### Option: Reject/ignore messages before `connection-ready`

Simpler — the client just waits for `connection-ready` before doing anything. Any `task-available` messages arriving before `connection-ready` would be covered by `hasTask` in the repository list.

### Should `connection-init` include platform metadata?

#### Option: Include platform and git remote now

Absorb the `send-platform-and-git-remote-on-bucket-connection` idea into this handshake.

#### Option: Keep it minimal for now

Only include `dustVersion` and `agents`. Add platform metadata later if needed.
