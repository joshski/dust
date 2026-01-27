/**
 * dust check - Execute project-defined quality gate checks
 *
 * Runs `dust validate` automatically, then executes checks from settings.json
 * in parallel with buffered output.
 */

import { type ChildProcess, spawn } from 'node:child_process'
import { type CheckConfig, loadSettings } from './settings'
import type { CommandContext, CommandResult, FileSystem } from './types'
import { type GlobScanner, validate } from './validate'

export interface CheckResult {
  name: string
  command: string
  exitCode: number
  output: string
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

async function runChecks(
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
    }
  })
  return Promise.all(promises)
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
  }

  // Display summary
  ctx.stdout('')
  ctx.stdout(`${passed.length}/${results.length} checks passed`)

  return failed.length > 0 ? 1 : 0
}

export async function check(
  ctx: CommandContext,
  fs: FileSystem,
  _args: string[],
  glob?: GlobScanner,
  bufferedRunner: BufferedProcessRunner = defaultBufferedRunner
): Promise<CommandResult> {
  // Run validation first if glob scanner is provided
  if (glob) {
    const validationResult = await validate(ctx, fs, [], glob)
    if (validationResult.exitCode !== 0) {
      return validationResult
    }
    ctx.stdout('') // Add spacing after validation output
  }

  // Load settings to check for configured checks
  const settings = await loadSettings(ctx.cwd, fs)

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

  // Run configured checks in parallel
  const results = await runChecks(settings.checks, ctx.cwd, bufferedRunner)
  const exitCode = displayResults(results, ctx)
  return { exitCode }
}
