/**
 * dust agent pick task - Task selection instructions
 *
 * Displays guidance for picking a task to work on.
 */

import { loadTemplate } from '../templates'
import type { CommandDependencies, CommandResult } from '../types'
import { manageGitHooks, templateVariables } from './agent-shared'

export async function agentPickTask(
  dependencies: CommandDependencies
): Promise<CommandResult> {
  const { context, settings } = dependencies

  const hooksInstalled = await manageGitHooks(dependencies)
  const vars = templateVariables(settings, hooksInstalled)

  context.stdout(loadTemplate('agent-pick-task', vars))
  return { exitCode: 0 }
}
