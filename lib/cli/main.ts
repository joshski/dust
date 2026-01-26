/**
 * Main entry point for dust CLI
 *
 * This module contains all the command routing, help text, and adapter setup
 * so that bin/dust can be minimal.
 */

import { check, defaultProcessRunner } from './check'
import { init } from './init'
import { list } from './list'
import { next } from './next'
import { prompt } from './prompt'
import type { CommandContext, CommandResult, FileSystem } from './types'
import type { GlobScanner } from './validate'
import { validate } from './validate'

export const COMMANDS = [
  'init',
  'prompt',
  'validate',
  'list',
  'next',
  'check',
  'help',
] as const

export type Command = (typeof COMMANDS)[number]

export const HELP_TEXT = `dust - A lightweight planning system for human-AI collaboration

Usage: dust <command> [options]

Commands:
  init              Initialize a new Dust repository
  prompt <name>     Output a prompt by name (e.g., dust prompt work)
  validate          Run validation checks on .dust/ files
  list [type]       List items (tasks, ideas, goals, facts)
  next              Show tasks ready to work on (not blocked)
  check             Run project-defined quality gate hook
  help              Show this help message

Examples:
  dust init
  dust prompt work
  dust validate
  dust list tasks
  dust list
  dust next
  dust check

---

## Agent Guide

This section provides comprehensive guidance for AI agents working with dust.

### Directory Structure

The \`.dust/\` directory contains all planning artifacts:

- **\`.dust/goals/\`** - Mission statements and guiding principles
- **\`.dust/ideas/\`** - Future feature notes and proposals (intentionally vague)
- **\`.dust/tasks/\`** - Detailed work plans with dependencies and definitions of done
- **\`.dust/facts/\`** - Documentation of current system state and architecture
- **\`.dust/hooks/\`** - Executable scripts for quality gates (e.g., \`check\` hook)

All files are markdown with slug-style names (lowercase, hyphens, no spaces).

### Working on Tasks

Run \`dust next\` to find tasks ready to work on. Each task file contains:

- \`## Goals\` - Links to goals this task supports
- \`## Blocked by\` - Tasks that must complete first (empty or "(none)" means ready)
- \`## Definition of done\` - Criteria for completion

A task is **unblocked** when its "Blocked by" section is empty, says "(none)", or all referenced task files have been deleted.

### Completing a Task

When finishing a task, create a single atomic commit that includes:

1. All implementation changes
2. Deletion of the completed task file
3. Updates to any facts that changed
4. Deletion of any ideas that were fully realized

### Common Workflows

- **"Work on the next task"** - Run \`dust next\`, pick a task, implement it
- **"Work on task X"** - Implement \`.dust/tasks/X.md\` directly
- **"Convert idea Y to tasks"** - Break down \`.dust/ideas/Y.md\` into tasks
- **"Validate facts"** - Check \`.dust/facts/\` for accuracy against the codebase

### Configuring Agent Files

Projects using dust should add a minimal pointer to their agent configuration files (CLAUDE.md, AGENTS.md, etc.):

\`\`\`markdown
This project uses [dust](https://github.com/joshski/dust) for planning and documentation - run \`dust help\` to get started.
\`\`\`

This approach keeps agent instructions minimal, ensures agents get current documentation, and reduces maintenance burden.
`

export interface MainOptions {
  args: string[]
  ctx: CommandContext
  fs: FileSystem
  glob: GlobScanner
}

export function isHelpRequest(command: string | undefined): boolean {
  return (
    !command || command === 'help' || command === '--help' || command === '-h'
  )
}

export function isValidCommand(command: string): command is Command {
  return COMMANDS.includes(command as Command)
}

export async function runCommand(
  command: Command,
  commandArgs: string[],
  ctx: CommandContext,
  fs: FileSystem,
  glob: GlobScanner
): Promise<CommandResult> {
  switch (command) {
    case 'init':
      return init(ctx, fs, commandArgs)
    case 'prompt':
      return prompt(ctx, fs, commandArgs)
    case 'validate':
      return validate(ctx, fs, commandArgs, glob)
    case 'list':
      return list(ctx, fs, commandArgs)
    case 'next':
      return next(ctx, fs, commandArgs)
    case 'check':
      return check(ctx, fs, commandArgs, defaultProcessRunner, glob)
    case 'help':
      ctx.stdout(HELP_TEXT)
      return { exitCode: 0 }
  }
}

export async function main(options: MainOptions): Promise<CommandResult> {
  const { args, ctx, fs, glob } = options
  const command = args[0]
  const commandArgs = args.slice(1)

  if (isHelpRequest(command)) {
    ctx.stdout(HELP_TEXT)
    return { exitCode: 0 }
  }

  if (!isValidCommand(command)) {
    ctx.stderr(`Unknown command: ${command}`)
    ctx.stderr(`Run 'dust help' for available commands`)
    return { exitCode: 1 }
  }

  return runCommand(command, commandArgs, ctx, fs, glob)
}
