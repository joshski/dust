/**
 * dust help - Display help text
 */

import { loadTemplate } from '../templates'
import type { CommandDependencies, CommandResult } from '../types'

export function generateHelpText(settings: { dustCommand: string }): string {
  return loadTemplate('help', { bin: settings.dustCommand })
}

export async function help(deps: CommandDependencies): Promise<CommandResult> {
  deps.context.stdout(generateHelpText(deps.settings))
  return { exitCode: 0 }
}
