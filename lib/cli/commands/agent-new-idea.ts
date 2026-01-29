/**
 * dust agent new idea - Idea creation instructions
 *
 * Displays guidance for capturing new ideas.
 */

import { loadTemplate } from '../templates'
import type { CommandDependencies, CommandResult } from '../types'
import { manageGitHooks, templateVariables } from './agent-shared'

export async function agentNewIdea(
  dependencies: CommandDependencies
): Promise<CommandResult> {
  const { context, settings } = dependencies

  const hooksInstalled = await manageGitHooks(dependencies)
  const vars = templateVariables(settings, hooksInstalled)

  context.stdout(loadTemplate('agent-new-idea', vars))
  return { exitCode: 0 }
}
