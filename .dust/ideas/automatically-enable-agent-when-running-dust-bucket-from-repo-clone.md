# Automatically enable agent when running `dust bucket` from repo clone

When `dust bucket` clones a repository, automatically configure that repository so agents receive proper context when working in it.

## Current State

When `dust bucket` runs, it clones repositories to `~/.dust/repos/{safe-repo-name}` and starts repository loops that invoke Claude Code with `DUST_SKIP_AGENT: '1'`. This environment variable causes `dust agent` to skip its greeting and discovery behavior (see `lib/cli/commands/agent.ts:35-40`).

The agent is invoked via `dust loop claude` which spawns Claude Code as a subprocess. The subprocess receives task instructions via `buildImplementationInstructions()` in `lib/cli/commands/focus.ts`, which includes steps like running `dust check` and implementing the task.

However, the cloned repositories don't have:
- Any special AGENTS.md or CLAUDE.md files indicating dust is available (unless the source repo already has them)
- Configured git hooks for pre-commit/pre-push validation
- Any indication that they're running in bucket context vs. interactive context

The `manageGitHooks()` function (used by `dust agent`) installs git hooks when an agent session starts, but this doesn't happen for bucket-cloned repos since `DUST_SKIP_AGENT` bypasses the agent greeting flow.

## Motivation

- **Agent context**: When the original repository has AGENTS.md/CLAUDE.md with dust instructions, the cloned repo inherits these. But if the original repo doesn't have dust configured, agents working in bucket context don't know dust is available.

- **Git hooks**: The pre-commit and pre-push hooks that prevent broken commits don't get installed in bucket-cloned repos. While the loop infrastructure handles some validation, git hooks provide an additional safety layer.

- **Bucket-specific behavior**: Agents might benefit from knowing they're running in unattended bucket context vs. interactive context. This could affect how they handle errors, format output, or request clarification.

## Related Code

- `lib/bucket/repository.ts:56-69` - `addRepository()` clones repos and starts repository loops
- `lib/bucket/repository.ts:26-29` - `getRepoPath()` constructs the clone path
- `lib/cli/commands/agent.ts:35-40` - `DUST_SKIP_AGENT` check
- `lib/cli/commands/loop.ts:326,394` - Environment variables passed to Claude subprocess
- `lib/hooks/git-hooks.ts` - `manageGitHooks()` installs git hooks

## Related Goals

- [Agent Autonomy](../goals/agent-autonomy.md) - Enabling agents to work effectively without human intervention
- [Easy Adoption](../goals/easy-adoption.md) - Reducing friction when starting with dust
- [Ideal Agent Developer Experience](../goals/ideal-agent-developer-experience.md) - The agent's development environment should be excellent

## Open Questions

### What exactly should "enable agent" mean in bucket context?

#### Install git hooks in cloned repositories

When a repository is cloned for bucket, run `manageGitHooks()` to install pre-commit and pre-push hooks. This adds a safety layer for commits made by the agent.

#### Add AGENTS.md/CLAUDE.md if missing

If the cloned repository doesn't have dust instruction files, create them with the standard instruction to run `npx dust agent`. However, this modifies the working tree, which could interfere with clean git operations.

#### Set environment variables indicating bucket context

Pass additional environment variables to the Claude subprocess (e.g., `DUST_BUCKET_CONTEXT=1`) so agents can detect they're running in bucket mode and adjust behavior accordingly.

#### Do nothing beyond current behavior

The current approach already works: agents receive task instructions, run commands, and implement changes. Explicit "enablement" may be unnecessary complexity.

### Should git hooks be installed, and if so, when?

#### Install hooks at clone time

When `addRepository()` clones a repo, immediately run `manageGitHooks()`. This ensures hooks are present before any agent work begins.

#### Install hooks before first agent invocation

Delay hook installation until just before spawning the first Claude subprocess for a repository. This is similar to when `dust agent` installs hooks in interactive mode.

#### Don't install hooks for bucket repos

The loop infrastructure already handles validation. Adding git hooks may slow down commits without providing much benefit in unattended context.

### How should bucket context be communicated to agents?

#### Dedicated environment variable (e.g., `DUST_BUCKET_CONTEXT=1`)

Agents can check this variable and adjust behavior. For example, they might be more conservative about requesting human input or more aggressive about error recovery.

#### Agent-specific config file in cloned repo

Create a `.dust/config/agents/bucket.md` file in cloned repos with bucket-specific instructions. This would be read by agents as part of their normal context loading.

#### No explicit signaling

Agents don't need to know they're in bucket context. The `DUST_UNATTENDED: '1'` environment variable already indicates they shouldn't expect human interaction.

### Should changes be made to the cloned repo's working tree?

#### Yes, it's acceptable to modify working tree

Creating files like AGENTS.md or `.dust/config/` is fine since these are git-ignored or the changes are expected to be committed.

#### No, keep working tree clean

Modifications to the working tree could cause unexpected behavior with git operations or confuse agents about repo state. Only modify the git config (hooks) or environment.

### Should this behavior apply to all bucket clones or be configurable?

#### Apply to all bucket clones

Simpler implementation and consistent behavior across all repositories managed by bucket.

#### Make it configurable per-repository

The server could send repository metadata indicating whether to enable agent features. This allows different behavior for different repositories.

#### Make it a global bucket configuration

Add a setting like `DUST_BUCKET_ENABLE_AGENT_SETUP=1` that applies to all repositories when set.
