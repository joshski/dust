# Progressively disclose tools

Server-defined tools should be arbitrarily complex without consuming the context window with details of tools that may never be used.

## Current State

The bucket protocol sends a `tool-definitions` message on connection containing all available tools. Each `ToolDefinition` includes name, description, endpoint, method, and a full `parameters` array. The `formatToolsSection()` function in `lib/bucket/tool-prompt.ts` renders every tool with all parameters into the agent prompt.

This works well for a small number of simple tools (like `asset-upload`), but doesn't scale. A server exposing session history access, artifact management, or integrations would need to describe search parameters, pagination options, filter syntax, and relationship traversal—potentially dozens of tools with complex schemas.

## Proposal

Introduce a tiered tool system where agents discover tool "families" first, then drill into specific operations as needed. Similar to exploring a REST API by following links, or how MCP keeps tool schemas separate from capabilities.

**Example: Session History**

Instead of sending 10+ session-related tools upfront:

1. Agent sees: "sessions — Access historic agent sessions (search, filter, view details)"
2. Agent runs: `dust bucket tool sessions`
3. Server returns: available subtools with full parameter definitions
4. Agent picks: `dust bucket tool sessions search --query "failed" --since "2024-01"`

The full parameter schemas for `sessions search`, `sessions get`, `sessions timeline`, etc. only enter the context when the agent starts using the sessions family.

## Related Concepts

- **Progressive Disclosure principle** — Dust already applies this to artifacts (titles → details → linked content)
- **Context Window Efficiency** — Every token matters; upfront tool docs compete with code reasoning
- **REST HATEOAS** — Discover actions through resource links rather than complete API docs
- **MCP design** — Claude Code loads tool definitions on-demand rather than all at connection time

## Open Questions

### How should tool families be represented in the protocol?

#### Flat list with grouping metadata

Keep `ToolDefinition[]` but add optional `group` and `discoverable: boolean` fields. Top-level tools with `discoverable: true` hide their sub-operations until invoked.

#### Nested tool definitions

Add `children: ToolDefinition[]` to represent hierarchy directly. The root `ToolDefinition` describes the family; children are revealed when requested.

#### Separate endpoint for discovery

Initial `tool-definitions` sends only family summaries. Agents call a `tools/discover/:family` endpoint to fetch detailed schemas.

### When should sub-tools be revealed?

#### On first invocation

Agent runs `dust bucket tool sessions` with no subcommand. Server returns help text listing available operations. This mirrors CLI conventions.

#### On explicit discovery command

Agent runs `dust bucket tool --discover sessions` to fetch sub-tool definitions without executing anything. More explicit but adds a new command pattern.

#### Automatically when agent mentions the family

Monitor agent output for tool family names and proactively send definitions. Risky—could trigger on false matches.

### How should revealed tools be persisted within a session?

#### Append to prompt context

Once revealed, sub-tool definitions remain in the agent's system prompt for the rest of the session. Simple but accumulates context.

#### Re-query on each iteration

Agent re-discovers tools each iteration. Wastes tokens on stable tool sets but avoids stale definitions.

#### Cache locally, invalidate on server signal

Client caches revealed tool definitions. Server sends a `tool-definitions-updated` message when changes occur. Best efficiency but more complex.

### Should sub-tools support further nesting?

#### Two levels maximum (family → tools)

Simple mental model. Families contain tools, tools have parameters. No deeper hierarchy.

#### Arbitrary depth

Allow `sessions → search → advanced-filters → date-range`. Mirrors complex APIs but risks confusing agents and bloating discovery.
