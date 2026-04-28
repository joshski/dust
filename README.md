# Dust ✨

**Flow state for AI coding agents.**

Dust provides a CLI that agents use to systematically blaze through your backlog.

[![CI](https://github.com/joshski/dust/actions/workflows/ci.yml/badge.svg)](https://github.com/joshski/dust/actions/workflows/ci.yml)

## Quick Start

```bash
claude "install dust as per https://github.com/joshski/dust"
```

This works with other agents (codex, cursor, opencode, etc.) too. The agent will install dust and set up the [.dust](./.dust/facts/dust-directory-structure.md) directory with an [instruction](./.dust/facts/agents-md-instruction.md) in your `AGENTS.md` file.

## Adding Tasks

Use your AI coding CLI (Claude Code, Codex, etc.) to add and refine tasks:

```bash
claude "add a task to refactor the auth module"
```

Ideas (`.dust/ideas/`) are backlog items you may or may not do later. Tasks (`.dust/tasks/`) are ready to work on now. Both are markdown files that agents and humans can read and edit.

## Running Agents

Start an agent on a single task:

```bash
claude "implement the next task"
```

Or let dust run agents continuously [in a sandbox](./.dust/facts/autonomous-agents-need-sandboxes.md) with the [loop](./.dust/facts/loop-command.md) command:

```bash
npx dust loop claude
```

This runs Claude Code in a [ralph loop](https://ghuntley.com/loop/), picking up tasks until they are all done.

## Codex Hook (Optional)

For [Codex](https://github.com/openai/codex) 0.125.0 or newer, you can replace the `AGENTS.md` instruction with a `SessionStart` hook that loads dust's instructions directly into the model's context — once per session, with no extra agent commands. Add this to `~/.codex/config.toml` (or your project's Codex config):

```toml
[features]
codex_hooks = true

[[hooks.SessionStart]]
matcher = "^startup$"

[[hooks.SessionStart.hooks]]
type = "command"
command = "bunx dust codex hook"
statusMessage = "Loading dust agent instructions"
```

## Learn More

Details live in the [.dust/facts](./.dust/facts) directory:

- [Directory Structure](./.dust/facts/dust-directory-structure.md) — how `.dust/` is organized
- [Configuration](./.dust/facts/configuration-system.md) — settings and quality checks
- [CLI Commands](./.dust/facts/unified-cli.md) — full command reference

## Dust Bucket Worker

The `dust bucket worker` command runs a background worker that syncs agent sessions to [dustbucket.com](https://dustbucket.com). This requires a dustbucket.com account (currently in private alpha, invite only).
