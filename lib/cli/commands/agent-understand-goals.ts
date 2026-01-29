/**
 * dust agent understand goals - Goals understanding instructions
 *
 * Displays guidance for understanding project goals.
 */

import { loadTemplate } from '../templates'
import type { CommandDependencies, CommandResult } from '../types'
import { manageGitHooks, templateVariables } from './agent-shared'

export async function agentUnderstandGoals(
  deps: CommandDependencies
): Promise<CommandResult> {
  const { context: ctx, settings } = deps

  const hooksInstalled = await manageGitHooks(deps)
  const vars = templateVariables(settings, hooksInstalled)

  ctx.stdout(loadTemplate('agent-understand-goals', vars))
  return { exitCode: 0 }
}
