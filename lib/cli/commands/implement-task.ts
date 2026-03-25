/**
 * dust implement task - Redirect to focus
 *
 * Kept for backward compatibility. Directs the agent to use `focus` instead.
 */

import type { CommandDependencies, CommandResult } from '../types'
import { manageGitHooks, templateVariables } from '../shared/agent-shared'

export async function implementTask(
  dependencies: CommandDependencies
): Promise<CommandResult> {
  const { context, settings } = dependencies
  const hooksInstalled = await manageGitHooks(dependencies)
  const vars = templateVariables(settings, hooksInstalled, process.env)

  context.stdout(
    `Run \`${vars.bin} focus "<task name>"\` to set your focus and see implementation instructions.`
  )

  return { exitCode: 0 }
}
