# Add Tool Definitions Protocol Message

Extend the bucket protocol to support server-defined tools. The server sends tool definitions when the client connects, enabling dynamic tool capabilities without CLI updates.

## Context

The [Bucket Protocol](../facts/bucket-protocol.md) currently defines two server-to-client message types: `repository-list` and `task-available`. This task adds a third message type: `tool-definitions`.

Key decisions from the idea decomposition:
- Tools are global (not per-repository)
- The server maintains backwards compatibility for versioning
- This is the foundation for migrating `bucket asset upload` to server-defined

## Implementation

1. Add `ToolDefinitionsMessage` type to `lib/bucket/server-messages.ts`:

```typescript
interface ToolParameter {
  name: string
  type: 'string' | 'file' | 'number' | 'boolean'
  required: boolean
  description: string
}

interface ToolDefinition {
  name: string
  description: string
  endpoint: string
  method: 'GET' | 'POST'
  parameters: ToolParameter[]
}

interface ToolDefinitionsMessage {
  type: 'tool-definitions'
  tools: ToolDefinition[]
}
```

2. Update `ServerMessage` union type to include `ToolDefinitionsMessage`

3. Extend `parseServerMessage()` to handle `tool-definitions` messages with validation

4. Update the [Bucket Protocol](../facts/bucket-protocol.md) fact to document the new message type

## Principles

- [Decoupled Code](../principles/decoupled-code.md) - The protocol types are independent of how tools are executed
- [Agent Autonomy](../principles/agent-autonomy.md) - Server-defined tools enable richer agent capabilities
- [Unit Test Coverage](../principles/unit-test-coverage.md) - Add tests for parsing valid and invalid tool-definitions messages

## Blocked By

(none)

## Definition of Done

- [ ] `ToolDefinition` and `ToolDefinitionsMessage` types exported from `lib/bucket/server-messages.ts`
- [ ] `parseServerMessage()` correctly parses and validates `tool-definitions` messages
- [ ] Unit tests cover valid messages, missing fields, and malformed data
- [ ] [Bucket Protocol](../facts/bucket-protocol.md) fact updated with `tool-definitions` documentation
