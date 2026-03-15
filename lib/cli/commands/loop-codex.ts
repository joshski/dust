/**
 * dust loop codex - Continuous Codex iteration on available tasks
 *
 * Same as `dust loop claude` but uses OpenAI's Codex CLI instead.
 *
 * Usage: dust loop codex [max-iterations]
 */

import { run as codexRun } from '../../codex/run'
import {
  createDefaultDependencies,
  type LoopDependencies,
} from '../../loop/iteration'
import { runLoop } from '../../loop/loop'
import type { CommandDependencies, CommandResult } from '../types'

export function createCodexDependencies(
  overrides: Partial<LoopDependencies> = {}
): LoopDependencies {
  return {
    ...createDefaultDependencies(),
    run: codexRun as LoopDependencies['run'],
    ...overrides,
    agentType: 'codex',
  }
}

export async function loopCodex(
  dependencies: CommandDependencies,
  loopDependencies: LoopDependencies = createCodexDependencies()
): Promise<CommandResult> {
  return runLoop(dependencies, {
    ...loopDependencies,
    agentType: 'codex',
  })
}
