/**
 * dust core principle <name> - Display a specific core principle
 */

import { readAllCorePrinciples } from '../../core-principles'
import type { CommandDependencies, CommandResult } from '../types'

export async function corePrinciple(
  dependencies: CommandDependencies
): Promise<CommandResult> {
  const { arguments: commandArguments, context } = dependencies

  if (commandArguments.length === 0) {
    context.stderr('Error: Missing principle name')
    context.stderr('Usage: dust core principle <name>')
    context.stderr('')
    context.stderr('Available principles can be found by running:')
    context.stderr('  dust principles')
    return { exitCode: 1 }
  }

  const slug = commandArguments[0]

  // Load all core principles and find the matching one
  const allPrinciples = await readAllCorePrinciples()
  const principle = allPrinciples.find(p => p.slug === slug)

  if (!principle) {
    context.stderr(`Error: Core principle "${slug}" not found`)
    context.stderr('')
    context.stderr('Available principles can be found by running:')
    context.stderr('  dust principles')
    return { exitCode: 1 }
  }

  // Display the principle content
  context.stdout(principle.content)

  return { exitCode: 0 }
}
