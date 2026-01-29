/**
 * dust agent new idea - Idea creation instructions
 *
 * Displays guidance for capturing new ideas.
 */

import { loadTemplate } from '../templates'
import type { CommandDependencies, CommandResult } from '../types'
import { manageGitHooks, templateVariables } from './agent-shared'

export async function agentNewIdea(
  deps: CommandDependencies
): Promise<CommandResult> {
  const { context: ctx, settings } = deps

  const hooksInstalled = await manageGitHooks(deps)
  const vars = templateVariables(settings, hooksInstalled)

  ctx.stdout(loadTemplate('agent-new-idea', vars))
  return { exitCode: 0 }
}
