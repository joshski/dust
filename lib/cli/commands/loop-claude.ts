/**
 * dust loop claude - Continuous Claude iteration on available tasks
 *
 * Usage: dust loop claude [max-iterations]
 */

import {
  createDefaultDependencies,
  type LoopDependencies,
} from '../../loop/iteration'
import { runLoop } from '../../loop/loop'
import type { CommandDependencies, CommandResult } from '../types'

export async function loopClaude(
  dependencies: CommandDependencies,
  loopDependencies?: LoopDependencies
): Promise<CommandResult> {
  loopDependencies ??=
    /* istanbul ignore next @preserve -- default parameter branch */ createDefaultDependencies()
  return runLoop(dependencies, loopDependencies)
}
