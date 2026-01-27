/**
 * Main entry point for dust CLI
 *
 * This module contains all the command routing, help text, and adapter setup
 * so that bin/dust can be minimal.
 */

import { agent } from './agent'
import { check } from './check'
import { init } from './init'
import { list } from './list'
import { next } from './next'
import { prompt } from './prompt'
import { type DustSettings, loadSettings } from './settings'
import { loadTemplate } from './templates'
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
  'agent',
  'help',
] as const

export type Command = (typeof COMMANDS)[number]

export function generateHelpText(settings: DustSettings): string {
  return loadTemplate('help', { bin: settings.dustCommand })
}

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
  commandArgs: string[],
  ctx: CommandContext,
  fs: FileSystem,
  glob: GlobScanner,
  settings: DustSettings
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
      return check(ctx, fs, commandArgs, glob)
    case 'agent':
      return agent(ctx, commandArgs, settings)
    case 'help':
      ctx.stdout(generateHelpText(settings))
      return { exitCode: 0 }
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

  return runCommand(command, commandArgs, ctx, fs, glob, settings)
}
