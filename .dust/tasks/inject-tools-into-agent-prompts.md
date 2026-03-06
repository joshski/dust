# Inject Tools Into Agent Prompts

Inject server-defined tool documentation into agent system prompts so agents know what tools are available.

## Context

This task builds on the tool definitions support in the [Bucket Protocol](../facts/bucket-protocol.md). Once the client can parse tool definitions, the next step is making them available to agents.

Key decision: Tools are injected into the agent system prompt (not via environment variables or a discovery command). This makes tools immediately visible without extra agent invocations.

## Implementation

1. Store received tool definitions in the bucket worker state when handling `tool-definitions` messages

2. When constructing the agent task prompt, append a tools section:

```markdown
## Available Tools

### asset-upload
Upload a file to dustbucket and get a public URL.

Parameters:
- `file` (file, required): The file to upload

Usage: `dust bucket tool asset-upload <file>`
```

3. Format should be clear for agents to understand and use

4. Handle the case where no tools are defined (no injection)

## Principles

- [Agent Autonomy](../principles/agent-autonomy.md) - Agents need to know what tools are available
- [Context Window Efficiency](../principles/context-window-efficiency.md) - Tool descriptions should be concise
- [Agent-Agnostic Design](../principles/agent-agnostic-design.md) - Documentation format should work across different agents

## Blocked By

(none)

## Definition of Done

- [ ] Bucket worker stores tool definitions from `tool-definitions` messages
- [ ] Agent task prompts include formatted tool documentation when tools are available
- [ ] Tool descriptions are clear and include usage examples
- [ ] Tests verify prompt injection with various tool configurations
