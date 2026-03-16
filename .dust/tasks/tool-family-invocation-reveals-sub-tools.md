# Tool Family Invocation Reveals Sub-Tools

Return help text when an agent invokes a tool family without a sub-tool. Track revealed families in session state for later prompt inclusion.

## Context

This is the progressive disclosure mechanism: agents see summaries of tool families in their prompt, then drill into specific operations by invoking the family name. The first invocation reveals what's available; subsequent prompts include the full sub-tool definitions.

## Implementation

### Invocation Handling

When `dust bucket tool <family>` is invoked and `<family>` is a tool with children:

1. If no sub-tool is specified (just `dust bucket tool sessions`):
   - Return formatted help text listing available sub-tools with descriptions
   - Mark the family as revealed in session state
   - Exit with success (agent sees the help and can choose a sub-tool)

2. If a sub-tool is specified (`dust bucket tool sessions search --query "failed"`):
   - Look up the sub-tool within the family
   - Execute the sub-tool as normal
   - Mark the family as revealed (if not already)

### Session State

Track revealed families in the bucket worker state:
- Add `revealedFamilies: Set<string>` to session state
- Populate this set when a family is invoked
- Pass revealed families through to prompt generation

### Help Text Format

```
## sessions

Available operations:

### search
Search through past sessions

Parameters:
- `query` (string, required): Search term
- `since` (string, optional): Start date (ISO format)

Usage: `dust bucket tool sessions search <query> [--since <since>]`

### get
Retrieve a specific session by ID
...
```

## Principles

- [Progressive Disclosure](../principles/progressive-disclosure.md)
- [Unsurprising UX](../principles/unsurprising-ux.md)
- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md)

## Blocked By

- [Tool Families: Protocol and Rendering](tool-families-protocol-and-rendering.md)

## Definition of Done

- [ ] Invoking a tool family without a sub-tool returns formatted help text
- [ ] Invoking a tool family marks it as revealed in session state
- [ ] Sub-tool invocation works correctly (routes to child tool)
- [ ] Help text includes full parameter details for all sub-tools
- [ ] Unit tests cover family invocation and revelation tracking
