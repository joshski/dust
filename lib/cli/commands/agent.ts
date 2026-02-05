/**
 * dust agent - Agent greeting and routing instructions
 *
 * Displays the welcome message and command routing guidance for AI agents.
 */

import { loadTemplate } from '../templates'
import type { CommandDependencies, CommandResult } from '../types'
import { manageGitHooks, templateVariables } from './agent-shared'
import {
  defaultHealthCheckGitRunner,
  type HealthCheckGitRunner,
  runHealthCheck,
} from './health-check'

export async function agent(
  dependencies: CommandDependencies,
  healthCheckGitRunner: HealthCheckGitRunner = defaultHealthCheckGitRunner
): Promise<CommandResult> {
  const { context, fileSystem, settings } = dependencies
  const hooksInstalled = await manageGitHooks(dependencies)

  const vars = templateVariables(settings, hooksInstalled)
  context.stdout(loadTemplate('agent-greeting', vars))

  await runHealthCheck(context, fileSystem, settings, healthCheckGitRunner)

  return { exitCode: 0 }
}
