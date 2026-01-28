/**
 * Agent-specific commands
 *
 * Provides focused, workflow-specific guidance for AI agents.
 */

import { loadTemplate } from '../templates'
import type { CommandDependencies, CommandResult, DustSettings } from '../types'

export const AGENT_SUBCOMMANDS = [
  'work',
  'implement',
  'task',
  'goal',
  'idea',
  'help',
] as const

export type AgentSubcommand = (typeof AGENT_SUBCOMMANDS)[number]

function templateVariables(settings: DustSettings) {
  return {
    bin: settings.dustCommand,
    installDependenciesHint:
      settings.installDependenciesHint || 'Install any dependencies',
  }
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
    case 'implement':
      ctx.stdout(loadTemplate('agent-implement', vars))
      return { exitCode: 0 }
    case 'task':
      ctx.stdout(loadTemplate('agent-task', vars))
      return { exitCode: 0 }
    case 'goal':
      ctx.stdout(loadTemplate('agent-goal', vars))
      return { exitCode: 0 }
    case 'idea':
      ctx.stdout(loadTemplate('agent-idea', vars))
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
