/**
 * dust agent understand goals - Goals understanding instructions
 *
 * Displays guidance for understanding project goals.
 */

import { loadTemplate } from '../templates'
import type { CommandDependencies, CommandResult } from '../types'
import { manageGitHooks, templateVariables } from './agent-shared'

export async function agentUnderstandGoals(
  dependencies: CommandDependencies
): Promise<CommandResult> {
  const { context, settings } = dependencies

  const hooksInstalled = await manageGitHooks(dependencies)
  const vars = templateVariables(settings, hooksInstalled)

  context.stdout(loadTemplate('agent-understand-goals', vars))
  return { exitCode: 0 }
}
