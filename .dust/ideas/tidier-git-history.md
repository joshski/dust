# Tidier Git History

Git history includes task deletions and artifact transitions, which serves as an "archaeology source" for understanding how the project evolved. However, some users find these commits to be noise that clutters their git history.

## Background

The [Atomic Commits](../principles/atomic-commits.md) principle states that task deletions should be bundled with implementation changes in a single commit. This creates a complete story at each commit, but it means every task completion appears in the main branch history.

The [Traceable Decisions](../principles/traceable-decisions.md) principle emphasizes that commit history should explain *why* changes were made. Task files provide that context — but once deleted, the "why" is only accessible via git archaeology (checking out old commits or using `git show`).

### The tension

Some users want clean commit history with only "real" code changes. They see task deletions as process artifacts that don't belong in the permanent record. Other users value the traceability that comes from seeing the full development story.

This is related to but distinct from:
- [Decouple Loop from Git](decouple-loop-from-git.md) — abstracting VCS dependencies
- [History Tools](history-tools.md) — traversing history to retrieve deleted tasks
- [Mention dust in commit messages](mention-dust-in-commit-messages.md) — identifying dust-aware commits

### Relevant principles

- [Atomic Commits](../principles/atomic-commits.md) — each commit should be a complete story
- [Repository Hygiene](../principles/repository-hygiene.md) — minimize noise in the repository
- [Trunk-Based Development](../principles/trunk-based-development.md) — linear history on main
- [VCS Independence](../principles/vcs-independence.md) — should work without git

## Possible approaches

### Approach 1: Squash commits on push

Use git hooks or pre-push logic to squash dust-related file changes (task deletions, idea transitions) into the preceding implementation commit. The local history would remain atomic, but the remote history would be "cleaner."

**Trade-off**: Loses the atomic commit semantics on the remote. Makes archaeology harder since the squashed commit message may not capture all context.

### Approach 2: Separate "dust" branch

Keep dust artifacts (tasks, ideas) on a separate branch that tracks the main branch. Task transitions happen on the dust branch; implementation commits happen on main. The branches are kept in sync via automation.

**Trade-off**: Adds complexity. Violates trunk-based development. Requires coordination between branches. May confuse agents that expect a single working branch.

### Approach 3: Git notes for archaeology

Instead of relying on file deletions in commits, store task content as git notes attached to the implementation commit. The working tree stays clean; the archaeology lives in the git notes namespace.

**Trade-off**: Git notes are not fetched by default (`git fetch origin refs/notes/*:refs/notes/*`). Some git interfaces don't display them well. Adds complexity for agents creating commits.

### Approach 4: Archive directory

Instead of deleting tasks, move completed tasks to an archive directory (e.g., `.dust/archive/tasks/`). Add this directory to `.gitignore` so archives are local-only, or keep them tracked for shared visibility.

**Trade-off**: If gitignored, archives don't provide shared archaeology. If tracked, the same "noise" complaints apply. The archive would grow indefinitely.

### Approach 5: External storage for artifact history

Store task/idea transitions in an external system (database, object storage, or a separate git repository) while the main repository only contains the current state. A `dust history` command could query the external store.

**Trade-off**: Requires infrastructure beyond the repository. Violates [VCS Independence](../principles/vcs-independence.md) if it mandates a specific service. Complicates self-contained workflows.

### Approach 6: Configurable commit behavior

Add settings to control how dust artifacts appear in commits:
- `artifactCommits: 'inline'` — current behavior, artifacts in implementation commits
- `artifactCommits: 'separate'` — create separate commits for artifact changes
- `artifactCommits: 'squash-on-push'` — squash artifact changes before pushing

**Trade-off**: Adds complexity to the workflow. Agents need to understand the configured mode. Different repositories could behave differently.

### Approach 7: Accept the status quo

Document that dust's commit style includes artifact transitions as a feature, not a bug. Users who want "clean" history can use `git log --oneline -- ':(exclude).dust/'` or similar filters. The archaeology value outweighs the aesthetic concern.

**Trade-off**: Doesn't address the user concern directly. Some CI/CD tools or code review workflows may struggle with file changes in `.dust/`.

## Open Questions

### Should dust artifacts be part of the main git history?

#### Option: Yes, as currently designed

Artifact transitions in git history provide traceable decisions. The [Atomic Commits](../principles/atomic-commits.md) principle explicitly values this. Users can filter views if they prefer cleaner output.

#### Option: No, they should be stored separately

Main git history should only contain "real" code changes. Dust is a development tool; its artifacts shouldn't pollute the permanent record. Archive externally or in git notes.

#### Option: Make it configurable

Different teams have different needs. Let users choose their preferred approach via settings. Accept the complexity cost.

### Should we optimize for local or remote history?

#### Option: Keep remote history clean

Remote (shared) history matters most for code review and archaeology. Local history can be messier. Use pre-push hooks or squashing to clean up before sharing.

#### Option: Keep both consistent

Differences between local and remote history cause confusion. What you commit should match what others see. Accept that both will include artifact transitions.

#### Option: Prioritize local developer experience

Local history is what developers interact with daily. Optimize for that experience; remote archaeology is a secondary concern.

### What level of backwards compatibility is required?

#### Option: Breaking change acceptable

If a new approach is clearly better, existing repositories can migrate. Document the migration path.

#### Option: Must be opt-in

Existing workflows should not change. New behavior requires explicit opt-in via settings.

#### Option: Must be fully backwards compatible

The current behavior is the default forever. New approaches only apply to explicitly configured repositories.
