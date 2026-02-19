# Dust ✨

**Flow state for AI coding agents.**

Dust provides a CLI that agents use to systematically blaze through your backlog.

[![CI](https://github.com/joshski/dust/actions/workflows/ci.yml/badge.svg)](https://github.com/joshski/dust/actions/workflows/ci.yml)

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

This runs Claude Code in a [ralph loop](https://ghuntley.com/loop/), picking up tasks until they are all done.

## Package Exports

The `@joshski/dust` package exposes several subpath exports for downstream use:

```ts
import { parseOpenQuestions } from '@joshski/dust/ideas'
import type { Idea, IdeaOpenQuestion, IdeaOption } from '@joshski/dust/ideas'
```

Other available subpaths: `@joshski/dust/types`, `@joshski/dust/workflow-tasks`, `@joshski/dust/logging`, `@joshski/dust/agents`.

## Learn More

Details live in the [.dust/facts](./.dust/facts) directory:

- [Directory Structure](./.dust/facts/dust-directory-structure.md) — how `.dust/` is organized
- [Configuration](./.dust/facts/configuration-system.md) — settings and quality checks
- [CLI Commands](./.dust/facts/unified-cli.md) — full command reference
