# Install dust bash alias in hook

Make `dust` commands available in repositories where dust isn't installed. This enables agents to run commands like `dust check` without requiring dust as a local dependency.

## Background

When `dust bucket` or `dust loop` clones a repository to process tasks, the cloned repository may not have dust installed as a dependency. However, agent instructions in `CLAUDE.md` or `AGENTS.md` often reference dust commands like `bin/dust agent` or `npx dust check`. When these commands fail because dust isn't available, the agent may fail the task or waste time trying to install dust.

### Current state

The existing hook system (`lib/git/hooks.ts`) manages `pre-push` hooks with a `# BEGIN DUST HOOK` / `# END DUST HOOK` section. The hook invokes the configured `dustCommand` (e.g., `bin/dust`, `npx dust`) to run pre-push checks.

The `dustCommand` setting (`lib/config/settings.ts`) is auto-detected from lockfiles:
- `bun.lockb` → `bunx dust`
- `pnpm-lock.yaml` → `pnpx dust`
- `package-lock.json` → `npx dust`
- No lockfile + `BUN_INSTALL` env var → `bunx dust`
- Default → `npx dust`

The [Could we run dust on repos without dust installed?](could-we-run-dust-on-repos-without-dust-installed.md) idea mentions "Set up PATH or aliases so that `dust` commands are available even if dust isn't installed locally. The bucket process could expose its own dust capabilities."

### Relevant code

- `lib/git/hooks.ts` — Existing hook management for `pre-push` hooks; could be extended to install aliases
- `lib/cli/commands/bucket.ts:319-326` — `toRepositoryDependencies()` passes dependencies into the loop
- `lib/bucket/repository.ts` — Clones repos and starts agent loops
- `lib/session.ts` — Defines environment variables like `DUST_UNATTENDED`, `DUST_SKIP_AGENT`
- `lib/cli/commands/agent.ts:59` — Detects `DUST_SKIP_AGENT` to modify behavior in automated contexts

### Relevant principles

- [Easy Adoption](../principles/easy-adoption.md) — Dust should be trivially easy to adopt; reducing barriers for repositories that don't have dust installed
- [Unsurprising UX](../principles/unsurprising-ux.md) — Commands referenced in CLAUDE.md should work as expected
- [Agent Autonomy](../principles/agent-autonomy.md) — Agents should be able to work without manual intervention; failing on missing dust commands breaks autonomy

## Open Questions

### Where should the alias be defined?

#### Option: Inside the git hook script

Extend the existing `pre-push` hook (or add a new hook type) to define a bash function or alias. For example:
```bash
# BEGIN DUST HOOK
dust() {
  /path/to/parent/dust "$@"
}
export -f dust
# END DUST HOOK
```

The challenge is that git hooks run in their own process; an alias defined in a hook won't persist into the agent's shell session.

#### Option: Environment variable pointing to dust binary

Set an environment variable like `DUST_BIN=/path/to/dust` that the agent can use. The bucket/loop process could set this in the environment before invoking Claude. However, this requires agent instructions to check for the variable rather than just running `dust`.

#### Option: Symlink dust binary into repository

Create a `bin/dust` symlink in the cloned repository pointing to the orchestrator's dust binary. This makes `bin/dust` commands work without modification to agent instructions. However, it modifies the repository state, which could cause issues with git status checks.

#### Option: Prepend to PATH

The bucket/loop process could prepend a directory containing the dust binary to `PATH` before invoking Claude. This makes `dust` available as a command. This is transparent to agents and requires no changes to instructions.

### How should this interact with locally-installed dust?

#### Option: Prefer local installation

If the repository has dust as a dependency (`node_modules/.bin/dust` or similar), prefer that over the injected alias. This respects the repository's version pinning.

#### Option: Always use the orchestrator's dust

The alias always points to the bucket/loop process's dust binary. This ensures consistent behavior but may cause version mismatches.

#### Option: Warn on version mismatch

If both local and injected dust are available with different versions, log a warning but proceed with the local version.

### Which commands should be available via the alias?

#### Option: Full dust CLI

Expose the complete `dust` command with all subcommands. Agents can run any dust command they need.

#### Option: Subset of safe commands

Only expose read-only commands (`dust facts`, `dust principles`, `dust check`, `dust next`) and block commands that modify state (`dust init`, `dust loop`). This prevents accidental nested loops.

#### Option: Passthrough with guards

Pass all commands through but intercept dangerous operations (e.g., prevent `dust loop` from starting a nested loop by checking for existing `DUST_UNATTENDED` environment variable).

### Should this be implemented in hooks or elsewhere?

#### Option: Git hooks

Extend the existing `HooksManager` to support additional hook types that set up the environment. However, hooks run in isolated processes and their environment changes don't persist.

#### Option: Bucket/loop spawn configuration

Modify how `dust bucket` and `dust loop` spawn Claude processes to include the appropriate PATH or alias setup. This is cleaner since it happens at process spawn time.

#### Option: Claude session initialization

Use Claude's environment injection capabilities (via spawn options in `@anthropic-ai/claude-code`) to set up the alias before the agent starts working.

### Should this be documented as a supported pattern?

#### Option: Document and support

Explicitly document that `dust bucket` and `dust loop` make dust commands available even in repositories without dust installed. Add tests to verify this behavior.

#### Option: Keep as implementation detail

Let it work silently without documentation. Users don't need to know the mechanism; they just expect `dust` commands to work.
