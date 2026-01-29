/**
 * dust agent new goal - Goal creation instructions
 *
 * Displays guidance for creating new goals.
 */

import { loadTemplate } from '../templates'
import type { CommandDependencies, CommandResult } from '../types'
import { manageGitHooks, templateVariables } from './agent-shared'

export async function agentNewGoal(
  deps: CommandDependencies
): Promise<CommandResult> {
  const { context: ctx, settings } = deps

  const hooksInstalled = await manageGitHooks(deps)
  const vars = templateVariables(settings, hooksInstalled)

  ctx.stdout(loadTemplate('agent-new-goal', vars))
  return { exitCode: 0 }
}
