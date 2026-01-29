/**
 * dust help - Display help text
 */

import { loadTemplate } from '../templates'
import type { CommandDependencies, CommandResult } from '../types'

export function generateHelpText(settings: { dustCommand: string }): string {
  return loadTemplate('help', { bin: settings.dustCommand })
}

export async function help(
  dependencies: CommandDependencies
): Promise<CommandResult> {
  dependencies.context.stdout(generateHelpText(dependencies.settings))
  return { exitCode: 0 }
}
