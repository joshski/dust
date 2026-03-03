# Server-Defined Bucket Tools

The dustbucket server should be able to define tools that dust exposes to agents working in repositories. This enables the server to extend agent capabilities without requiring dust CLI updates, and provides a mechanism for repository-specific or user-specific tooling.

## Current State

Currently, dust has one hardcoded bucket-related tool:

- **`dust bucket asset upload`**: Uploads a file to dustbucket and returns a public URL (`lib/cli/commands/bucket-asset-upload.ts`)

This command:
- Requires `DUST_REPOSITORY_ID` environment variable (set when running under `dust bucket worker`)
- Uses the same authentication as `dust bucket worker`
- Makes a POST request to `{DUST_BUCKET_HOST}/api/assets?repositoryId=<id>`
- Is registered in `lib/cli/main.ts:64` as `'bucket asset upload': bucketAssetUpload`

The bucket protocol (`lib/bucket/server-messages.ts`) currently defines two server-to-client message types:
- `repository-list`: Sent on connect and when repositories change
- `task-available`: Sent when a new task is ready for a repository

Neither message type includes tool definitions.

## Proposed Architecture

The server would advertise available tools via the WebSocket protocol. When `dust bucket worker` connects, the server sends tool definitions that dust registers as subcommands or exposes to agents.

```
┌─────────────────────────────────────────────────────────────┐
│                     dustbucket.com                           │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                    Tool Registry                      │   │
│  │  - asset-upload: POST /api/assets                    │   │
│  │  - screenshot-capture: POST /api/screenshots         │   │
│  │  - notify-slack: POST /api/notify/slack              │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────────────────────────┬────────────────────────────┘
                                 │ WebSocket
                                 │ (tool-definitions message)
                                 ▼
┌─────────────────────────────────────────────────────────────┐
│                    dust bucket worker                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                  Dynamic Commands                     │   │
│  │  dust bucket tool asset-upload <file>                │   │
│  │  dust bucket tool screenshot-capture <url>           │   │
│  │  dust bucket tool notify-slack <message>             │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Tool Definition Schema

Each tool would be defined with:

```typescript
interface ToolDefinition {
  name: string              // Command name, e.g., "asset-upload"
  description: string       // Human-readable description for help text
  endpoint: string          // Relative API path, e.g., "/api/assets"
  method: 'GET' | 'POST'    // HTTP method
  parameters: ToolParameter[]
  authentication: 'bearer'  // Auth method (bearer token is current standard)
}

interface ToolParameter {
  name: string
  type: 'string' | 'file' | 'number' | 'boolean'
  required: boolean
  description: string
  position?: number         // For positional CLI arguments
}
```

### Protocol Extension

Add a new server-to-client message type:

```typescript
interface ToolDefinitionsMessage {
  type: 'tool-definitions'
  tools: ToolDefinition[]
}

// Update ServerMessage union
type ServerMessage =
  | RepositoryListMessage
  | TaskAvailableMessage
  | ToolDefinitionsMessage
```

### Implementation Components

1. **Message Parsing**: Extend `parseServerMessage()` in `lib/bucket/server-messages.ts` to handle `tool-definitions`

2. **Tool Registry**: New module `lib/bucket/tool-registry.ts` to:
   - Store received tool definitions
   - Generate CLI handlers dynamically
   - Execute tools by calling server endpoints

3. **CLI Integration**: Options for exposing tools:
   - Dynamic subcommands under `dust bucket tool <name>`
   - Or maintain current pattern: `dust bucket <toolname> <args>`

4. **Agent Exposure**: Make tools discoverable by agents via:
   - Environment variables listing available tools
   - A `dust bucket tools` command that outputs JSON
   - Direct integration with agent system prompts

## Benefits

- **Server-side iteration**: Add new tools without dust CLI releases
- **Repository-specific tools**: Server can send different tools per repository
- **User-specific tools**: Premium features, beta tools, or organization-specific tooling
- **Centralized auth**: All tools use the existing bucket token
- **Audit trail**: Server logs all tool invocations

## Related Work

- The existing `bucket-asset-upload.ts` would become the reference implementation for tool execution
- The `UploadDependencies` interface shows a good pattern for testable tool handlers
- Event protocol could be extended to log tool invocations

## Open Questions

### How should tools be exposed to agents?

#### Option: Environment variable listing

Set `DUST_BUCKET_TOOLS` with JSON-encoded tool definitions when spawning agents. Agents parse this and can call `dust bucket tool <name>` directly.

Pros: Simple, no protocol changes. Cons: Large env vars, agents must parse JSON.

#### Option: Command discovery

Agents run `dust bucket tools` to get a list of available tools in a machine-readable format. The command outputs JSON or formatted text suitable for inclusion in prompts.

Pros: Familiar pattern, agents already run dust commands. Cons: Extra command invocation.

#### Option: Inject into agent system prompt

The `dust bucket worker` process modifies the task prompt to include tool documentation before passing to the agent. Tools become part of the agent's context.

Pros: Tools are immediately visible. Cons: Larger prompts, may conflict with existing instructions.

### Should the existing `dust bucket asset upload` become a server-defined tool?

#### Option: Migrate to server-defined

Remove the hardcoded command and let the server define it. This dogfoods the system and reduces CLI maintenance.

Pros: Single source of truth. Cons: Breaking change for scripts that call `dust bucket asset upload` directly before connecting.

#### Option: Keep both

Maintain the hardcoded command as a fallback. Server-defined tools are additive.

Pros: Backwards compatible. Cons: Two code paths for the same functionality.

### How should tool definitions be versioned?

#### Option: Server-side compatibility

The server maintains backwards compatibility. Old clients work with new tool definitions. Parameters have sensible defaults.

Pros: Simple for clients. Cons: Server complexity, limits API evolution.

#### Option: Client declares capabilities

The client sends its dust version on connect. The server returns tool definitions compatible with that version.

Pros: Clean API evolution. Cons: Server must track version compatibility.

#### Option: Tool definition includes version

Each tool has a `version` field. Clients ignore tools with versions they don't understand.

Pros: Granular control. Cons: Complexity in client-side handling.

### Should tools be scoped per-repository or global?

#### Option: Global tools only

All tools are available to all repositories. The server sends one tool-definitions message on connect.

Pros: Simpler. Cons: Can't have repo-specific tools.

#### Option: Per-repository tools

Each repository can have its own tools. The server sends tool-definitions per repository (perhaps as part of `repository-list`).

Pros: Flexible, enables custom integrations. Cons: More complex, tools might need to be fetched dynamically.

#### Option: Both global and per-repository

Global tools plus optional overrides or additions per repository.

Pros: Best of both. Cons: Precedence/merge logic needed.
