# Bucket Tool Execution

How server-defined tools flow from the bucket server to agent invocation and back.

## Flow

### 1. Server sends tool definitions

After WebSocket connection, the bucket server sends a `tool-definitions` message containing an array of `ToolDefinition` objects. The bucket worker stores these in `state.tools`.

### 2. Tools are injected into the agent prompt

At each repository loop iteration, `formatToolsSection()` (`lib/bucket/tool-prompt.ts`) renders the current tools as a markdown section with descriptions, parameters, and usage instructions. This section is included in the prompt given to the agent (Claude or Codex). Example output:

```
## Available Tools

### asset-upload
Upload a file as an asset.

Parameters:
- `file` (file, required): The file to upload

Usage: `dust bucket tool asset-upload <file>`
```

### 3. Agent runs `dust bucket tool <name> [args...]`

The agent sees the usage instructions in its prompt and executes the shell command. The `dust bucket tool` subcommand (`lib/cli/commands/bucket-tool.ts`) reads two environment variables set by the parent bucket worker:

- `DUST_PROXY_PORT` — the local command events proxy port
- `DUST_REPOSITORY_ID` — the repository context for the tool call

### 4. Subprocess validates and executes via the local proxy

The `dust bucket tool` subprocess:

1. **GET `/tools`** on the local proxy — fetches the current tool list and validates the tool name exists
2. **POST `/tools/:name`** with `{ "arguments": [...], "repositoryId": "..." }` — requests execution

### 5. Proxy forwards over WebSocket

The command events proxy (`lib/bucket/command-events-proxy.ts`) receives the POST and calls `forwardToolExecution()`, which sends a `tool-execution-request` message over the WebSocket with a unique `requestId` and waits up to 30 seconds for a matching `tool-execution-result` response.

### 6. Result flows back

The server responds with `tool-execution-result` (status: `success`, `tool-not-found`, or `error`). The proxy maps the status to an HTTP status code (200, 404, or 502) and returns JSON to the subprocess. The subprocess prints `output` to stdout on success, or `error` to stderr on failure. The agent sees the command output.

## Key Files

| File | Role |
|------|------|
| `lib/bucket/server-messages.ts` | `ToolDefinition` type and `tool-definitions` message parsing |
| `lib/bucket/tool-prompt.ts` | Formats tool definitions into markdown for agent prompts |
| `lib/bucket/repository-loop.ts` | Reads tools and passes `toolsSection` into each iteration |
| `lib/cli/commands/bucket-tool.ts` | `dust bucket tool` subcommand (child process side) |
| `lib/bucket/command-events-proxy.ts` | Local HTTP proxy that bridges to WebSocket |
| `lib/bucket/tool-executor.ts` | WebSocket request/response correlation logic |

## Related Facts

- [Bucket Protocol](bucket-protocol.md) — WebSocket message formats for `tool-definitions`, `tool-execution-request`, and `tool-execution-result`
- [Command Events Transport](command-events-transport.md) — Local proxy endpoints and error handling
