/**
 * Agent-specific commands
 *
 * Provides focused, workflow-specific guidance for AI agents.
 * Commands use verb-noun patterns for clarity (e.g., "new task", "implement task").
 */

import { createHooksManager } from '../../git/hooks'
import { loadTemplate } from '../templates'
import type { CommandDependencies, CommandResult, DustSettings } from '../types'

export const AGENT_SUBCOMMANDS = [
  'new task',
  'new goal',
  'new idea',
  'implement task',
  'understand goals',
  'pick task',
  'help',
] as const

export type AgentSubcommand = (typeof AGENT_SUBCOMMANDS)[number]

function templateVariables(settings: DustSettings, hooksInstalled: boolean) {
  return {
    bin: settings.dustCommand,
    installDependenciesHint:
      settings.installDependenciesHint || 'Install any dependencies',
    hooksInstalled: hooksInstalled ? 'true' : 'false',
  }
}

/**
 * Manages git hook installation for the agent command.
 * Automatically installs pre-push hooks if:
 * - Git is available
 * - Hooks are not already installed
 * Also verifies and updates the binary path if needed.
 * Returns whether hooks are installed.
 */
async function manageGitHooks(deps: CommandDependencies): Promise<boolean> {
  const { context: ctx, fileSystem: fs, settings } = deps
  const hooks = createHooksManager(ctx.cwd, fs, settings)

  // Skip if not a git repo
  if (!hooks.isGitRepo()) {
    return false
  }

  const isInstalled = await hooks.isHookInstalled()

  if (!isInstalled) {
    // Install hooks
    await hooks.installHook()
    return true
  }

  // Verify binary path matches current settings
  const hookBinaryPath = await hooks.getHookBinaryPath()
  if (hookBinaryPath && hookBinaryPath !== settings.dustCommand) {
    await hooks.updateHookBinaryPath(settings.dustCommand)
  }

  return true
}

export async function agent(deps: CommandDependencies): Promise<CommandResult> {
  const { arguments: args, context: ctx, settings } = deps
  const verb = args[0]
  const noun = args[1]

  // Manage git hooks when agent command is invoked
  const hooksInstalled = await manageGitHooks(deps)
  const vars = templateVariables(settings, hooksInstalled)

  if (!verb) {
    ctx.stdout(loadTemplate('agent-greeting', vars))
    return { exitCode: 0 }
  }

  // Single-word command: help
  if (verb === 'help' && !noun) {
    ctx.stdout(loadTemplate('agent-help', vars))
    return { exitCode: 0 }
  }

  // Two-word commands: verb + noun
  const subcommand = noun ? `${verb} ${noun}` : verb

  switch (subcommand) {
    case 'new task':
      ctx.stdout(loadTemplate('agent-new-task', vars))
      return { exitCode: 0 }
    case 'new goal':
      ctx.stdout(loadTemplate('agent-new-goal', vars))
      return { exitCode: 0 }
    case 'new idea':
      ctx.stdout(loadTemplate('agent-new-idea', vars))
      return { exitCode: 0 }
    case 'implement task':
      ctx.stdout(loadTemplate('agent-implement-task', vars))
      return { exitCode: 0 }
    case 'understand goals':
      ctx.stdout(loadTemplate('agent-understand-goals', vars))
      return { exitCode: 0 }
    case 'pick task':
      ctx.stdout(loadTemplate('agent-pick-task', vars))
      return { exitCode: 0 }
    default:
      ctx.stderr(`Unknown subcommand: ${subcommand}`)
      ctx.stderr(`Available: ${AGENT_SUBCOMMANDS.join(', ')}`)
      return { exitCode: 1 }
  }
}
