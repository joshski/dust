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
import { type DustSettings, loadSettings } from './settings'
import type { CommandContext, CommandResult, FileSystem } from './types'
import type { GlobScanner } from './validate'
import { validate } from './validate'

export interface CommandDefinition {
  name: string
  description: string
  usage: string
  example: string
  execute: (
    ctx: CommandContext,
    fs: FileSystem,
    args: string[],
    glob: GlobScanner,
    settings: DustSettings
  ) => Promise<CommandResult>
}

function createCommandRegistry(
  helpExecute: CommandDefinition['execute']
): Record<string, CommandDefinition> {
  return {
    init: {
      name: 'init',
      description: 'Initialize a new Dust repository',
      usage: 'init',
      example: 'init',
      execute: (ctx, fs, args) => init(ctx, fs, args),
    },
    prompt: {
      name: 'prompt',
      description: 'Output a prompt by name (e.g., {bin} prompt work)',
      usage: 'prompt <name>',
      example: 'prompt work',
      execute: (ctx, fs, args) => prompt(ctx, fs, args),
    },
    validate: {
      name: 'validate',
      description: 'Run validation checks on .dust/ files',
      usage: 'validate',
      example: 'validate',
      execute: (ctx, fs, args, glob) => validate(ctx, fs, args, glob),
    },
    list: {
      name: 'list',
      description: 'List items (tasks, ideas, goals, facts)',
      usage: 'list [type]',
      example: 'list tasks',
      execute: (ctx, fs, args) => list(ctx, fs, args),
    },
    next: {
      name: 'next',
      description: 'Show tasks ready to work on (not blocked)',
      usage: 'next',
      example: 'next',
      execute: (ctx, fs, args) => next(ctx, fs, args),
    },
    check: {
      name: 'check',
      description: 'Run project-defined quality gate hook',
      usage: 'check',
      example: 'check',
      execute: (ctx, fs, args, glob) =>
        check(ctx, fs, args, defaultProcessRunner, glob),
    },
    help: {
      name: 'help',
      description: 'Show this help message',
      usage: 'help',
      example: 'list',
      execute: helpExecute,
    },
  }
}

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

export function generateHelpText(
  settings: DustSettings,
  registry: Record<string, CommandDefinition>
): string {
  const bin = settings.binaryPath

  const commandLines = COMMANDS.map(name => {
    const cmd = registry[name]
    const usage = cmd.usage.padEnd(16)
    const description = cmd.description.replace('{bin}', bin)
    return `  ${usage}${description}`
  }).join('\n')

  const exampleLines = COMMANDS.filter(name => name !== 'help')
    .map(name => {
      const cmd = registry[name]
      return `  ${bin} ${cmd.example}`
    })
    .join('\n')

  return `dust - A lightweight planning system for human-AI collaboration

Usage: ${bin} <command> [options]

Commands:
${commandLines}

Examples:
${exampleLines}

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

**Run \`${bin} check\` before starting work** to verify the project is in a good state before making changes.

Run \`${bin} next\` to find tasks ready to work on. Each task file contains:

- \`## Goals\` - Links to goals this task supports
- \`## Blocked by\` - Tasks that must complete first (empty or "(none)" means ready)
- \`## Definition of done\` - Criteria for completion

A task is **unblocked** when its "Blocked by" section is empty, says "(none)", or all referenced task files have been deleted.

### Completing a Task

**Run \`${bin} check\` before committing** to ensure all quality gates pass.

When finishing a task, create a single atomic commit that includes:

1. All implementation changes
2. Deletion of the completed task file
3. Updates to any facts that changed
4. Deletion of any ideas that were fully realized
5. Updates to any tasks that referenced this one in their "Blocked by" sections

### Common Workflows

- **"Work on the next task"** - Run \`${bin} next\`, pick a task, implement it
- **"Work on task X"** - Implement \`.dust/tasks/X.md\` directly
- **"Convert idea Y to tasks"** - Break down \`.dust/ideas/Y.md\` into tasks
- **"Validate facts"** - Check \`.dust/facts/\` for accuracy against the codebase

### Configuring Agent Files

Projects using dust should add a minimal pointer to their agent configuration files (CLAUDE.md, AGENTS.md, etc.):

\`\`\`markdown
This project uses [dust](https://github.com/joshski/dust) for planning and documentation.\nAlways run \`dust help\` when you start working in this repository.
\`\`\`

This approach keeps agent instructions minimal, ensures agents get current documentation, and reduces maintenance burden.
`
}

// Default registry for backward compatibility
function defaultHelpExecute(
  ctx: CommandContext,
  _fs: FileSystem,
  _args: string[],
  _glob: GlobScanner,
  settings: DustSettings
): Promise<CommandResult> {
  const registry = createCommandRegistry(defaultHelpExecute)
  ctx.stdout(generateHelpText(settings, registry))
  return Promise.resolve({ exitCode: 0 })
}

export const defaultRegistry = createCommandRegistry(defaultHelpExecute)

// Default help text for backward compatibility in tests
export const HELP_TEXT = generateHelpText(
  { binaryPath: 'dust' },
  defaultRegistry
)

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
  glob: GlobScanner,
  settings: DustSettings
): Promise<CommandResult> {
  const cmd = defaultRegistry[command]
  return cmd.execute(ctx, fs, commandArgs, glob, settings)
}

export async function main(options: MainOptions): Promise<CommandResult> {
  const { args, ctx, fs, glob } = options
  const command = args[0]
  const commandArgs = args.slice(1)

  const settings = await loadSettings(ctx.cwd, fs)
  const helpText = generateHelpText(settings, defaultRegistry)

  if (isHelpRequest(command)) {
    ctx.stdout(helpText)
    return { exitCode: 0 }
  }

  if (!isValidCommand(command)) {
    ctx.stderr(`Unknown command: ${command}`)
    ctx.stderr(`Run '${settings.binaryPath} help' for available commands`)
    return { exitCode: 1 }
  }

  return runCommand(command, commandArgs, ctx, fs, glob, settings)
}
