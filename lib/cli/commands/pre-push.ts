/**
 * dust pre-push - Pre-push hook handler
 *
 * Runs `dust check` for pre-push hooks.
 */

import type { CommandDependencies, CommandResult } from '../types'
import { check } from './check'

export async function prePush(
  deps: CommandDependencies
): Promise<CommandResult> {
  return check(deps)
}
