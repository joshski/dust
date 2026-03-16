# Tool Families: Protocol and Rendering

Add nested tool definitions to the bucket protocol. Render tool families as summaries in agent prompts, hiding sub-tool details until revealed.

## Context

Server-defined tools consume context window space. Complex tool sets (session history, artifact management, integrations) could have dozens of tools with complex schemas. Tool families let servers group related tools and only expose summaries upfront.

## Implementation

### Protocol Changes

1. Add optional `children` field to `ToolDefinition`:
   ```typescript
   interface ToolDefinition {
     name: string
     description: string
     endpoint: string
     method: 'GET' | 'POST'
     parameters: ToolParameter[]
     children?: ToolDefinition[]  // Sub-tools, max one level deep
   }
   ```

2. Update `parseServerMessage()` to parse nested tool definitions (children array mirrors parent structure, but children themselves cannot have children)

### Prompt Rendering

Modify `formatToolsSection()`:
- Tools without children render as today (full parameter details)
- Tools with children render as a summary only:
  ```
  ### sessions
  Access historic agent sessions (search, filter, view details)

  Usage: `dust bucket tool sessions` (run to see available operations)
  ```

The sub-tools are not rendered in the initial prompt.

## Principles

- [Progressive Disclosure](../principles/progressive-disclosure.md)
- [Context Window Efficiency](../principles/context-window-efficiency.md)
- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md)

## Blocked By

(none)

## Definition of Done

- [ ] `ToolDefinition` type includes optional `children` array
- [ ] `parseServerMessage()` correctly parses nested tool definitions
- [ ] Children are limited to one level (validation rejects deeper nesting)
- [ ] `formatToolsSection()` renders families as summaries without sub-tool details
- [ ] Unit tests cover parsing and rendering of tool families
- [ ] `bucket-protocol.md` fact is updated to document the new field
