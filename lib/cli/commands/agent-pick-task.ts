/**
 * dust agent pick task - Task selection instructions
 *
 * Displays guidance for picking a task to work on.
 */

import { loadTemplate } from '../templates'
import type { CommandDependencies, CommandResult } from '../types'
import { manageGitHooks, templateVariables } from './agent-shared'

export async function agentPickTask(
  deps: CommandDependencies
): Promise<CommandResult> {
  const { context: ctx, settings } = deps

  const hooksInstalled = await manageGitHooks(deps)
  const vars = templateVariables(settings, hooksInstalled)

  ctx.stdout(loadTemplate('agent-pick-task', vars))
  return { exitCode: 0 }
}
