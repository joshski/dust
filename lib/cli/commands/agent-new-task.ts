/**
 * dust agent new task - Task creation instructions
 *
 * Displays guidance for creating new tasks.
 */

import { loadTemplate } from '../templates'
import type { CommandDependencies, CommandResult } from '../types'
import { manageGitHooks, templateVariables } from './agent-shared'

export async function agentNewTask(
  deps: CommandDependencies
): Promise<CommandResult> {
  const { context: ctx, settings } = deps

  const hooksInstalled = await manageGitHooks(deps)
  const vars = templateVariables(settings, hooksInstalled)

  ctx.stdout(loadTemplate('agent-new-task', vars))
  return { exitCode: 0 }
}
