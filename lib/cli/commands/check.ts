/**
 * dust check - Execute project-defined quality gate checks
 *
 * Runs `dust lint` and executes checks from settings.json
 * in parallel with buffered output.
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

async function runConfiguredChecks(
  checks: CheckConfig[],
  cwd: string,
  runner: ShellRunner,
  emitEvent?: CommandContext['emitEvent'],
  clock: Clock = Date.now
): Promise<CheckResult[]> {
  const promises = checks.map(check =>
    runSingleCheck(check, cwd, runner, emitEvent, clock)
  )
  return Promise.all(promises)
}

async function runConfiguredChecksSerially(
  checks: CheckConfig[],
  cwd: string,
  runner: ShellRunner,
  emitEvent?: CommandContext['emitEvent'],
  clock: Clock = Date.now
): Promise<CheckResult[]> {
  const results: CheckResult[] = []
  for (const check of checks) {
    results.push(await runSingleCheck(check, cwd, runner, emitEvent, clock))
  }
  return results
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
  emitEvent?.({ type: 'check-started', name: 'lint' })
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
    emitEvent?.({ type: 'check-passed', name: 'lint', durationMs })
  } else {
    // Lint always produces output on failure, so we unconditionally include it
    emitEvent?.({
      type: 'check-failed',
      name: 'lint',
      durationMs,
      output,
    })
  }

  return {
    name: 'lint',
    command: 'dust lint',
    exitCode: result.exitCode,
    output,
    isBuiltIn: true,
    durationMs,
    timedOut: false,
  }
}

function displayResults(
  results: CheckResult[],
  context: CommandContext
): number {
  const passed = results.filter(r => r.exitCode === 0)
  const failed = results.filter(r => r.exitCode !== 0)

  // Display pass/fail status for each check
  for (const result of results) {
    if (result.timedOut) {
      context.stdout(
        `✗ ${result.name} [timed out after ${result.timeoutSeconds}s]`
      )
    } else {
      const timing =
        result.durationMs >= 1000
          ? ` [${(result.durationMs / 1000).toFixed(1)}s]`
          : ''
      if (result.exitCode === 0) {
        context.stdout(`✓ ${result.name}${timing}`)
      } else {
        context.stdout(`✗ ${result.name}${timing}`)
      }
    }
  }

  // Display failed command outputs
  for (const result of failed) {
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

  // Display summary
  context.stdout('')
  const indicator = failed.length > 0 ? '✗' : '✓'
  context.stdout(
    `${indicator} ${passed.length}/${results.length} checks passed`
  )

  return failed.length > 0 ? 1 : 0
}

const PROGRESS_INTERVAL_MS = 1000

export async function check(
  dependencies: CommandDependencies,
  shellRunner: ShellRunner = defaultShellRunner,
  clock: Clock = Date.now,
  setInterval: typeof globalThis.setInterval = globalThis.setInterval,
  clearInterval: typeof globalThis.clearInterval = globalThis.clearInterval
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

  const writeInline = context.stdoutInline ?? context.stdout

  // Emit initial progress dot and set up interval
  writeInline('.')
  const progressInterval = setInterval(() => {
    writeInline('.')
  }, PROGRESS_INTERVAL_MS)

  let results: CheckResult[]

  try {
    if (serial) {
      // Run checks sequentially: built-in first, then configured checks
      results = []

      if (hasDustDir) {
        results.push(
          await runValidationCheck(dependencies, context.emitEvent, clock)
        )
      }

      const configuredResults = await runConfiguredChecksSerially(
        settings.checks,
        context.cwd,
        shellRunner,
        context.emitEvent,
        clock
      )
      results.push(...configuredResults)
    } else {
      // Run built-in and configured checks in parallel (default behavior)
      const checkPromises: Promise<CheckResult | CheckResult[]>[] = []

      // Add validation check if .dust directory exists
      if (hasDustDir) {
        checkPromises.push(
          runValidationCheck(dependencies, context.emitEvent, clock)
        )
      }

      // Add configured checks
      checkPromises.push(
        runConfiguredChecks(
          settings.checks,
          context.cwd,
          shellRunner,
          context.emitEvent,
          clock
        )
      )

      const promiseResults = await Promise.all(checkPromises)

      // Flatten results, maintaining order: built-in checks first, then configured checks
      results = []
      for (const result of promiseResults) {
        if (Array.isArray(result)) {
          results.push(...result)
        } else {
          results.push(result)
        }
      }
    }
  } finally {
    clearInterval(progressInterval)
  }

  // Emit newline before results
  context.stdout('')

  const exitCode = displayResults(results, context)
  return { exitCode }
}
