# Dust

A lightweight planning system and work tracker optimised for humans working with AI agents.

[![CI](https://github.com/joshski/dust/actions/workflows/ci.yml/badge.svg)](https://github.com/joshski/dust/actions/workflows/ci.yml)

## Why Would I Use This?

Use this to plan a series of tasks that coding agents can perform autonomously.

## Getting Started

Install dust:

```bash
npm install -g @joshski/dust
```

Initialize dust in your repository:

```bash
npx dust init
# or
bunx dust init
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
