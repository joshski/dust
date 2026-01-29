/**
 * dust loop - Continuous Claude iteration on available tasks
 *
 * Runs Claude Code in a loop to work on tasks continuously:
 * 1. Sync with remote (git pull)
 * 2. Check for available tasks via `dust next`
 * 3. If no tasks, sleep and retry
 * 4. If tasks available, invoke Claude Code
 * 5. Repeat until interrupted
 */

import { spawn as nodeSpawn } from 'node:child_process'
import { run as claudeRun } from '../../claude/run'
import type { CommandDependencies, CommandResult } from '../types'
import { next } from './next'

export interface LoopDependencies {
  spawn: typeof nodeSpawn
  run: typeof claudeRun
  sleep: (ms: number) => Promise<void>
}

export function createDefaultDependencies(): LoopDependencies {
  return {
    spawn: nodeSpawn,
    run: claudeRun,
    sleep: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
  }
}

const SLEEP_INTERVAL_MS = 30000

export async function gitPull(
  cwd: string,
  spawn: typeof nodeSpawn
): Promise<{ success: boolean; message?: string }> {
  return new Promise(resolve => {
    const proc = spawn('git', ['pull'], {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    let stderr = ''
    proc.stderr?.on('data', data => {
      stderr += data.toString()
    })

    proc.on('close', code => {
      if (code === 0) {
        resolve({ success: true })
      } else {
        resolve({ success: false, message: stderr.trim() || 'git pull failed' })
      }
    })

    proc.on('error', error => {
      resolve({ success: false, message: error.message })
    })
  })
}

export async function hasAvailableTasks(
  deps: CommandDependencies
): Promise<boolean> {
  let hasOutput = false
  const captureCtx = {
    ...deps.context,
    stdout: () => {
      hasOutput = true
    },
  }
  await next({ ...deps, context: captureCtx })
  return hasOutput
}

export type IterationResult = 'no_tasks' | 'ran_claude' | 'claude_error'

export async function runOneIteration(
  deps: CommandDependencies,
  loopDeps: LoopDependencies
): Promise<IterationResult> {
  const { context: ctx } = deps
  const { spawn, run } = loopDeps

  // Step 1: Sync with remote
  ctx.stdout('Syncing with remote...')
  const pullResult = await gitPull(ctx.cwd, spawn)
  if (!pullResult.success) {
    ctx.stdout(`Note: git pull skipped (${pullResult.message})`)
  }

  // Step 2: Check for available tasks
  ctx.stdout('Checking for available tasks...')
  const hasTasks = await hasAvailableTasks(deps)

  if (!hasTasks) {
    ctx.stdout('No tasks available. Sleeping...')
    ctx.stdout('')
    return 'no_tasks'
  }

  // Step 3: Invoke Claude Code
  ctx.stdout('Found task(s). Starting Claude...')
  ctx.stdout('')

  try {
    await run('go', { cwd: ctx.cwd, dangerouslySkipPermissions: true })
    ctx.stdout('')
    ctx.stdout('Claude session complete. Continuing loop...')
    ctx.stdout('')
    return 'ran_claude'
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    ctx.stderr(`Claude exited with error: ${message}`)
    ctx.stdout('')
    ctx.stdout('Claude session complete. Continuing loop...')
    ctx.stdout('')
    return 'claude_error'
  }
}

export async function loop(
  deps: CommandDependencies,
  loopDeps: LoopDependencies = createDefaultDependencies()
): Promise<CommandResult> {
  const { context: ctx } = deps

  ctx.stdout(
    'WARNING: This command skips all permission checks. Only use in a sandbox environment!'
  )
  ctx.stdout('')
  ctx.stdout('Starting dust loop...')
  ctx.stdout('Press Ctrl+C to stop')
  ctx.stdout('')

  while (true) {
    const result = await runOneIteration(deps, loopDeps)
    if (result === 'no_tasks') {
      await loopDeps.sleep(SLEEP_INTERVAL_MS)
    }
  }
}
