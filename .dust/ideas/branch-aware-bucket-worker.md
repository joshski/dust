# Branch-aware bucket worker

Allow the dust bucket server to specify a target branch for each repository. All git operations would target that branch instead of the default.

## Context

The current bucket protocol (`RepositoryListItem` in `.dust/facts/bucket-protocol.md`) provides git clone URLs but assumes all work happens on the default branch. The git operations in `lib/bucket/repository-git.ts` clone without specifying a branch, and `lib/loop/git-pull.ts` runs `git pull` without arguments, both defaulting to the remote's HEAD branch.

This design aligns with the Trunk-Based Development principle, which states that "agents pull from main, implement a task, and push directly back to main." However, some workflows require working on non-default branches:

- **Staging/preview environments**: Testing changes on a `staging` branch before merging to `main`
- **Long-running feature branches**: Large features that need iterative agent work before integration
- **Release branches**: Stabilization work on `release/v1.2` while `main` continues development
- **Per-user branches**: Each developer or team maintains their own integration branch

## Implementation Considerations

### Protocol change

Add an optional `branch` field to `RepositoryListItem`:

```typescript
interface RepositoryListItem {
  name: string
  gitUrl: string
  gitSshUrl?: string
  url: string
  id: number
  hasTask: boolean
  agentProvider?: string
  branch?: string  // Target branch; omit or null for default
}
```

### Clone behavior

When `branch` is specified, `cloneRepository()` should:

1. Clone with `--branch <branch>` to check out the branch immediately, OR
2. Clone default, then `git checkout <branch>` as a separate step

Option 1 is simpler and avoids fetching unnecessary branches. If the branch doesn't exist, the clone fails fast with a clear error.

### Pull behavior

The `gitPull()` function should pull from the specified branch. When on a branch other than the default, a plain `git pull` pulls from the upstream tracking branch. The initial clone should set up tracking correctly.

### Push behavior

Task instructions tell the agent to run `git push` after committing. With a non-default branch, this should push to the correct remote branch. If the initial checkout sets up tracking (`git checkout --track origin/<branch>`), a plain `git push` works. Otherwise, the agent prompt may need to specify the remote and branch explicitly.

### Branch persistence

The `Repository` interface in `lib/bucket/repository.ts` would need a `branch` field so downstream code can reference it:

```typescript
export interface Repository {
  name: string
  gitUrl: string
  gitSshUrl?: string
  url: string
  id: number
  agentProvider?: string
  branch?: string
}
```

### Compatibility

The `branch` field should be optional with backward-compatible behavior:
- If omitted or null, use the default branch (current behavior)
- Existing dustbucket servers that don't send `branch` continue to work
- Existing clients that don't recognize `branch` continue to work (they'll use default)

## Design Decisions

### Agent prompt includes branch context

Add text like "You are working on the `staging` branch" to task prompts. This helps the agent understand context and avoid confusion if it reads commit history or branch names.

### Validate branch exists on clone

If the branch doesn't exist, fail the clone immediately with a clear error. This prevents confusion later when the agent tries to work on a non-existent branch. The Actionable Errors principle applies: the error message should explain what branch was requested and that it doesn't exist.

### Branch changes require repository removal and re-add

If the server changes the target branch for a repository, the worker removes the repository and re-adds it (triggering a fresh clone). This is the safest approach — no local state carries over. The `handleRepositoryList` function in `lib/bucket/repository.ts` already handles repository removal and re-add; branch changes should follow the same pattern.

### Branch management is out of scope

The bucket worker operates on whichever branch the server specifies. Merging is a separate concern handled by the server, CI, or human process. This aligns with the principle of keeping components focused and simple.
