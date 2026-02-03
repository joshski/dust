/**
 * dust loop claude - Continuous Claude iteration on available tasks
 *
 * Runs Claude Code in a loop to work on tasks continuously:
 * 1. Sync with remote (git pull)
 * 2. Check for available tasks via `dust next`
 * 3. If no tasks, sleep and retry
 * 4. If tasks available, invoke Claude Code
 * 5. Repeat until max iterations reached (default: 10)
 *
 * Usage: dust loop claude [max-iterations]
 * - max-iterations: Maximum number of task iterations (default: 10)
 * - Sleep iterations (when no tasks) don't count toward max
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
const DEFAULT_MAX_ITERATIONS = 10

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
  dependencies: CommandDependencies
): Promise<boolean> {
  let hasOutput = false
  const captureContext = {
    ...dependencies.context,
    stdout: () => {
      hasOutput = true
    },
  }
  await next({ ...dependencies, context: captureContext })
  return hasOutput
}

export type IterationResult =
  | 'no_tasks'
  | 'ran_claude'
  | 'claude_error'
  | 'resolved_pull_conflict'

export async function runOneIteration(
  dependencies: CommandDependencies,
  loopDependencies: LoopDependencies
): Promise<IterationResult> {
  const { context } = dependencies
  const { spawn, run } = loopDependencies

  // Step 1: Sync with remote
  context.stdout('🔄 Syncing with remote...')
  const pullResult = await gitPull(context.cwd, spawn)
  if (!pullResult.success) {
    context.stdout(`⚠️  git pull failed: ${pullResult.message}`)
    context.stdout('')
    context.stdout('🤖 Starting Claude to resolve the conflict...')
    context.stdout('')

    const prompt = `git pull failed with the following error:

${pullResult.message}

Please resolve this issue. Common approaches:
1. If there are merge conflicts, resolve them
2. If local commits need to be rebased, use git rebase
3. After resolving, commit any changes and push to remote

Make sure the repository is in a clean state and synced with remote before finishing.`

    try {
      await run(prompt, { cwd: context.cwd, dangerouslySkipPermissions: true })
      context.stdout('')
      context.stdout(
        '✅ Claude resolved the git pull conflict. Continuing loop...'
      )
      context.stdout('')
      return 'resolved_pull_conflict'
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      context.stderr(`Claude failed to resolve git pull conflict: ${message}`)
      context.stdout('')
      context.stdout('⚠️  Continuing loop despite unresolved conflict...')
      context.stdout('')
    }
  }

  // Step 2: Check for available tasks
  context.stdout('🔍 Checking for available tasks...')
  const hasTasks = await hasAvailableTasks(dependencies)

  if (!hasTasks) {
    context.stdout('💤 No tasks available. Sleeping...')
    context.stdout('')
    return 'no_tasks'
  }

  // Step 3: Invoke Claude Code
  context.stdout('✨ Found a task!')
  context.stdout('')
  context.stdout('🤖 Starting Claude...')
  context.stdout('')

  try {
    await run('go', { cwd: context.cwd, dangerouslySkipPermissions: true })
    context.stdout('')
    context.stdout('✅ Claude session complete. Continuing loop...')
    context.stdout('')
    return 'ran_claude'
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    context.stderr(`Claude exited with error: ${message}`)
    context.stdout('')
    context.stdout('✅ Claude session complete. Continuing loop...')
    context.stdout('')
    return 'claude_error'
  }
}

export function parseMaxIterations(commandArguments: string[]): number {
  if (commandArguments.length === 0) {
    return DEFAULT_MAX_ITERATIONS
  }
  const parsed = Number.parseInt(commandArguments[0], 10)
  if (Number.isNaN(parsed) || parsed <= 0) {
    return DEFAULT_MAX_ITERATIONS
  }
  return parsed
}

export async function loopClaude(
  dependencies: CommandDependencies,
  loopDependencies: LoopDependencies = createDefaultDependencies()
): Promise<CommandResult> {
  const { context } = dependencies
  const maxIterations = parseMaxIterations(dependencies.arguments)

  context.stdout(
    '⚠️  WARNING: This command skips all permission checks. Only use in a sandbox environment!'
  )
  context.stdout('')
  context.stdout(
    `🔄 Starting dust loop claude (max ${maxIterations} iterations)...`
  )
  context.stdout('   Press Ctrl+C to stop')
  context.stdout('')

  let completedIterations = 0

  while (completedIterations < maxIterations) {
    const result = await runOneIteration(dependencies, loopDependencies)
    if (result === 'no_tasks') {
      await loopDependencies.sleep(SLEEP_INTERVAL_MS)
    } else {
      // Count iterations where Claude actually ran (ran_claude, claude_error, resolved_pull_conflict)
      completedIterations++
      context.stdout(
        `📋 Completed iteration ${completedIterations}/${maxIterations}`
      )
      context.stdout('')
    }
  }

  context.stdout(`🏁 Reached max iterations (${maxIterations}). Exiting.`)
  return { exitCode: 0 }
}
