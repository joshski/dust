# Could we run dust on repos without dust installed?

The `dust bucket` command connects to a dustbucket server, clones repositories, and runs Claude directly via the SDK to process tasks. This architecture means dust itself is only needed on the machine running `dust bucket`, not in the target repositories.

## Current State

The `dust bucket` command works as follows:

1. Authenticates with the dustbucket service (`lib/bucket/auth.ts`)
2. Connects via WebSocket to receive a list of repositories (`lib/cli/commands/bucket.ts:155-180`)
3. Clones each repository to a temp directory (`lib/bucket/repository.ts:148`)
4. Discovers tasks by scanning `.dust/tasks/` directories (`lib/cli/commands/next.ts:59-73`)
5. Invokes Claude directly via the `run()` function (`lib/loop/iteration.ts`), not via the `dust` CLI
6. Sets `DUST_SKIP_AGENT: '1'` to prevent nested dust invocations (`lib/loop/iteration.ts`)

The key insight is that `dust bucket` calls Claude directly using the SDK rather than spawning `dust` as a subprocess. The target repository only needs:

- A `.dust/tasks/` directory with task files
- Optionally, a `.dust/config/settings.json` for configuration

This means `dust bucket` can already process repositories that don't have dust installed as a dependency.

## Bootstrapping New Repositories

For repositories that have never used dust, `dust bucket` could potentially bootstrap them by:

1. Creating the `.dust/` directory structure via Claude
2. Setting up initial configuration
3. Creating starter tasks

Claude runs with `dangerouslySkipPermissions: true` and has full subprocess access via `spawn()`, so it could theoretically run `bun add @joshski/dust` or similar if needed.

## Relation to Principles

This capability aligns with the [Easy Adoption](../principles/easy-adoption.md) principle: "Dust should be trivially easy to adopt in any repository. Getting started with Dust should require minimal friction."

It also relates to [Agent-Agnostic Design](../principles/agent-agnostic-design.md) since the architecture separates the orchestration (dust bucket) from the agent runtime (Claude).

## Open Questions

### Should dust bucket support repos with no `.dust/` directory at all?

#### Yes, with automatic initialization

When a repository lacks a `.dust/` directory, `dust bucket` could run `dust init` equivalent logic to create the directory structure before looking for tasks. This lowers the barrier for adding new repos to the bucket.

#### No, require minimal setup

Repositories should at least have a `.dust/` directory (even if empty) to signal intent to use dust. This prevents accidental processing of unrelated repositories.

### How should dust bucket discover tasks in repos without dust installed?

#### Use the existing `findAvailableTasks()` logic

The current implementation already works without dust being installed in the repo. It directly scans for `.dust/tasks/*.md` files using the filesystem. No changes needed.

#### Add a fallback task discovery mechanism

If no `.dust/tasks/` directory exists, look for alternative task sources (GitHub issues, a `TASKS.md` file, etc.).

### Should there be a way to install dust into a repo via dust bucket?

#### Yes, via a bootstrap task

Add a special task type (e.g., `dust-bootstrap`) that instructs Claude to run `bun add @joshski/dust` and set up the project.

#### No, keep dust bucket focused on task execution

Installing dependencies changes the repository in ways that might surprise users. Keep dust bucket's scope limited to running tasks that already exist.

### What happens when CLAUDE.md references `bin/dust` commands?

#### Claude should handle the error gracefully

Many repositories (including dust itself) have `CLAUDE.md` files that instruct agents to run `bin/dust` commands. When `bin/dust` fails because dust isn't installed, Claude can report this and potentially offer to install it.

#### Provide dust commands via environment

Set up PATH or aliases so that `dust` commands are available even if dust isn't installed locally. The bucket process could expose its own dust capabilities.

#### Document the limitation

Make it clear that certain CLAUDE.md patterns won't work without dust installed. Users should either install dust or avoid referencing it in agent instructions.

### Should this capability be explicitly documented and supported?

#### Yes, as a first-class feature

Document "zero-install" mode where repos can be processed without dust as a dependency. This encourages adoption.

#### No, keep it as an implementation detail

The current behavior works but isn't a supported use case. Users who want reliability should install dust in their repos.
