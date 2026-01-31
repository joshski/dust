/**
 * Shorthand commands for listing specific types
 *
 * These commands provide direct access to list specific item types:
 * - dust tasks -> list tasks
 * - dust goals -> list goals
 * - dust ideas -> list ideas
 * - dust facts -> list facts
 */

import type { CommandDependencies, CommandResult } from '../types'
import { list } from './list'

export async function tasks(
  dependencies: CommandDependencies
): Promise<CommandResult> {
  return list({ ...dependencies, arguments: ['tasks'] })
}

export async function goals(
  dependencies: CommandDependencies
): Promise<CommandResult> {
  return list({ ...dependencies, arguments: ['goals'] })
}

export async function ideas(
  dependencies: CommandDependencies
): Promise<CommandResult> {
  return list({ ...dependencies, arguments: ['ideas'] })
}

export async function facts(
  dependencies: CommandDependencies
): Promise<CommandResult> {
  return list({ ...dependencies, arguments: ['facts'] })
}
