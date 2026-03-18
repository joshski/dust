# Clone with target branch

Add support for the dustbucket server to specify a target branch for each repository. When `branch` is specified, clone the repository on that branch and detect branch changes that require re-cloning.

## Background

The bucket protocol's `RepositoryListItem` provides git clone URLs but assumes all work happens on the default branch. Some workflows require working on non-default branches: staging environments, long-running feature branches, release branches, or per-user branches.

## Implementation

### Protocol and interface changes

1. Add an optional `branch` field to `RepositoryListItem` in `.dust/facts/bucket-protocol.md`
2. Add an optional `branch` field to the `Repository` interface in `lib/bucket/repository.ts`
3. Update `parseRepository` to extract the `branch` field from incoming data

### Clone behavior

Modify `cloneWithUrl` in `lib/bucket/repository-git.ts`:

1. Accept an optional `branch` parameter
2. When `branch` is specified, pass `--branch <branch>` to `git clone`
3. If the branch doesn't exist, the clone fails fast with a clear error (Git's default behavior)

The `--branch` flag also sets up tracking correctly, so subsequent `git pull` and `git push` commands work without additional configuration.

### Branch change detection

In `handleRepositoryList` in `lib/bucket/repository.ts`:

1. When comparing incoming repositories with existing ones, check if `branch` changed
2. If `branch` changed, remove and re-add the repository (triggers fresh clone)
3. Log the branch change for visibility

This follows the existing pattern for handling repository changes — branch changes are treated like repository removal and re-addition.

### Functional core approach

Pure functions (no side effects):

- `shouldRecloneForBranchChange(existing: Repository, incoming: Repository): boolean` — returns true if branch field differs
- Error message formatting for clone failures with branch context

Imperative shell (performs I/O):

- `cloneWithUrl` calls `git clone` with `--branch` flag
- `handleRepositoryList` orchestrates remove/re-add on branch changes

## Blocked By

(none)

## Principles

- [Functional Core, Imperative Shell](../principles/functional-core-imperative-shell.md)
- [Actionable Errors](../principles/actionable-errors.md)
- [Trunk-Based Development](../principles/trunk-based-development.md)

## Definition of Done

- `RepositoryListItem` and `Repository` interfaces include optional `branch` field
- `cloneRepository` passes `--branch` to git when branch is specified
- `handleRepositoryList` detects branch changes and triggers re-clone
- Backward compatible: omitted or null `branch` uses default branch (existing behavior)
- Unit tests cover branch cloning and branch change detection
- `bin/dust check` passes
