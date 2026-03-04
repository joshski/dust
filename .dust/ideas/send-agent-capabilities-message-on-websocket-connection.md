# Send Agent Capabilities Message on WebSocket Connection

When `dust bucket worker` connects, it should declare which agents and models are available locally. This enables the server to route tasks to capable workers.

## Context

Currently the bucket protocol is one-directional for capability awareness:

1. The server sends `repository-list` messages with `agentProvider` hints (e.g., `'claude'` or `'codex'`)
2. The client blindly attempts to use whatever agent the server specifies
3. If the requested agent isn't available locally, the loop fails

This creates several problems:

- The server has no visibility into what agents are actually available on the client
- The server cannot route tasks to clients based on their capabilities
- Model-specific features cannot be leveraged because the server doesn't know which models each agent supports
- Users must manually configure which agents their workers support

### Existing Agent Detection

The agent detection module (`lib/agents/detection.ts`) identifies which agent environment is running:
- `CLAUDECODE` + `CLAUDE_CODE_REMOTE` → Claude Code Web
- `CLAUDECODE` → Claude Code
- `CODEX_HOME` or `CODEX_CI` → Codex
- Fallback → unknown

However, this detection happens within agent sessions, not at the bucket worker level. The worker currently has no way to proactively detect which agents are available.

### Agent Key Detection

Determining agent availability requires checking for:
- **Claude Code**: `claude` CLI present and authenticated (checks `~/.claude/` credentials or `CLAUDE_CODE_OAUTH_TOKEN`)
- **Codex**: `codex` CLI present and `OPENAI_API_KEY` environment variable set

### Model Discovery

Model availability varies between accounts and agents:

- **Codex/OpenAI**: API endpoint exists to list models:
  ```bash
  curl -s https://api.openai.com/v1/models \
    -H "Authorization: Bearer $OPENAI_API_KEY" \
  | jq -r '.data[].id'
  ```

- **Claude Code**: No CLI command currently exists for model discovery ([anthropics/claude-code#12612](https://github.com/anthropics/claude-code/issues/12612) requests this feature). Options include:
  - Hardcoded alias list (`haiku`, `sonnet`, `opus`)
  - Attempt to call the Anthropic API directly
  - Wait for the requested CLI feature

### Bucket Protocol Events

The bucket protocol already supports client-to-server messages via `EventMessage` (see `lib/bucket/events.ts`). Current event types include:
- `agent-session-started`
- `agent-session-ended`
- `agent-session-activity`
- `agent-event`

A new message type would need to be added for capabilities.

### Related Ideas

- [Support codex in `dust bucket` command](support-codex-in-dust-bucket-command.md) — Addresses agent selection but assumes server-driven choice
- [Server-defined bucket tools](server-defined-bucket-tools.md) — Related to extending bucket protocol

### Principles Alignment

- [Agent-Agnostic Design](../principles/agent-agnostic-design.md) — The capability message enables the server to route work to the right agent without hardcoding assumptions
- [Agent-Specific Enhancement](../principles/agent-specific-enhancement.md) — Model information allows the server to optimize task assignment

## Open Questions

### When should capabilities be sent?

#### On initial connection

Send capabilities immediately after the WebSocket connection is established, before receiving `repository-list`. This allows the server to filter the repository list to only include repos the client can actually serve.

#### After receiving repository-list

Send capabilities in response to the repository list, which may be simpler to implement but delays the server's ability to make informed decisions.

#### Periodically

Capabilities could change during a session (e.g., API key rotation). Periodic updates would keep the server in sync, but add complexity.

### What should the capabilities message contain?

#### Minimal: just agent types

```typescript
interface AgentCapabilitiesMessage {
  type: 'agent-capabilities'
  agents: Array<'claude' | 'codex'>
}
```

Simple and sufficient for basic routing.

#### With models

```typescript
interface AgentCapabilitiesMessage {
  type: 'agent-capabilities'
  agents: Array<{
    type: 'claude' | 'codex'
    models?: string[]
  }>
}
```

Enables model-specific task routing but requires solving model discovery.

#### With machine metadata

```typescript
interface AgentCapabilitiesMessage {
  type: 'agent-capabilities'
  machineName: string
  platform: string
  agents: Array<{
    type: 'claude' | 'codex'
    models?: string[]
    version?: string
  }>
}
```

Richer context for debugging and analytics, but potentially excessive.

### How should agent availability be detected?

#### Check CLI presence only

Run `which claude` and `which codex` to see if the CLIs are installed. Fast but doesn't verify authentication.

#### Verify authentication

For Claude, check for `~/.claude/` credentials or `CLAUDE_CODE_OAUTH_TOKEN`. For Codex, check `OPENAI_API_KEY`. More reliable but requires filesystem access and env inspection.

#### Probe with a minimal command

Run a lightweight command (e.g., `claude --version`) to verify the agent is functional. Most reliable but adds latency.

### How should model discovery work for Claude Code?

#### Use hardcoded aliases

Assume standard aliases (`haiku`, `sonnet`, `opus`) are available. Simple but may not reflect actual account access.

#### Skip model discovery for Claude

Only report models for Codex (where API discovery works). The server assumes Claude has default model access.

#### Wait for `claude model list`

The requested feature ([anthropics/claude-code#12612](https://github.com/anthropics/claude-code/issues/12612)) would provide a proper solution. Implement capabilities without models initially, add model support when the CLI feature ships.

### Should the server acknowledge capabilities?

#### Fire-and-forget

Send capabilities and proceed. The server processes them asynchronously. Simple but the client doesn't know if capabilities were received.

#### Wait for acknowledgment

The server sends an acknowledgment message before the client proceeds. More reliable but adds round-trip latency and protocol complexity.

#### Include in repository-list response

The server could send a modified `repository-list` that reflects the client's capabilities (e.g., only including repos the client can serve). Implicit acknowledgment through behavior.
