/**
 * Agent-specific commands
 *
 * Provides focused, workflow-specific guidance for AI agents.
 */

import type { DustSettings } from '../settings'
import { loadTemplate } from '../templates'
import type { CommandContext, CommandResult } from '../types'

export const AGENT_SUBCOMMANDS = [
  'work',
  'tasks',
  'goals',
  'ideas',
  'help',
] as const

export type AgentSubcommand = (typeof AGENT_SUBCOMMANDS)[number]

function generateAgentGreeting(settings: DustSettings): string {
  return loadTemplate('agent-greeting', { bin: settings.dustCommand })
}

function generateWorkInstructions(settings: DustSettings): string {
  return loadTemplate('agent-work', { bin: settings.dustCommand })
}

function generateTasksInstructions(settings: DustSettings): string {
  return loadTemplate('agent-tasks', { bin: settings.dustCommand })
}

function generateGoalsInstructions(settings: DustSettings): string {
  return loadTemplate('agent-goals', { bin: settings.dustCommand })
}

function generateIdeasInstructions(settings: DustSettings): string {
  return loadTemplate('agent-ideas', { bin: settings.dustCommand })
}

function generateAgentHelp(settings: DustSettings): string {
  return loadTemplate('agent-help', { bin: settings.dustCommand })
}

export async function agent(
  ctx: CommandContext,
  args: string[],
  settings: DustSettings
): Promise<CommandResult> {
  const subcommand = args[0]

  if (!subcommand) {
    ctx.stdout(generateAgentGreeting(settings))
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
      ctx.stdout(generateAgentHelp(settings))
      return { exitCode: 0 }
    default:
      ctx.stderr(`Unknown subcommand: ${subcommand}`)
      ctx.stderr(`Available: ${AGENT_SUBCOMMANDS.join(', ')}`)
      return { exitCode: 1 }
  }
}
