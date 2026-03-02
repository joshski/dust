# Use agentProvider from bucket protocol

The dustbucket server sends `agentProvider` (either `'claude'` or `'codex'`) per repository in the `repository-list` message, but dust currently ignores it. The bucket worker should use this field to determine which coding agent to run for each repository.

## Changes

### 1. Add agentProvider to Repository interface
**`lib/bucket/repository.ts`** — add `agentProvider?: string` to the `Repository` interface.

### 2. Parse agentProvider in server messages
**`lib/bucket/server-messages.ts`** — in `parseServerMessage`, read `repo.agentProvider` (string, optional) and include it in the parsed `RepositoryListItem`.

### 3. Wire agentProvider into the repository loop
**`lib/bucket/repository-loop.ts`** — in `runRepositoryLoop`, read `repoState.repository.agentProvider`. When it's `'codex'`, import and use `codexRun` from `../../codex/run` instead of `claudeRun`, and set `loopDeps.agentType = 'codex'`. The existing `LoopDependencies.agentType` and codex runner infrastructure (`lib/cli/commands/loop-codex.ts`, `lib/codex/run.ts`) already exist.

### 4. Update tests
- **`lib/bucket/server-messages.test.ts`** — add test that `agentProvider` is parsed and preserved.
- **`lib/bucket/repository-loop.test.ts`** — add test that codex run is used when `agentProvider` is `'codex'`.

## Verification
- `bun test --dots`
- `bunx tsc --noEmit`
