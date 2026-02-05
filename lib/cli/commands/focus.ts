/**
 * dust focus - Declare current objective
 *
 * Outputs the current focus/objective to stdout.
 *
 * Usage: dust focus "add login box"
 */

import type { CommandDependencies, CommandResult } from '../types'

export async function focus(
  dependencies: CommandDependencies
): Promise<CommandResult> {
  const { context } = dependencies

  // Parse objective from arguments
  const objective = dependencies.arguments.join(' ').trim()

  if (!objective) {
    context.stderr('Error: No objective provided')
    context.stderr('Usage: dust focus "your objective here"')
    return { exitCode: 1 }
  }

  // Output confirmation
  context.stdout(`🎯 Focus: ${objective}`)

  return { exitCode: 0 }
}
