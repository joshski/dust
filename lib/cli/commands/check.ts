/**
 * dust check - Execute project-defined quality gate checks
 *
 * Runs `dust lint` and executes checks from settings.json.
 */

import { createLogger, enableFileLogs } from '../../logging'
import { defaultShellRunner, type ShellRunner } from '../process-runner'
import type {
  CheckConfig,
  CommandContext,
  CommandDependencies,
  CommandResult,
} from '../types'
import { lintMarkdown } from './lint-markdown'

const log = createLogger('dust:cli:commands:check')

type Clock = () => number

const DEFAULT_CHECK_TIMEOUT_MS = 13000 // Long enough for typical lint/test runs, short enough to fail fast on hangs
const MAX_OUTPUT_LINES = 500
const KEEP_LINES = 250

export function truncateOutput(output: string): string {
  const lines = output.split('\n')
  if (lines.length <= MAX_OUTPUT_LINES) {
    return output
  }
  const snippedCount = lines.length - KEEP_LINES * 2
  const firstLines = lines.slice(0, KEEP_LINES)
  const lastLines = lines.slice(-KEEP_LINES)
  return [
    ...firstLines,
    `[...snip ${snippedCount} lines...]`,
    ...lastLines,
  ].join('\n')
}

interface CheckResult {
  name: string
  command: string
  exitCode: number
  output: string
  isBuiltIn?: boolean
  hints?: string[]
  durationMs: number
  timedOut: boolean
  timeoutSeconds?: number
}

interface OrderedFlushState<T> {
  nextIndex: number
  completedByIndex: Map<number, T>
}

export function createOrderedFlushState<T>(): OrderedFlushState<T> {
  return {
    nextIndex: 0,
    completedByIndex: new Map(),
  }
}

export function flushCompletedInDisplayOrder<T>(
  state: OrderedFlushState<T>,
  completedIndex: number,
  value: T
): { nextState: OrderedFlushState<T>; ready: T[] } {
  const completedByIndex = new Map(state.completedByIndex)
  completedByIndex.set(completedIndex, value)

  const ready: T[] = []
  let nextIndex = state.nextIndex

  while (completedByIndex.has(nextIndex)) {
    ready.push(completedByIndex.get(nextIndex) as T)
    completedByIndex.delete(nextIndex)
    nextIndex += 1
  }

  return {
    nextState: { nextIndex, completedByIndex },
    ready,
  }
}

async function runSingleCheck(
  check: CheckConfig,
  cwd: string,
  runner: ShellRunner,
  emitEvent?: CommandContext['emitEvent'],
  clock: Clock = Date.now
): Promise<CheckResult> {
  const timeoutMs = check.timeoutMilliseconds ?? DEFAULT_CHECK_TIMEOUT_MS
  log(`running check ${check.name}: ${check.command}`)
  emitEvent?.({ type: 'check-started', name: check.name })
  const startTime = clock()
  const result = await runner.run(check.command, cwd, timeoutMs)
  const durationMs = clock() - startTime
  const status = result.timedOut
    ? 'timed out'
    : result.exitCode === 0
      ? 'passed'
      : 'failed'
  log(`check ${check.name} ${status} (${durationMs}ms)`)
  if (result.exitCode === 0) {
    emitEvent?.({ type: 'check-passed', name: check.name, durationMs })
  } else {
    const failedEvent: Parameters<NonNullable<typeof emitEvent>>[0] = {
      type: 'check-failed',
      name: check.name,
      durationMs,
    }
    if (result.output) failedEvent.output = result.output
    emitEvent?.(failedEvent)
  }
  return {
    name: check.name,
    command: check.command,
    exitCode: result.exitCode,
    output: result.output,
    hints: check.hints,
    durationMs,
    timedOut: result.timedOut ?? false,
    timeoutSeconds: timeoutMs / 1000,
  }
}

async function runValidationCheck(
  dependencies: CommandDependencies,
  emitEvent?: CommandContext['emitEvent'],
  clock: Clock = Date.now
): Promise<CheckResult> {
  const outputLines: string[] = []
  const bufferedContext: CommandContext = {
    cwd: dependencies.context.cwd,
    stdout: (msg: string) => outputLines.push(msg),
    stderr: (msg: string) => outputLines.push(msg),
  }

  log('running built-in check: dust lint')
  emitEvent?.({ type: 'check-started', name: 'lint .dust directory' })
  const startTime = clock()
  const result = await lintMarkdown({
    ...dependencies,
    context: bufferedContext,
    arguments: [],
  })
  const durationMs = clock() - startTime
  const lintStatus = result.exitCode === 0 ? 'passed' : 'failed'
  log(`built-in check dust lint ${lintStatus} (${durationMs}ms)`)
  const output = outputLines.join('\n')
  if (result.exitCode === 0) {
    emitEvent?.({
      type: 'check-passed',
      name: 'lint .dust directory',
      durationMs,
    })
  } else {
    // Lint always produces output on failure, so we unconditionally include it
    emitEvent?.({
      type: 'check-failed',
      name: 'lint .dust directory',
      durationMs,
      output,
    })
  }

  return {
    name: 'lint .dust directory',
    command: 'dust lint',
    exitCode: result.exitCode,
    output,
    isBuiltIn: true,
    durationMs,
    timedOut: false,
  }
}

function formatStatusLine(result: CheckResult): string {
  if (result.timedOut) {
    return `✗ ${result.name} [timed out after ${result.timeoutSeconds}s]`
  }

  const timing =
    result.durationMs >= 1000
      ? ` [${(result.durationMs / 1000).toFixed(1)}s]`
      : ''
  const indicator = result.exitCode === 0 ? '✓' : '✗'
  return `${indicator} ${result.name}${timing}`
}

function displayFailureDetail(
  result: CheckResult,
  context: CommandContext
): void {
  if (result.exitCode === 0) {
    return
  }

  context.stdout('')
  context.stdout(`> ${result.command}`)
  if (result.timedOut) {
    context.stdout(
      `Note: This check was killed after ${result.timeoutSeconds}s. To configure a different timeout, set "timeoutMilliseconds" in the check configuration in .dust/config/settings.json`
    )
  }
  if (result.output.trim()) {
    context.stdout(truncateOutput(result.output).trimEnd())
  }
  if (result.hints && result.hints.length > 0) {
    context.stdout('')
    context.stdout(`Hints for fixing '${result.name}':`)
    for (const hint of result.hints) {
      context.stdout(`  - ${hint}`)
    }
  }
}

function displaySummary(
  results: CheckResult[],
  context: CommandContext
): number {
  const passed = results.filter(r => r.exitCode === 0)
  const failed = results.filter(r => r.exitCode !== 0)

  context.stdout('')
  const indicator = failed.length > 0 ? '✗' : '✓'
  context.stdout(
    `${indicator} ${passed.length}/${results.length} checks passed`
  )

  return failed.length > 0 ? 1 : 0
}

export async function check(
  dependencies: CommandDependencies,
  shellRunner: ShellRunner = defaultShellRunner,
  clock: Clock = Date.now,
  _setInterval: typeof globalThis.setInterval = globalThis.setInterval,
  _clearInterval: typeof globalThis.clearInterval = globalThis.clearInterval
): Promise<CommandResult> {
  const {
    arguments: commandArguments,
    context,
    fileSystem,
    settings,
  } = dependencies
  const serial = commandArguments.includes('--serial')
  enableFileLogs('check')

  if (!settings.checks || settings.checks.length === 0) {
    context.stderr('Error: No checks configured in .dust/config/settings.json')
    context.stderr('')
    context.stderr('Add checks to your settings.json:')
    context.stderr('  {')
    context.stderr('    "checks": [')
    context.stderr('      { "name": "lint", "command": "npm run lint" },')
    context.stderr('      { "name": "test", "command": "npm test" }')
    context.stderr('    ]')
    context.stderr('  }')
    return { exitCode: 1 }
  }

  const dustPath = `${context.cwd}/.dust`
  const hasDustDir = fileSystem.exists(dustPath)

  const orderedCheckExecutions: Array<() => Promise<CheckResult>> = []

  if (hasDustDir) {
    orderedCheckExecutions.push(() =>
      runValidationCheck(dependencies, context.emitEvent, clock)
    )
  }

  for (const configuredCheck of settings.checks) {
    orderedCheckExecutions.push(() =>
      runSingleCheck(
        configuredCheck,
        context.cwd,
        shellRunner,
        context.emitEvent,
        clock
      )
    )
  }

  const resultsByDisplayOrder: CheckResult[] = new Array(
    orderedCheckExecutions.length
  )

  if (serial) {
    for (let index = 0; index < orderedCheckExecutions.length; index += 1) {
      const result = await orderedCheckExecutions[index]()
      resultsByDisplayOrder[index] = result
      context.stdout(formatStatusLine(result))
      displayFailureDetail(result, context)
    }
  } else {
    const pending = new Set<Promise<{ index: number; result: CheckResult }>>()
    const pendingByIndex = new Map<
      number,
      Promise<{ index: number; result: CheckResult }>
    >()

    for (let index = 0; index < orderedCheckExecutions.length; index += 1) {
      const wrapped = orderedCheckExecutions[index]().then(result => ({
        index,
        result,
      }))
      pending.add(wrapped)
      pendingByIndex.set(index, wrapped)
    }

    let flushState = createOrderedFlushState<CheckResult>()

    while (pending.size > 0) {
      const settled = await Promise.race(pending)
      const settledPromise = pendingByIndex.get(settled.index)
      pending.delete(
        settledPromise as Promise<{ index: number; result: CheckResult }>
      )
      pendingByIndex.delete(settled.index)

      resultsByDisplayOrder[settled.index] = settled.result
      const { nextState, ready } = flushCompletedInDisplayOrder(
        flushState,
        settled.index,
        settled.result
      )
      flushState = nextState

      for (const result of ready) {
        context.stdout(formatStatusLine(result))
        displayFailureDetail(result, context)
      }
    }
  }

  const exitCode = displaySummary(resultsByDisplayOrder, context)

  return { exitCode }
}
