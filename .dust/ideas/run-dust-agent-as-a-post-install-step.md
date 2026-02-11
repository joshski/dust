# Run dust agent as a post-install step

Add a `postinstall` script to `package.json` so that `dust agent` runs automatically after `bun install` (or `npm install`). This would ensure that any agent starting work in the repository is immediately greeted with the dust routing prompt without relying on `CLAUDE.md` instructions to tell them to run it manually.

## Open Questions

### Should the post-install step run `bin/dust agent` or `dust agent`?

#### bin/dust agent

Uses the local checkout directly. Works immediately after clone without a global install, but assumes the `bin/dust` entry point exists and is executable.

#### dust agent

Relies on the package being installed (globally or via `npx`/`bunx`). Cleaner, but may fail if dust isn't on PATH yet during initial setup.

### How should failures be handled?

#### Silently ignore failures

Post-install hooks that fail can block `npm install` / `bun install`. Wrapping the call so it exits 0 on failure avoids breaking the install for users who don't need the agent prompt.

#### Fail loudly

If dust is a dev dependency and the agent greeting is essential to the workflow, a failure signals a real problem that should be fixed.
