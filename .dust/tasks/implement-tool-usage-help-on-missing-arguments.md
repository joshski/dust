# Implement Tool Usage Help on Missing Arguments

When a tool is invoked with zero arguments and has required parameters, show usage help instead of executing the tool.

## Background

Tool prompts were simplified to show only tool name and description, omitting parameter schemas to save context window space. The agent discovers schemas by running the tool. Tool families already support this pattern via `formatToolFamilyHelp` — when a family is invoked without a sub-tool, it shows detailed help instead of executing.

Non-family tools currently lack this discovery mechanism. Calling a tool without its required arguments produces an unhelpful server error. This task extends the help-on-invocation pattern to all tools.

## Design

Apply a universal rule: **if a tool is invoked with zero arguments and it has any required parameters, show help instead of executing.** Tools with only optional parameters (e.g., `sessions`) execute normally with no args since that's valid.

This keeps behavior unsurprising — tools that *can* do something useful with no args still do, while tools that *need* args give the agent what it needs to retry correctly.

## Scope

### Pure function: `formatToolHelp`

Add a `formatToolHelp` function to `lib/bucket/tool-prompt.ts` that formats help for a single (non-family) tool:

```typescript
function formatToolHelp(tool: ToolDefinition): string
```

The output should include:
- Tool name and description
- Parameters list (using existing `formatParameter` helper)
- Usage example with parameter placeholders

### Pure function: `hasRequiredParameters`

Add a helper to check if a tool has any required parameters:

```typescript
function hasRequiredParameters(tool: ToolDefinition): boolean
```

### Shell integration

In `lib/cli/commands/bucket-tool.ts`, before calling `executeToolViaProxy` for a non-family tool:

1. Check if `toolArgs` is empty AND the tool has required parameters
2. If so, output `formatToolHelp(tool)` and return success (exit code 0)
3. Otherwise, proceed with normal execution

## Blocked By

(none)

## Principles

- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md)
- [Progressive Disclosure](../principles/progressive-disclosure.md)
- [Unsurprising UX](../principles/unsurprising-ux.md)
- [Unit Test Coverage](../principles/unit-test-coverage.md)

## Definition of Done

- `formatToolHelp` and `hasRequiredParameters` functions exist in `tool-prompt.ts`
- `bucket-tool.ts` shows help for non-family tools invoked without arguments when required parameters exist
- Tools with only optional parameters still execute normally when invoked without arguments
- Existing tests pass; new unit tests cover the help formatting and invocation logic
