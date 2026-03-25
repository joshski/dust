/**
 * dust loop claude - Continuous Claude iteration on available tasks
 *
 * Usage: dust loop claude [max-iterations]
 */

import type { LoopDependencies } from '../../loop/iteration'
import { runLoop } from '../../loop/loop'
import type { CommandDependencies, CommandResult } from '../types'

export async function loopClaude(
  dependencies: CommandDependencies,
  loopDependencies: LoopDependencies
): Promise<CommandResult> {
  return runLoop(dependencies, loopDependencies)
}
