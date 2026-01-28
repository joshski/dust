/**
 * dust check - Execute project-defined quality gate checks
 *
 * Runs `dust validate` and executes checks from settings.json
 * in parallel with buffered output.
 */

import { type ChildProcess, spawn } from 'node:child_process'
import type {
  CheckConfig,
  CommandContext,
  CommandDependencies,
  CommandResult,
} from '../types'
import { validate } from './validate'

export interface CheckResult {
  name: string
  command: string
  exitCode: number
  output: string
  isBuiltIn?: boolean
  hints?: string[]
}

export interface BufferedProcessRunner {
  run: (
    command: string,
    cwd: string
  ) => Promise<{ exitCode: number; output: string }>
}

export type SpawnFn = (
  command: string,
  args: string[],
  options: { cwd: string; shell?: boolean }
) => ChildProcess

export function createBufferedRunner(spawnFn: SpawnFn): BufferedProcessRunner {
  return {
    run: (command, cwd) => {
      return new Promise(resolve => {
        const proc = spawnFn(command, [], { cwd, shell: true })
        const chunks: string[] = []

        proc.stdout?.on('data', (data: Buffer) => {
          chunks.push(data.toString())
        })
        proc.stderr?.on('data', (data: Buffer) => {
          chunks.push(data.toString())
        })

        proc.on('close', code => {
          resolve({ exitCode: code ?? 1, output: chunks.join('') })
        })
        proc.on('error', err => {
          resolve({ exitCode: 1, output: err.message })
        })
      })
    },
  }
}

export const defaultBufferedRunner: BufferedProcessRunner =
  createBufferedRunner(spawn)

async function runConfiguredChecks(
  checks: CheckConfig[],
  cwd: string,
  runner: BufferedProcessRunner
): Promise<CheckResult[]> {
  const promises = checks.map(async check => {
    const { exitCode, output } = await runner.run(check.command, cwd)
    return {
      name: check.name,
      command: check.command,
      exitCode,
      output,
      hints: check.hints,
    }
  })
  return Promise.all(promises)
}

async function runValidationCheck(
  deps: CommandDependencies
): Promise<CheckResult> {
  const outputLines: string[] = []
  const bufferedCtx: CommandContext = {
    cwd: deps.context.cwd,
    stdout: (msg: string) => outputLines.push(msg),
    stderr: (msg: string) => outputLines.push(msg),
  }

  const result = await validate({
    ...deps,
    context: bufferedCtx,
    arguments: [],
  })

  return {
    name: 'validate',
    command: 'dust validate',
    exitCode: result.exitCode,
    output: outputLines.join('\n'),
    isBuiltIn: true,
  }
}

function displayResults(results: CheckResult[], ctx: CommandContext): number {
  const passed = results.filter(r => r.exitCode === 0)
  const failed = results.filter(r => r.exitCode !== 0)

  // Display pass/fail status for each check
  for (const result of results) {
    if (result.exitCode === 0) {
      ctx.stdout(`✓ ${result.name}`)
    } else {
      ctx.stdout(`✗ ${result.name}`)
    }
  }

  // Display failed command outputs
  for (const result of failed) {
    ctx.stdout('')
    ctx.stdout(`> ${result.command}`)
    if (result.output.trim()) {
      ctx.stdout(result.output.trimEnd())
    }
    if (result.hints && result.hints.length > 0) {
      ctx.stdout('')
      ctx.stdout(`Hints for fixing '${result.name}':`)
      for (const hint of result.hints) {
        ctx.stdout(`  - ${hint}`)
      }
    }
  }

  // Display summary
  ctx.stdout('')
  ctx.stdout(`${passed.length}/${results.length} checks passed`)

  return failed.length > 0 ? 1 : 0
}

export async function check(
  deps: CommandDependencies,
  bufferedRunner: BufferedProcessRunner = defaultBufferedRunner
): Promise<CommandResult> {
  const { context: ctx, fileSystem: fs, settings } = deps

  if (!settings.checks || settings.checks.length === 0) {
    ctx.stderr('Error: No checks configured in .dust/config/settings.json')
    ctx.stderr('')
    ctx.stderr('Add checks to your settings.json:')
    ctx.stderr('  {')
    ctx.stderr('    "checks": [')
    ctx.stderr('      { "name": "lint", "command": "npm run lint" },')
    ctx.stderr('      { "name": "test", "command": "npm test" }')
    ctx.stderr('    ]')
    ctx.stderr('  }')
    return { exitCode: 1 }
  }

  // Run built-in and configured checks in parallel
  const checkPromises: Promise<CheckResult | CheckResult[]>[] = []

  // Add validation check if .dust directory exists
  const dustPath = `${ctx.cwd}/.dust`
  if (fs.exists(dustPath)) {
    checkPromises.push(runValidationCheck(deps))
  }

  // Add configured checks
  checkPromises.push(
    runConfiguredChecks(settings.checks, ctx.cwd, bufferedRunner)
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

  const exitCode = displayResults(results, ctx)
  return { exitCode }
}
