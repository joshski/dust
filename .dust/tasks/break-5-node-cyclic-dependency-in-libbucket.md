# Break 5-node cyclic dependency in lib/bucket

Break the circular import chain between `tool-prompt.ts`, `command-events-proxy.ts`, `repository-loop.ts`, `repository.ts`, and `server-messages.ts`.

## Background

`omen all` identifies a 5-node cyclic dependency in `lib/bucket/`:

- `server-messages.ts` imports `Repository` type from `repository.ts`
- `repository.ts` imports `runRepositoryLoop` from `repository-loop.ts`
- `repository-loop.ts` imports `formatToolsSection` from `tool-prompt.ts` and `startCommandEventsProxy` from `command-events-proxy.ts`
- `tool-prompt.ts` imports `ToolDefinition`, `ToolParameter` from `server-messages.ts`
- `command-events-proxy.ts` imports `ToolDefinition` from `server-messages.ts`

This cycle spans the most-churned files in the codebase and is the primary contributor to the coupling score of 47.6.

## Approach

Break the `server-messages.ts` → `repository.ts` link. `server-messages.ts` only uses the `Repository` type for one interface definition. Either:

1. Extract the minimal `Repository` fields needed into a type within `server-messages.ts` itself, or
2. Create a shared `lib/bucket/types.ts` for types used across the cycle (`Repository`, `ToolDefinition`, `ToolParameter`)

Option 2 is more maintainable if multiple links need breaking.

## Files

- `lib/bucket/server-messages.ts` - imports `Repository` type from `repository.ts`
- `lib/bucket/repository.ts` - imports from `repository-loop.ts`
- `lib/bucket/repository-loop.ts` - imports from `tool-prompt.ts` and `command-events-proxy.ts`
- `lib/bucket/tool-prompt.ts` - imports from `server-messages.ts`
- `lib/bucket/command-events-proxy.ts` - imports from `server-messages.ts`

## Task Type

implement

## Principles

- [Decoupled Code](../principles/decoupled-code.md)

## Blocked By

(none)

## Definition of Done

- No cyclic dependency exists between these 5 files
- All existing tests pass
- `omen all` no longer reports this cycle
