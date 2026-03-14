# Git hook to modify commit messages

Use a git hook to automatically add dust markers to commit messages, rather than relying on agents to include them.

## Background

The existing [Mention dust in commit messages](mention-dust-in-commit-messages.md) idea relies on instructing agents to include dust references in their commit messages. This approach has limitations:

1. **Agent compliance varies**: Different agents may format mentions inconsistently or forget entirely
2. **No enforcement**: There's no mechanism to ensure markers are present
3. **Human commits unmarked**: Commits made outside dust sessions (manual developer commits) are indistinguishable from non-dust commits

A git hook would provide **automatic, consistent** tagging of commits, regardless of whether the commit was made by an agent or a human.

### How git commit hooks work

Git provides two relevant hooks for modifying commit messages:

- **`prepare-commit-msg`**: Runs before the commit message editor opens. Can pre-populate the message. Receives the message file path, source type, and optionally a commit SHA.
- **`commit-msg`**: Runs after the user finishes editing. Can modify or validate the final message. Receives only the message file path.

Either hook could append a dust marker (e.g., a trailer or prefix) to commits made within a dust-initialized repository.

### Relevant existing code

- [[`lib/git/hooks.ts`](../../lib/git/hooks.ts)](../../lib/git/hooks.ts) — Existing hook management infrastructure for `pre-push` hooks
- [[`lib/cli/commands/agent-shared.ts`](../../lib/cli/commands/agent-shared.ts)](../../lib/cli/commands/agent-shared.ts) — Uses `manageGitHooks()` to install hooks at session start
- [`lib/cli/commands/loop.ts`](../../lib/cli/commands/loop.ts) — Sets `DUST_UNATTENDED=1` environment variable for autonomous sessions

The existing `HooksManager` pattern could be extended to support multiple hook types (`pre-push`, `commit-msg`, `prepare-commit-msg`).

### Relevant principles

- [Traceable Decisions](../principles/traceable-decisions.md) — Commit messages should capture context; automated markers ensure consistency
- [Atomic Commits](../principles/atomic-commits.md) — Knowing a commit was made in a dust context is part of its story

### Related ideas

- [Mention dust in commit messages](mention-dust-in-commit-messages.md) — Agent instruction approach (complementary)
- [Commit Log Observations](commit-log-observations.md) — Scanning commits for patterns (downstream consumer)
- [History Tools](history-tools.md) — Traversing commit history (downstream consumer)

## Open Questions

### Which git hook should be used?

#### Option: prepare-commit-msg

Runs before the editor opens. Allows pre-populating the message template. The agent or human sees the marker and can modify it if needed. More transparent but could be deleted by the committer.

#### Option: commit-msg

Runs after editing is complete. Appends the marker without user intervention. More reliable but less transparent — users may not notice the marker was added.

### What format should the marker use?

#### Option: Git trailer

Add a trailer like `Dust-Session: interactive` or `Dust-Session: loop`. Machine-parseable, follows git conventions (like `Co-Authored-By:`), and works well with `git log --format="%(trailers)"`.

#### Option: Prefix in first line

Add `[dust]` to the start of the commit message. Highly visible but may conflict with existing prefix conventions (e.g., conventional commits).

#### Option: Footer comment

Add a line like `Generated with dust` at the end of the message body. Human-readable but harder to parse reliably.

### Should the hook distinguish session types?

#### Option: Single marker

Just indicate the commit was made in a dust repository, e.g., `Dust: true`. Simple but loses context about whether it was interactive or autonomous.

#### Option: Session-type marker

Include the session type: `Dust-Session: interactive`, `Dust-Session: loop`, or `Dust-Session: bucket`. The hook could check for `DUST_UNATTENDED=1` to determine the type.

#### Option: Include session ID

Add a unique session identifier: `Dust-Session: abc123`. Enables correlating multiple commits to the same agent session. More useful for analysis but adds complexity.

### How should this interact with the agent instruction approach?

#### Option: Replace agent instructions

Use only the git hook. Simpler, single source of truth, but loses the ability for agents to add contextual information beyond the marker.

#### Option: Complement agent instructions

Keep both approaches. Agent instructions encourage meaningful context in the message body; the hook ensures a machine-parseable marker is always present.

#### Option: Hook as fallback

Install the hook but only add the marker if the agent didn't already include one. Avoids duplication while ensuring coverage.

### Should the hook be opt-in or installed by default?

#### Option: Installed by default with dust init

New dust repositories automatically get the hook. Consistent behavior out of the box, but may surprise users who don't expect modified commit messages.

#### Option: Opt-in via settings

Add a setting like `commitMessageHook: true` in `settings.json`. Requires explicit enablement, lower adoption but no surprises.

#### Option: Prompt during init

Ask users during `dust init` whether they want the commit message hook installed. Balances adoption with user choice.
