/**
 * dust check - Execute project-defined quality gate checks
 *
 * Runs `dust lint markdown` and executes checks from settings.json
 * in parallel with buffered output.
 */

import { type ChildProcess, spawn } from 'node:child_process'
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

export interface BufferedProcessRunner {
  run: (
    command: string,
    cwd: string
  ) => Promise<{ exitCode: number; output: string }>
}

export type SpawnFn = (
  command: string,
  commandArguments: string[],
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
        proc.on('error', error => {
          resolve({ exitCode: 1, output: error.message })
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

/**
 * Warning about an unsafe shell pattern in a check command
 */
export interface ShellPatternWarning {
  checkName: string
  command: string
  pattern: string
  suggestion: string
}

/**
 * Detects check commands containing shell patterns that silently fail under /bin/sh.
 * Unquoted globstar (**) and brace expansion ({a,b}) don't work in POSIX sh.
 */
export function detectUnsafeShellPatterns(
  checks: CheckConfig[]
): ShellPatternWarning[] {
  const warnings: ShellPatternWarning[] = []

  for (const check of checks) {
    // Detect unquoted ** (globstar) - not inside quotes
    // We check for ** that isn't wrapped in quotes
    if (hasUnquotedPattern(check.command, '**')) {
      warnings.push({
        checkName: check.name,
        command: check.command,
        pattern: '**',
        suggestion:
          'Globstar (**) is not supported in /bin/sh. Quote the glob (e.g., "lib/**/*.ts") so the tool expands it, or use a config file.',
      })
    }

    // Detect unquoted brace expansion {a,b}
    if (hasUnquotedBraceExpansion(check.command)) {
      warnings.push({
        checkName: check.name,
        command: check.command,
        pattern: '{,}',
        suggestion:
          "Brace expansion ({a,b}) is not a POSIX feature and won't work in /bin/sh. Use separate arguments or a config file instead.",
      })
    }
  }

  return warnings
}

/**
 * Checks if a command contains a pattern outside of quoted strings.
 */
function hasUnquotedPattern(command: string, pattern: string): boolean {
  let inSingleQuote = false
  let inDoubleQuote = false

  for (let i = 0; i < command.length; i++) {
    const char = command[i]

    if (char === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote
      continue
    }
    if (char === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote
      continue
    }

    if (!inSingleQuote && !inDoubleQuote) {
      if (command.substring(i, i + pattern.length) === pattern) {
        return true
      }
    }
  }

  return false
}

/**
 * Checks if a command contains unquoted brace expansion like {ts,js}.
 */
function hasUnquotedBraceExpansion(command: string): boolean {
  let inSingleQuote = false
  let inDoubleQuote = false
  let braceDepth = 0
  let hasCommaInBrace = false

  for (let i = 0; i < command.length; i++) {
    const char = command[i]

    if (char === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote
      continue
    }
    if (char === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote
      continue
    }

    if (!inSingleQuote && !inDoubleQuote) {
      if (char === '{') {
        braceDepth++
        hasCommaInBrace = false
      } else if (char === '}' && braceDepth > 0) {
        if (hasCommaInBrace) {
          return true
        }
        braceDepth--
      } else if (char === ',' && braceDepth > 0) {
        hasCommaInBrace = true
      }
    }
  }

  return false
}

export async function check(
  dependencies: CommandDependencies,
  bufferedRunner: BufferedProcessRunner = defaultBufferedRunner
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

  // Warn about unsafe shell patterns in check commands
  const shellWarnings = detectUnsafeShellPatterns(settings.checks)
  for (const warning of shellWarnings) {
    context.stderr(
      `⚠️  Check '${warning.checkName}' contains unsafe shell pattern: ${warning.pattern}`
    )
    context.stderr(`  ${warning.suggestion}`)
    context.stderr('')
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
    runConfiguredChecks(settings.checks, context.cwd, bufferedRunner)
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
