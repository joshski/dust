/**
 * Agent-specific commands
 *
 * Provides focused, workflow-specific guidance for AI agents.
 */

import { loadTemplate } from '../templates'
import type { CommandDependencies, CommandResult, DustSettings } from '../types'

export const AGENT_SUBCOMMANDS = [
  'work',
  'tasks',
  'goals',
  'ideas',
  'help',
] as const

export type AgentSubcommand = (typeof AGENT_SUBCOMMANDS)[number]

function templateVariables(settings: DustSettings) {
  return { bin: settings.dustCommand }
}

export async function agent(deps: CommandDependencies): Promise<CommandResult> {
  const { arguments: args, context: ctx, settings } = deps
  const subcommand = args[0]
  const vars = templateVariables(settings)

  if (!subcommand) {
    ctx.stdout(loadTemplate('agent-greeting', vars))
    return { exitCode: 0 }
  }

  switch (subcommand) {
    case 'work':
      ctx.stdout(loadTemplate('agent-work', vars))
      return { exitCode: 0 }
    case 'tasks':
      ctx.stdout(loadTemplate('agent-tasks', vars))
      return { exitCode: 0 }
    case 'goals':
      ctx.stdout(loadTemplate('agent-goals', vars))
      return { exitCode: 0 }
    case 'ideas':
      ctx.stdout(loadTemplate('agent-ideas', vars))
      return { exitCode: 0 }
    case 'help':
      ctx.stdout(loadTemplate('agent-help', vars))
      return { exitCode: 0 }
    default:
      ctx.stderr(`Unknown subcommand: ${subcommand}`)
      ctx.stderr(`Available: ${AGENT_SUBCOMMANDS.join(', ')}`)
      return { exitCode: 1 }
  }
}
