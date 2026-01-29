/**
 * dust agent new goal - Goal creation instructions
 *
 * Displays guidance for creating new goals.
 */

import { loadTemplate } from '../templates'
import type { CommandDependencies, CommandResult } from '../types'
import { manageGitHooks, templateVariables } from './agent-shared'

export async function agentNewGoal(
  dependencies: CommandDependencies
): Promise<CommandResult> {
  const { context, settings } = dependencies

  const hooksInstalled = await manageGitHooks(dependencies)
  const vars = templateVariables(settings, hooksInstalled)

  context.stdout(loadTemplate('agent-new-goal', vars))
  return { exitCode: 0 }
}
