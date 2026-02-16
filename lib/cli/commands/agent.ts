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
  dependencies: CommandDependencies,
  env: NodeJS.ProcessEnv = process.env
): Promise<CommandResult> {
  const { context, fileSystem, settings } = dependencies

  // Detect if running in an automated loop context
  if (env.DUST_SKIP_AGENT === '1') {
    context.stdout(
      "You're running in an automated loop - proceeding to implement the assigned task."
    )
    return { exitCode: 0 }
  }

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
