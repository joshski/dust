# Postinstall Agent Detection

An npm `postinstall` script that detects which agent is running and executes dedicated post-install commands. This allows packages to automatically set up agent-specific dependencies in the sandbox after `npm install`.

For example, a project might need to install system packages, configure toolchains, or seed databases differently depending on whether it's running inside Claude Code, Codex, Devin, or another agent environment.

## Open Questions

### How should the current agent be detected?

#### Environment variables

Check for agent-specific environment variables (e.g. `CLAUDE_CODE`, `CODEX`, `DEVIN`). Simple and fast, but relies on each agent setting a known variable.

#### Process tree inspection

Walk the process tree to identify the parent agent process. More robust but platform-dependent and potentially fragile across agent versions.

#### Both, with environment variables as the primary method

Use environment variables first, fall back to process tree inspection. Covers more cases but adds complexity.

### Where should per-agent commands be configured?

#### In `package.json` under a `dust` key

Keep configuration close to the dependency declaration. Example:

```json
{
  "dust": {
    "postinstall": {
      "claude-code": "apt-get install -y libfoo && bun install",
      "codex": "pip install extra-dep"
    }
  }
}
```

#### In `.dust/settings.json`

Consistent with other dust configuration, but separates post-install config from the package manifest.

#### In a dedicated `.dust/postinstall/` directory with per-agent scripts

Maximum flexibility — each agent gets a full script file (e.g. `.dust/postinstall/claude-code.sh`). Easy to version and review, but more files to manage.
