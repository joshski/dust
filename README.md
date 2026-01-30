# Dust

A tool for keeping AI coding agents on track.

[![CI](https://github.com/joshski/dust/actions/workflows/ci.yml/badge.svg)](https://github.com/joshski/dust/actions/workflows/ci.yml)

## Approach

AI coding agents lose effectiveness when overwhelmed with context. Dust provides a CLI that agents use to progressively explore your priorities and knowledge. Just what they need, when they need it.

| | |
|---|---|
| 📖 **Facts** | project knowledge revealed through exploration |
| 🎯 **Goals** | high-level priorities that inform decisions |
| 📋 **Tasks** | small, concrete work items with clear acceptance criteria |
| ✓ **Checks** | fast quality gates that are only noisy when things fail |

## Quick Start

```bash
npm install @joshski/dust
npx dust init
```

This creates a [.dust](./.dust/facts/dust-directory-structure.md) directory and adds an [instruction](./.dust/facts/agents-md-instruction.md) to your `AGENTS.md` file.

## Running Agents

Start an agent on a single task:

```bash
claude "implement the next task"
```

Or let dust run agents continuously [in a sandbox](./.dust/facts/autonomous-agents-need-sandboxes.md) with the [loop](./.dust/facts/loop-command.md) command:

```bash
npx dust loop claude
```

This runs Claude Code in a [ralph loop](https://ghuntley.com/loop/), picking up tasks until the iteration limit is reached (default: 10). You can specify a custom limit:

```bash
npx dust loop claude 5
```

## Learn More

Details live in the [.dust/facts](./.dust/facts) directory:

- [Directory Structure](./.dust/facts/dust-directory-structure.md) — how `.dust/` is organized
- [Configuration](./.dust/facts/configuration-system.md) — settings and quality checks
- [CLI Commands](./.dust/facts/unified-cli.md) — full command reference
