/**
 * Commands for listing specific types
 *
 * These are the primary commands for listing items:
 * - dust tasks - lists all tasks
 * - dust principles - lists all principles
 * - dust ideas - lists all ideas
 * - dust facts - lists all facts
 */

import type { CommandDependencies, CommandResult } from '../types'
import { list } from '../commands/list'

export async function tasks(
  dependencies: CommandDependencies
): Promise<CommandResult> {
  return list({
    ...dependencies,
    arguments: ['tasks', ...dependencies.arguments],
  })
}

export async function principles(
  dependencies: CommandDependencies
): Promise<CommandResult> {
  return list({
    ...dependencies,
    arguments: ['principles', ...dependencies.arguments],
  })
}

export async function ideas(
  dependencies: CommandDependencies
): Promise<CommandResult> {
  return list({
    ...dependencies,
    arguments: ['ideas', ...dependencies.arguments],
  })
}

export async function facts(
  dependencies: CommandDependencies
): Promise<CommandResult> {
  return list({
    ...dependencies,
    arguments: ['facts', ...dependencies.arguments],
  })
}
