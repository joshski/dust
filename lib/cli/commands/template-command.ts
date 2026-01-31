/**
 * Template command factory
 *
 * Creates command handlers that load and render templates with standard variables.
 */

import { loadTemplate } from '../templates'
import type { CommandDependencies, CommandResult } from '../types'
import { manageGitHooks, templateVariables } from './agent-shared'

export const createTemplateCommand =
  (templateName: string) =>
  async (dependencies: CommandDependencies): Promise<CommandResult> => {
    const { context, settings } = dependencies
    const hooksInstalled = await manageGitHooks(dependencies)
    const vars = templateVariables(settings, hooksInstalled)
    context.stdout(loadTemplate(templateName, vars))
    return { exitCode: 0 }
  }
