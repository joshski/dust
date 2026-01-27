# Dust

A lightweight planning system and work tracker optimised for humans working with AI agents.

[![CI](https://github.com/joshski/dust/actions/workflows/ci.yml/badge.svg)](https://github.com/joshski/dust/actions/workflows/ci.yml)

## Why Would I Use This?

Use this to plan a series of tasks that coding agents can perform autonomously.

## Getting Started

Install dust using your package manager of choice (`npm` and `bun` officially supported for now):

```bash
npm install @joshski/dust
```

Initialize dust in your repository:

```bash
npx dust init
```

## How It Works

The [.dust](./.dust) directory in your repository contains 4 sets of markdown files:

```
.dust/
├── goals/    # Mission statements explaining why the project exists
├── ideas/    # Brief notes about future tasks (intentionally vague)
├── tasks/    # Detailed work plans with dependencies and definition of done
└── facts/    # Current state: design, architecture, rules, invariants
```

These files are used to facilitate exploration and management of AI agent workflow.

## Workflow

Progress is tracked via changes to markdown files in the `.dust/` directory. The four directories together (`goals/`, `ideas/`, `tasks/`, `facts/`) act as a kanban system for managing work.

The `tasks/` directory acts as a work queue. When a task is completed, the commit typically includes both the code changes and the deletion of the task file—removing work from the queue for subsequent agents.

## CLI

The `dust` CLI is intended to be used primarily by agents, not by humans (except for the `init` command, as mentioned above).

Don't let that stop you:

```bash
npx dust help
```

## Human UI

Humans can interact with `dust` using their AI agent software of choice, e.g.

```
> claude "implement the next task" 
> codex "add task: add coverage reporting"
```

## AGENTS.md

Add a line like this to your `AGENTS.md` or `CLAUDE.md` file:

```markdown
Always immediately run `npx dust` agent when you start working in this repository.
```

In fact, you might find it effective to use that as the _only_ line in those files. Essential documentation should be discoverable by agents exploring your `./.dust` directory.



## Configuration

Configure hooks into your tools in `./.dust/config/settings.json` e.g.

```json
{
  "dustCommand": "bunx dust",
  "checks": [
    { "name": "lint", "command": "bunx biome check ." },
    { "name": "build", "command": "bun run build" },
    { "name": "tests", "command": "bun run test:coverage" },
    { "name": "typecheck", "command": "bunx tsc --noEmit lib/**/*.ts" }
  ]
}
```

The `dust check` command will run all of the configured checks in parallel and product a very terse (context window-friendly) output unless something fails.

Agents are instructed to run `dust check` before and after any changes, as a way of keeping them on track. It's more important that these commands are comprehensive, than they are fast.
