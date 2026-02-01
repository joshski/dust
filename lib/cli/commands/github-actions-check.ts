/**
 * dust github actions check - Execute quality checks with periodic health check task creation
 *
 * Runs all checks from `dust check` and, when running on the default branch in GitHub Actions,
 * creates a periodic health check task after 20+ commits since the task was last deleted.
 */

import { type ChildProcess, spawn } from 'node:child_process'
import { loadTemplate } from '../templates'
import type { CommandDependencies, CommandResult } from '../types'
import {
  type BufferedProcessRunner,
  check,
  defaultBufferedRunner,
} from './check'

export type GitSpawnFn = (
  command: string,
  gitArguments: string[],
  options: { cwd: string }
) => ChildProcess

const HEALTH_CHECK_TASK_PATH = '.dust/tasks/periodic-health-check.md'

export interface GitRunner {
  run: (
    gitArguments: string[],
    cwd: string
  ) => Promise<{ exitCode: number; output: string }>
}

export function createGitRunner(spawnFn: GitSpawnFn = spawn): GitRunner {
  return {
    run: (gitArguments, cwd) => {
      return new Promise(resolve => {
        const proc = spawnFn('git', gitArguments, { cwd })
        const chunks: string[] = []

        proc.stdout?.on('data', (data: Buffer) => {
          chunks.push(data.toString())
        })
        proc.stderr?.on('data', (data: Buffer) => {
          chunks.push(data.toString())
        })

        proc.on('close', code => {
          resolve({ exitCode: code ?? 1, output: chunks.join('').trim() })
        })
        proc.on('error', error => {
          resolve({ exitCode: 1, output: error.message })
        })
      })
    },
  }
}

export const defaultGitRunner: GitRunner = createGitRunner()

export interface GitHubActionsEnvironment {
  refName: string | undefined
  eventName: string | undefined
}

export function getGitHubActionsEnvironment(): GitHubActionsEnvironment {
  return {
    refName: process.env.GITHUB_REF_NAME,
    eventName: process.env.GITHUB_EVENT_NAME,
  }
}

async function getCommitsSinceLastDeletion(
  cwd: string,
  gitRunner: GitRunner
): Promise<number> {
  // Find the commit where the file was last deleted
  const lastDeleteResult = await gitRunner.run(
    [
      'log',
      '--diff-filter=D',
      '--format=%H',
      '-1',
      '--',
      HEALTH_CHECK_TASK_PATH,
    ],
    cwd
  )

  const lastDeleteCommit = lastDeleteResult.output.trim()

  if (!lastDeleteCommit) {
    // Never deleted, count all commits
    const allCommitsResult = await gitRunner.run(
      ['rev-list', '--count', 'HEAD'],
      cwd
    )
    return Number.parseInt(allCommitsResult.output.trim(), 10) || 0
  }

  // Count commits since that deletion
  const commitsSinceResult = await gitRunner.run(
    ['rev-list', '--count', `${lastDeleteCommit}..HEAD`],
    cwd
  )
  return Number.parseInt(commitsSinceResult.output.trim(), 10) || 0
}

async function createAndPushHealthCheckTask(
  cwd: string,
  gitRunner: GitRunner,
  fileSystem: { writeFile: (path: string, content: string) => Promise<void> },
  context: { stdout: (msg: string) => void }
): Promise<void> {
  const fullPath = `${cwd}/${HEALTH_CHECK_TASK_PATH}`

  // Write the file
  const content = loadTemplate('periodic-health-check')
  await fileSystem.writeFile(fullPath, content)

  // Stage the file
  const addResult = await gitRunner.run(['add', HEALTH_CHECK_TASK_PATH], cwd)
  if (addResult.exitCode !== 0) {
    context.stdout(
      `Warning: Failed to stage health check task: ${addResult.output}`
    )
    return
  }

  // Commit
  const commitResult = await gitRunner.run(
    ['commit', '-m', 'Add task: Periodic Health Check'],
    cwd
  )
  if (commitResult.exitCode !== 0) {
    context.stdout(
      `Warning: Failed to commit health check task: ${commitResult.output}`
    )
    return
  }

  // Push
  const pushResult = await gitRunner.run(['push'], cwd)
  if (pushResult.exitCode !== 0) {
    context.stdout(
      `Warning: Failed to push health check task: ${pushResult.output}`
    )
    return
  }

  context.stdout('')
  context.stdout('Created periodic health check task')
}

export async function githubActionsCheck(
  dependencies: CommandDependencies,
  bufferedRunner: BufferedProcessRunner = defaultBufferedRunner,
  gitRunner: GitRunner = defaultGitRunner,
  getEnv: () => GitHubActionsEnvironment = getGitHubActionsEnvironment
): Promise<CommandResult> {
  const { context, fileSystem } = dependencies

  // Run all standard checks first
  const checkResult = await check(dependencies, bufferedRunner)

  // If checks failed, don't proceed with health check task creation
  if (checkResult.exitCode !== 0) {
    return checkResult
  }

  // Check if we're in GitHub Actions on the default branch
  const env = getEnv()

  // Not in GitHub Actions or not a push event
  if (!env.refName || env.eventName !== 'push') {
    return checkResult
  }

  // Only run on main branch (the default branch for most repos)
  if (env.refName !== 'main') {
    return checkResult
  }

  // Check if the task file already exists
  const taskPath = `${context.cwd}/${HEALTH_CHECK_TASK_PATH}`
  if (fileSystem.exists(taskPath)) {
    return checkResult
  }

  // Count commits since the task was last deleted
  try {
    const commitsSince = await getCommitsSinceLastDeletion(
      context.cwd,
      gitRunner
    )

    if (commitsSince >= 20) {
      await createAndPushHealthCheckTask(
        context.cwd,
        gitRunner,
        fileSystem,
        context
      )
    }
  } catch (error) {
    // Log warning but don't fail the overall check
    const errorMessage = error instanceof Error ? error.message : String(error)
    context.stdout(`Warning: Could not check commit history: ${errorMessage}`)
  }

  return checkResult
}
