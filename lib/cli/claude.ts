/**
 * Agent-specific commands for Claude
 *
 * Provides focused, workflow-specific guidance for AI agents.
 */

import type { DustSettings } from './settings'
import { loadTemplate } from './templates'
import type { CommandContext, CommandResult } from './types'

export const CLAUDE_SUBCOMMANDS = [
  'work',
  'tasks',
  'goals',
  'ideas',
  'help',
] as const

export type ClaudeSubcommand = (typeof CLAUDE_SUBCOMMANDS)[number]

function generateClaudeGreeting(settings: DustSettings): string {
  return loadTemplate('claude-greeting', { bin: settings.binaryPath })
}

function generateWorkInstructions(settings: DustSettings): string {
  return loadTemplate('claude-work', { bin: settings.binaryPath })
}

function generateTasksInstructions(settings: DustSettings): string {
  return loadTemplate('claude-tasks', { bin: settings.binaryPath })
}

function generateGoalsInstructions(settings: DustSettings): string {
  return loadTemplate('claude-goals', { bin: settings.binaryPath })
}

function generateIdeasInstructions(settings: DustSettings): string {
  return loadTemplate('claude-ideas', { bin: settings.binaryPath })
}

function generateClaudeHelp(settings: DustSettings): string {
  return loadTemplate('claude-help', { bin: settings.binaryPath })
}

export async function claude(
  ctx: CommandContext,
  args: string[],
  settings: DustSettings
): Promise<CommandResult> {
  const subcommand = args[0]

  if (!subcommand) {
    ctx.stdout(generateClaudeGreeting(settings))
    return { exitCode: 0 }
  }

  switch (subcommand) {
    case 'work':
      ctx.stdout(generateWorkInstructions(settings))
      return { exitCode: 0 }
    case 'tasks':
      ctx.stdout(generateTasksInstructions(settings))
      return { exitCode: 0 }
    case 'goals':
      ctx.stdout(generateGoalsInstructions(settings))
      return { exitCode: 0 }
    case 'ideas':
      ctx.stdout(generateIdeasInstructions(settings))
      return { exitCode: 0 }
    case 'help':
      ctx.stdout(generateClaudeHelp(settings))
      return { exitCode: 0 }
    default:
      ctx.stderr(`Unknown subcommand: ${subcommand}`)
      ctx.stderr(`Available: ${CLAUDE_SUBCOMMANDS.join(', ')}`)
      return { exitCode: 1 }
  }
}
