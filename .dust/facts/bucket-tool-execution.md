# Bucket Tool Execution

How server-defined tools flow from the bucket server to agent invocation and back.

## Flow

### 1. Server sends tool definitions

After WebSocket connection, the bucket server sends a `tool-definitions` message containing an array of `ToolDefinition` objects. The bucket worker stores these in `state.tools`.

### 2. Tools are injected into the agent prompt

At each repository loop iteration, `formatToolsSection()` ([`lib/bucket/tool-prompt.ts`](../../lib/bucket/tool-prompt.ts)) renders the current tools as a markdown section with descriptions, parameters, and usage instructions. This section is included in the prompt given to the agent (Claude or Codex). Example output:

```
## Available Tools

### asset-upload
Upload a file as an asset.

Parameters:
- `file` (file, required): The file to upload

Usage: `dust bucket tool asset-upload <file>`
```

### 3. Agent runs `dust bucket tool <name> [args...]`

The agent sees the usage instructions in its prompt and executes the shell command. The `dust bucket tool` subcommand ([`lib/cli/commands/bucket-tool.ts`](../../lib/cli/commands/bucket-tool.ts)) reads two environment variables set by the parent bucket worker:

- `DUST_PROXY_PORT` — the local command events proxy port
- `DUST_REPOSITORY_ID` — the repository context for the tool call

### 4. Subprocess validates and executes via the local proxy

The `dust bucket tool` subprocess:

1. **GET `/tools`** on the local proxy — fetches the current tool list and validates the tool name exists
2. For **tool families** (tools with children):
   - If no sub-tool specified (`dust bucket tool sessions`): returns help text listing available sub-tools and marks the family as revealed via **POST `/reveal/:family`**
   - If sub-tool specified (`dust bucket tool sessions search <query>`): executes via **POST `/tools/family%2Fsubtool`** which also marks the family as revealed
3. For **regular tools**: **POST `/tools/:name`** with `{ "arguments": [...], "repositoryId": "..." }` — requests execution

### Tool Family Revelation

The bucket worker maintains `state.revealedFamilies: Set<string>` to track which tool families the agent has explored. The revelation flow completes the progressive disclosure cycle:

1. **Initial prompt** — Tool families render as summaries with `Usage: \`dust bucket tool <family>\` (run to see available operations)`
2. **Agent invokes family** — Running the tool without a sub-tool returns help text and marks the family as revealed via **POST `/reveal/:family`**
3. **Subsequent prompts** — `formatToolsSection()` receives `revealedFamilies` and renders revealed families with full sub-tool details:

```
### sessions
Access historic agent sessions (search, filter, view details)

**Sub-tools:**

#### search
Search through past sessions

Parameters:
- `query` (string, required): Search term
- `since` (string, optional): Start date (ISO format)

Usage: `dust bucket tool sessions search <query> [--since <since>]`

#### get
Retrieve a specific session by ID
...
```

The `getRevealedFamilies` callback in `RepositoryDependencies` provides access to the current set at each loop iteration

### 5. Proxy forwards over WebSocket

The command events proxy ([`lib/bucket/command-events-proxy.ts`](../../lib/bucket/command-events-proxy.ts)) receives the POST and calls `forwardToolExecution()` in `bucket.ts`. This converts the positional `string[]` arguments to named `Record<string, unknown>` parameters using the tool definition, then sends a `tool-execution-request` message over the WebSocket with a unique `requestId`. It waits up to 30 seconds for a matching `tool-execution-result` response.

The wire format uses named arguments (`{ tool, repositoryId, arguments: Record<string, unknown> }`) rather than the positional format used locally between the subprocess and proxy.

### 6. Result flows back

The server responds with `tool-execution-result` containing a discriminated union result (`{ type: 'success', data }`, `{ type: 'tool-not-found', message }`, or `{ type: 'error', message }`). The proxy maps the result type to an HTTP status code (200, 404, or 502) and returns JSON to the subprocess. The subprocess prints output to stdout on success, or error to stderr on failure. The agent sees the command output.

### Wire format types

The protocol types (`ToolExecutionRequestMessage`, `ToolExecutionResultMessage`, etc.) are defined in [`lib/bucket/tool-execution-protocol.ts`](../../lib/bucket/tool-execution-protocol.ts) and exported from `@joshski/dust/types`. Downstream server implementations (e.g. dustbucket) should import these types and use the validation functions (`isToolExecutionRequestMessage`, `isToolExecutionResultMessage`) to ensure protocol compliance.

## Key Files

| File | Role |
|------|------|
| [`lib/bucket/server-messages.ts`](../../lib/bucket/server-messages.ts) | `ToolDefinition` type and `tool-definitions` message parsing |
| [`lib/bucket/tool-prompt.ts`](../../lib/bucket/tool-prompt.ts) | Formats tool definitions into markdown for agent prompts |
| [`lib/bucket/repository-loop.ts`](../../lib/bucket/repository-loop.ts) | Reads tools and passes `toolsSection` into each iteration |
| [`lib/cli/commands/bucket-tool.ts`](../../lib/cli/commands/bucket-tool.ts) | `dust bucket tool` subcommand (child process side) |
| [`lib/bucket/command-events-proxy.ts`](../../lib/bucket/command-events-proxy.ts) | Local HTTP proxy that bridges to WebSocket |
| [`lib/bucket/tool-execution-protocol.ts`](../../lib/bucket/tool-execution-protocol.ts) | Wire format types for WebSocket tool execution messages |
| [`lib/bucket/tool-executor.ts`](../../lib/bucket/tool-executor.ts) | Direct tool execution (for non-proxy paths) |

## Related Facts

- [Bucket Protocol](bucket-protocol.md) — WebSocket message formats for `tool-definitions`, `tool-execution-request`, and `tool-execution-result`
- [Command Events Transport](command-events-transport.md) — Local proxy endpoints and error handling
