# Bucket Protocol

This document specifies the WebSocket protocol between a dustbucket server and dust clients running `dust bucket`.

## WebSocket Connection

### URL Format

The default WebSocket URL is `wss://dustbucket.com/agent/connect`. Override with the `DUST_BUCKET_AGENT_CONNECT_URL` environment variable.

### Authentication

Clients authenticate via Bearer token in the Authorization header:

```
Authorization: Bearer <token>
```

Tokens are obtained through browser-based OAuth:

1. Client starts a local HTTP server on an ephemeral port
2. Client opens `https://dustbucket.com/auth/cli?port=<port>` in the browser
3. User authenticates in the browser
4. Browser redirects to `http://localhost:<port>/callback?code=<code>`
5. Client exchanges the code for a token via `POST https://dustbucket.com/auth/cli/exchange`
6. Token is stored in `~/.dust/credentials.json`

Environment variables:

| Variable | Purpose |
|----------|---------|
| `DUST_BUCKET_TOKEN` | Skip stored credentials; use this token directly |
| `DUST_BUCKET_HOST` | Override the dustbucket host for auth (default: `https://dustbucket.com`) |
| `DUST_BUCKET_AGENT_CONNECT_URL` | Override the WebSocket URL |

### Reconnection Behavior

On disconnect, clients reconnect with exponential backoff starting at 1 second, capped at 30 seconds. The delay resets to 1 second on successful connection.

Exception: Close code `4000` indicates the server replaced this connection with a newer one from the same user. Clients should not reconnect in this case.

## Server-to-Client Messages

Messages are JSON objects with a `type` field. Three server-to-client message types and one response message type are defined:

### repository-list

Sent when the client connects and whenever the user's repository list changes.

```typescript
interface RepositoryListMessage {
  type: 'repository-list'
  repositories: RepositoryListItem[]
}

interface RepositoryListItem {
  name: string          // Repository display name
  gitUrl: string        // Git clone URL
  gitSshUrl?: string    // SSH clone URL (used when available)
  url: string           // Web URL for the repository
  id: number            // Server-side repository ID
  hasTask: boolean      // True if a task is waiting
  agentProvider?: string // Agent to use: 'claude' (default) or 'codex'
}
```

Required fields: `name`, `gitUrl`, `url`, `id`, `hasTask`. Optional: `gitSshUrl`, `agentProvider`.

On receiving this message, clients:

1. Clone repositories not already present locally
2. Remove local repositories no longer in the list
3. Start agent loops for repositories with `hasTask: true`

### task-available

Sent when a new task is available for a repository.

```typescript
interface TaskAvailableMessage {
  type: 'task-available'
  repository: string  // Repository name
}
```

On receiving this message, clients wake the agent loop for the specified repository.

### tool-definitions

Sent when the client connects to provide available server-defined tools. Tools are global (not per-repository).

```typescript
interface ToolDefinitionsMessage {
  type: 'tool-definitions'
  tools: ToolDefinition[]
}

interface ToolDefinition {
  name: string        // Tool identifier
  description: string // Human-readable description
  endpoint: string    // API endpoint path
  method: 'GET' | 'POST'
  parameters: ToolParameter[]
}

interface ToolParameter {
  name: string        // Parameter identifier
  type: 'string' | 'file' | 'number' | 'boolean'
  required: boolean
  description: string // Human-readable description
}
```

All fields are required. The `tools` array may be empty if no server-defined tools are available.

On receiving this message, clients store the tool definitions for use in agent prompts. The server maintains backwards compatibility; older clients that don't recognize this message type will ignore it.

### tool-execution-result

Sent in response to a client's `tool-execution-request` (see below).

```typescript
interface ToolExecutionResultMessage {
  type: 'tool-execution-result'
  requestId: string              // Matches the client's request
  status: 'success' | 'tool-not-found' | 'error'
  output?: string                // Tool output on success
  error?: string                 // Error message on failure
}
```

## Client-to-Server Messages

Clients send three categories of messages over the WebSocket:

### Agent session events

Events following the [Dust Event Protocol](dust-event-protocol.md) `EventMessage` envelope:

- `sequence` — Monotonically increasing counter
- `timestamp` — ISO 8601 timestamp
- `sessionId` — UUID for the dust session
- `repository` — Repository name
- `agentSessionId` — UUID for the current agent run (present after `agent-session-started`)
- `event` — The event payload

| Event Type | When Sent |
|------------|-----------|
| `agent-session-started` | Agent begins working on a task |
| `agent-session-ended` | Agent completes or fails |
| `agent-session-activity` | Heartbeat during agent work |
| `agent-event` | Raw agent streaming events (with `provider` field) |

### Command events (forwarded from subprocesses)

When the agent runs dust subcommands (e.g. `dust check`, `dust next`), those subprocesses POST `CommandEventMessage` payloads to a per-iteration command events proxy via `DUST_PROXY_PORT`. The proxy wraps each command event in an `EventMessage` envelope with the correct `sessionId`, `repository`, `repoId`, and `agentSessionId`, using a `command-event` wrapper: `{ type: 'command-event', commandEvent: <original event> }`. This makes command events easy to discriminate from agent events.

Command event types (inside `commandEvent`) include: `check-started`, `check-passed`, `check-failed`, `tasks-listed`, `facts-listed`, `ideas-listed`, `principles-listed`.

### Tool execution requests

Sent when the agent invokes a server-defined tool via `dust bucket tool <name>`.

```typescript
interface ToolExecutionRequestMessage {
  type: 'tool-execution-request'
  requestId: string       // UUID for correlating the response
  toolName: string        // Tool identifier from tool-definitions
  arguments: string[]     // Positional arguments
  repositoryId: string    // Repository context
}
```

The client waits up to 30 seconds for a matching `tool-execution-result` response. The request flows: `dust bucket tool` subprocess → HTTP POST to proxy `/tools/:name` → proxy sends over WebSocket → server responds with `tool-execution-result` → proxy returns HTTP response to subprocess.

## Expected Server Behavior

### Connection Lifecycle

1. Accept WebSocket connections with valid Bearer tokens
2. Send `repository-list` immediately after connection
3. Send `tool-definitions` after connection (if tools are available)
4. Send `repository-list` when the user's repositories change
5. Send `task-available` when a new task is created for a repository
6. Close with code `4000` when replacing a connection from the same user

### Task Signaling

The server should send `task-available` when:

- A new task is created for a repository
- A task becomes unblocked
- The server wants to wake an idle agent

The `hasTask` field in `repository-list` provides initial state. Subsequent task availability is signaled via `task-available` messages.

### Event Handling

Servers receive client events for monitoring, logging, and UI updates. Event handling is implementation-specific. The `agent-session-activity` event serves as a heartbeat and need not be stored.

### Tool Execution

When a client sends a `tool-execution-request`, the server should execute the tool and respond with a `tool-execution-result` on the same WebSocket connection, using the same `requestId`. Clients time out after 30 seconds if no response is received.

## Related Documentation

- [Dust Event Protocol](dust-event-protocol.md) — Wire format for agent session events
- [Command Events Transport](command-events-transport.md) — Local proxy for subprocess command events and tool execution
- [Loop Command](loop-command.md) — The agent loop that runs within each repository
