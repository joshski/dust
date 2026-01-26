/**
 * dust check - Execute project-defined quality gate hook
 *
 * Runs `dust validate` automatically, then looks for an executable
 * hook at .dust/hooks/check and runs it. Forwards the exit code from the hook.
 */

import { type ChildProcess, spawn } from 'node:child_process'
import type { CommandContext, CommandResult, FileSystem } from './types'
import { type GlobScanner, validate } from './validate'

export interface ProcessRunner {
  spawn: (
    command: string,
    args: string[],
    options: { cwd: string; stdio: 'inherit' }
  ) => Promise<number>
}

export type SpawnFn = (
  command: string,
  args: string[],
  options: { cwd: string; stdio: 'inherit' }
) => ChildProcess

export function createProcessRunner(spawnFn: SpawnFn): ProcessRunner {
  return {
    spawn: (command, args, options) => {
      return new Promise(resolve => {
        const proc = spawnFn(command, args, options)
        proc.on('close', code => resolve(code ?? 1))
        proc.on('error', () => resolve(1))
      })
    },
  }
}

export const defaultProcessRunner: ProcessRunner = createProcessRunner(spawn)

export async function check(
  ctx: CommandContext,
  fs: FileSystem,
  _args: string[],
  runner: ProcessRunner = defaultProcessRunner,
  glob?: GlobScanner
): Promise<CommandResult> {
  // Run validation first if glob scanner is provided
  if (glob) {
    const validationResult = await validate(ctx, fs, [], glob)
    if (validationResult.exitCode !== 0) {
      return validationResult
    }
    ctx.stdout('') // Add spacing after validation output
  }

  const hookPath = `${ctx.cwd}/.dust/hooks/check`

  if (!fs.exists(hookPath)) {
    ctx.stderr('Error: No check hook found at .dust/hooks/check')
    ctx.stderr('')
    ctx.stderr('To create a check hook:')
    ctx.stderr('  1. Create the hooks directory: mkdir -p .dust/hooks')
    ctx.stderr('  2. Create the check script: touch .dust/hooks/check')
    ctx.stderr('  3. Make it executable: chmod +x .dust/hooks/check')
    ctx.stderr('  4. Add your quality checks (tests, linting, etc.)')
    return { exitCode: 1 }
  }

  const exitCode = await runner.spawn(hookPath, [], {
    cwd: ctx.cwd,
    stdio: 'inherit',
  })

  return { exitCode }
}
