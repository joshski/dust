# Revealed Tools in Prompt Context

Include full sub-tool definitions in agent prompts for tool families that have been revealed during the session.

## Context

After an agent invokes a tool family and sees the help text, subsequent prompt iterations should include the full sub-tool definitions. This completes the progressive disclosure cycle: summary → reveal → full access.

## Implementation

### Prompt Generation

Modify `formatToolsSection()` to accept revealed families:

```typescript
function formatToolsSection(
  tools: ToolDefinition[],
  revealedFamilies?: Set<string>
): string
```

For each tool with children:
- If the family name is in `revealedFamilies`: render children with full parameter details
- Otherwise: render as summary only (no sub-tool details)

### Repository Loop Integration

Pass revealed families from session state to `formatToolsSection()` at each iteration:
- The bucket worker maintains `revealedFamilies` across the session
- Each prompt generation reads the current set
- New revelations from the previous iteration are included

### Rendered Format for Revealed Families

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

## Principles

- [Progressive Disclosure](../principles/progressive-disclosure.md)
- [Context Window Efficiency](../principles/context-window-efficiency.md)
- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md)

## Blocked By

- [Tool Family Invocation Reveals Sub-Tools](tool-family-invocation-reveals-sub-tools.md)

## Definition of Done

- [ ] `formatToolsSection()` accepts optional revealed families set
- [ ] Unrevealed families render as summaries
- [ ] Revealed families render with full sub-tool details
- [ ] Repository loop passes session state to prompt generation
- [ ] Unit tests verify rendering with and without revealed families
- [ ] `bucket-tool-execution.md` fact is updated to document revelation flow
