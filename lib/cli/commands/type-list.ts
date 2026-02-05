/**
 * Commands for listing specific types
 *
 * These are the primary commands for listing items:
 * - dust tasks - lists all tasks
 * - dust goals - lists all goals
 * - dust ideas - lists all ideas
 * - dust facts - lists all facts
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
