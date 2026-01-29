/**
 * dust agent help - Display agent-specific help
 *
 * Shows detailed guidance for AI agents on using dust commands.
 */

import { loadTemplate } from '../templates'
import type { CommandDependencies, CommandResult } from '../types'
import { manageGitHooks, templateVariables } from './agent-shared'

export async function agentHelp(
  dependencies: CommandDependencies
): Promise<CommandResult> {
  const { context, settings } = dependencies

  const hooksInstalled = await manageGitHooks(dependencies)
  const vars = templateVariables(settings, hooksInstalled)

  context.stdout(loadTemplate('agent-help', vars))
  return { exitCode: 0 }
}
