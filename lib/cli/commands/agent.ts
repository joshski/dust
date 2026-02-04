/**
 * dust agent - Agent greeting and routing instructions
 *
 * Displays the welcome message and command routing guidance for AI agents.
 */

import { loadTemplate } from '../templates'
import type { CommandDependencies, CommandResult } from '../types'
import {
  manageGitHooks,
  templateVariablesWithInstructions,
} from './agent-shared'

export async function agent(
  dependencies: CommandDependencies
): Promise<CommandResult> {
  const { context, fileSystem, settings } = dependencies
  const hooksInstalled = await manageGitHooks(dependencies)

  const vars = await templateVariablesWithInstructions(
    context.cwd,
    fileSystem,
    settings,
    hooksInstalled
  )
  context.stdout(loadTemplate('agent-greeting', vars))

  return { exitCode: 0 }
}
