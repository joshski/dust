/**
 * dust check - Execute project-defined quality gate checks
 *
 * Runs `dust lint markdown` and executes checks from settings.json
 * in parallel with buffered output.
 */

import { defaultShellRunner, type ShellRunner } from '../process-runner'
import type {
  CheckConfig,
  CommandContext,
  CommandDependencies,
  CommandResult,
} from '../types'
import { lintMarkdown } from './lint-markdown'

export interface CheckResult {
  name: string
  command: string
  exitCode: number
  output: string
  isBuiltIn?: boolean
  hints?: string[]
  durationMs?: number
}

async function runConfiguredChecks(
  checks: CheckConfig[],
  cwd: string,
  runner: ShellRunner
): Promise<CheckResult[]> {
  const promises = checks.map(async check => {
    const startTime = Date.now()
    const { exitCode, output } = await runner.run(check.command, cwd)
    const durationMs = Date.now() - startTime
    return {
      name: check.name,
      command: check.command,
      exitCode,
      output,
      hints: check.hints,
      durationMs,
    }
  })
  return Promise.all(promises)
}

async function runValidationCheck(
  dependencies: CommandDependencies
): Promise<CheckResult> {
  const outputLines: string[] = []
  const bufferedContext: CommandContext = {
    cwd: dependencies.context.cwd,
    stdout: (msg: string) => outputLines.push(msg),
    stderr: (msg: string) => outputLines.push(msg),
  }

  const startTime = Date.now()
  const result = await lintMarkdown({
    ...dependencies,
    context: bufferedContext,
    arguments: [],
  })
  const durationMs = Date.now() - startTime

  return {
    name: 'lint markdown',
    command: 'dust lint markdown',
    exitCode: result.exitCode,
    output: outputLines.join('\n'),
    isBuiltIn: true,
    durationMs,
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
    const timing =
      result.durationMs !== undefined && result.durationMs >= 1000
        ? ` [${(result.durationMs / 1000).toFixed(1)}s]`
        : ''
    if (result.exitCode === 0) {
      context.stdout(`✓ ${result.name}${timing}`)
    } else {
      context.stdout(`✗ ${result.name}${timing}`)
    }
  }

  // Display failed command outputs
  for (const result of failed) {
    context.stdout('')
    context.stdout(`> ${result.command}`)
    if (result.output.trim()) {
      context.stdout(result.output.trimEnd())
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

export async function check(
  dependencies: CommandDependencies,
  shellRunner: ShellRunner = defaultShellRunner
): Promise<CommandResult> {
  const { context, fileSystem, settings } = dependencies

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

  // Run built-in and configured checks in parallel
  const checkPromises: Promise<CheckResult | CheckResult[]>[] = []

  // Add validation check if .dust directory exists
  const dustPath = `${context.cwd}/.dust`
  if (fileSystem.exists(dustPath)) {
    checkPromises.push(runValidationCheck(dependencies))
  }

  // Add configured checks
  checkPromises.push(
    runConfiguredChecks(settings.checks, context.cwd, shellRunner)
  )

  const promiseResults = await Promise.all(checkPromises)

  // Flatten results, maintaining order: built-in checks first, then configured checks
  const results: CheckResult[] = []
  for (const result of promiseResults) {
    if (Array.isArray(result)) {
      results.push(...result)
    } else {
      results.push(result)
    }
  }

  const exitCode = displayResults(results, context)
  return { exitCode }
}
