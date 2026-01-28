/**
 * Main entry point for dust CLI
 *
 * This module contains all the command routing, help text, and adapter setup
 * so that bin/dust can be minimal.
 */

import { agent } from './commands/agent'
import { check } from './commands/check'
import { generateHelpText, help } from './commands/help'
import { init } from './commands/init'
import { list } from './commands/list'
import { next } from './commands/next'
import { validate } from './commands/validate'
import { loadSettings } from './settings'
import type {
  CommandContext,
  CommandDependencies,
  CommandResult,
  FileSystem,
  GlobScanner,
} from './types'

export const COMMANDS = [
  'init',
  'validate',
  'list',
  'next',
  'check',
  'agent',
  'help',
] as const

export type Command = (typeof COMMANDS)[number]

// Re-export for backward compatibility
export { generateHelpText }

// Default help text for backward compatibility in tests
export const HELP_TEXT = generateHelpText({ dustCommand: 'dust' })

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
  deps: CommandDependencies
): Promise<CommandResult> {
  switch (command) {
    case 'init':
      return init(deps)
    case 'validate':
      return validate(deps)
    case 'list':
      return list(deps)
    case 'next':
      return next(deps)
    case 'check':
      return check(deps)
    case 'agent':
      return agent(deps)
    case 'help':
      return help(deps)
  }
}

export async function main(options: MainOptions): Promise<CommandResult> {
  const { args, ctx, fs, glob } = options
  const command = args[0]
  const commandArgs = args.slice(1)

  const settings = await loadSettings(ctx.cwd, fs)
  const helpText = generateHelpText(settings)

  if (isHelpRequest(command)) {
    ctx.stdout(helpText)
    return { exitCode: 0 }
  }

  if (!isValidCommand(command)) {
    ctx.stderr(`Unknown command: ${command}`)
    ctx.stderr(`Run '${settings.dustCommand} help' for available commands`)
    return { exitCode: 1 }
  }

  const deps: CommandDependencies = {
    arguments: commandArgs,
    context: ctx,
    fileSystem: fs,
    globScanner: glob,
    settings,
  }

  return runCommand(command, deps)
}
