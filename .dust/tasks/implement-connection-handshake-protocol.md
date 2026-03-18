# Implement connection handshake protocol

Replace the fire-and-forget handshake pattern with a request/response protocol. The client sends `connection-init` on connect and waits for `connection-ready` before processing messages.

## Background

The current handshake has ordering dependencies that cause tool definitions to be lost on reconnection. This task implements the new protocol where:

1. Client connects
2. Client sends `connection-init` (includes version, platform, git remote, agent capabilities)
3. Server responds with `connection-ready` (includes tools and repositories) or `connection-rejected`
4. Client processes `connection-ready` atomically, or shuts down on rejection

## Scope

### New message types

Define `ConnectionInitMessage`:

```typescript
interface ConnectionInitMessage {
  type: 'connection-init'
  dustVersion: string
  platform: string
  gitRemote?: string
  agents: AgentCapability[]
}
```

Define `ConnectionReadyMessage`:

```typescript
interface ConnectionReadyMessage {
  type: 'connection-ready'
  tools: ToolDefinition[]
  repositories: RepositoryListItem[]
}
```

Define `ConnectionRejectedMessage`:

```typescript
interface ConnectionRejectedMessage {
  type: 'connection-rejected'
  reason: string
  minimumVersion?: string
}
```

### Client changes

1. Replace `discoverAgentCapabilities` in `BucketDependencies` with a function that builds `ConnectionInitMessage`:
   - Include dust version from `package.json`
   - Include platform as `${os.platform()} ${os.release()}`
   - Include git remote from `git remote get-url origin` (omit if unavailable)
   - Include agent capabilities as today

2. On connect, send `connection-init` instead of `agent-capabilities`

3. Wait for `connection-ready` before processing any server messages:
   - Ignore/reject messages arriving before `connection-ready`
   - Process `tool-definitions` and `repository-list` from the `connection-ready` payload

4. Handle `connection-rejected`:
   - Log the reason
   - Shut down cleanly with no reconnection

### Functional core / imperative shell separation

Pure functions (functional core):
- `buildConnectionInitPayload(version, platform, gitRemote, agents)` - constructs the message
- `parseConnectionResponse(message)` - parses `connection-ready` or `connection-rejected`
- Update `handleServerMessage` to handle new message types

Imperative shell:
- Git remote detection (`git remote get-url origin`)
- Platform detection (`os.platform()`, `os.release()`)
- WebSocket message sending and receiving

### Server coordination

This change requires a simultaneous server update. The client should only be deployed after the server supports `connection-init` and responds with `connection-ready`.

## Blocked By

(none)

## Principles

- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md)
- [Design for Testability](../principles/design-for-testability.md)
- [Decoupled Code](../principles/decoupled-code.md)

## Definition of Done

- `ConnectionInitMessage`, `ConnectionReadyMessage`, and `ConnectionRejectedMessage` types are defined
- Client sends `connection-init` on connect (replacing `agent-capabilities`)
- Client waits for `connection-ready` before processing server messages
- Client handles `connection-rejected` by logging and shutting down
- Pure handshake logic is separated from I/O (functional core / imperative shell)
- Existing tests pass; new tests cover the handshake flow
- `bucket-protocol.md` fact is updated to document the new protocol
