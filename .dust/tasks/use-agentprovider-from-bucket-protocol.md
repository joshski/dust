# Use agentProvider from bucket protocol

Parse the `agentProvider` field from `repository-list` messages and use it to select the coding agent (Claude vs Codex) for each repository. The dustbucket server already sends this field, but dust ignores it.

## Context

The `repository-list` message already includes repository metadata (name, gitUrl, url, id, hasTask). The server can now specify which agent to use per-repository via `agentProvider`. When `agentProvider` is `'codex'`, the bucket worker should use `codexRun` instead of `claudeRun`.

The existing infrastructure already supports this:
- `LoopDependencies.agentType` exists and is used to select agent behavior
- `lib/codex/run.ts` provides `codexRun` with the same interface as `claudeRun`
- `lib/cli/commands/loop-codex.ts` demonstrates using Codex in the loop

## Implementation

### 1. Add agentProvider to Repository interface
**`lib/bucket/repository.ts`** - add `agentProvider?: string` to the `Repository` interface.

### 2. Parse agentProvider in server messages
**`lib/bucket/server-messages.ts`** - in `parseServerMessage`, read `repo.agentProvider` (string, optional) and include it in the parsed `RepositoryListItem`.

### 3. Wire agentProvider into the repository loop
**`lib/bucket/repository-loop.ts`** - in `runRepositoryLoop`, read `repoState.repository.agentProvider`. When it's `'codex'`, import and use `codexRun` from `../../codex/run` instead of `claudeRun`, and set `loopDeps.agentType = 'codex'`.

### 4. Update tests
- **`lib/bucket/server-messages.test.ts`** - add test that `agentProvider` is parsed and preserved (when present) and omitted (when absent).
- **`lib/bucket/repository-loop.test.ts`** - add test that codex run is used when `agentProvider` is `'codex'`.

## Verification

- `bun test --dots`
- `bunx tsc --noEmit`

## Principles

- [Agent-Agnostic Design](../principles/agent-agnostic-design.md)
- [Agent-Specific Enhancement](../principles/agent-specific-enhancement.md)
- [Agent Autonomy](../principles/agent-autonomy.md)

## Blocked By

(none)

## Definition of Done

- [ ] `Repository` interface includes optional `agentProvider` field
- [ ] `parseServerMessage` parses `agentProvider` from `repository-list` messages
- [ ] `runRepositoryLoop` uses `codexRun` when `agentProvider` is `'codex'`
- [ ] Tests verify `agentProvider` parsing in server-messages.test.ts
- [ ] Tests verify codex run selection in repository-loop.test.ts
- [ ] All tests pass (`bun test --dots`)
- [ ] TypeScript compiles (`bunx tsc --noEmit`)
- [ ] `bin/dust check` passes
