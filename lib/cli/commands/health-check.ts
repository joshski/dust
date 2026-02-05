/**
 * Periodic health check - counts commits since last dust review
 *
 * Checks git history for when .dust/tasks/dust-review.md was last deleted.
 * If more than N commits have passed, outputs a prescriptive warning.
 */

import { type ChildProcess, spawn } from 'node:child_process'
import type { CommandContext, DustSettings, FileSystem } from '../types'

export interface HealthCheckGitRunner {
  commitsSinceLastDeletion: (
    cwd: string,
    filePath: string
  ) => Promise<number | null>
  hasGitDirectory: (cwd: string, fileSystem: FileSystem) => boolean
}

export type SpawnFn = (
  command: string,
  commandArguments: string[],
  options: { cwd: string }
) => ChildProcess

function runGitCommand(
  spawnFn: SpawnFn,
  gitArguments: string[],
  cwd: string
): Promise<{ exitCode: number; output: string }> {
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
      resolve({ exitCode: code ?? 1, output: chunks.join('') })
    })
    proc.on('error', error => {
      resolve({ exitCode: 1, output: error.message })
    })
  })
}

export function createHealthCheckGitRunner(
  spawnFn: SpawnFn
): HealthCheckGitRunner {
  return {
    commitsSinceLastDeletion: async (
      cwd: string,
      filePath: string
    ): Promise<number | null> => {
      // Find the last commit that deleted this file
      const lastDeleteResult = await runGitCommand(
        spawnFn,
        ['log', '--diff-filter=D', '--format=%H', '-1', '--', filePath],
        cwd
      )

      if (lastDeleteResult.exitCode !== 0 || !lastDeleteResult.output.trim()) {
        // File was never deleted — count all commits
        const totalResult = await runGitCommand(
          spawnFn,
          ['rev-list', '--count', 'HEAD'],
          cwd
        )
        if (totalResult.exitCode !== 0) return null
        return Number.parseInt(totalResult.output.trim(), 10) || 0
      }

      const lastDeleteHash = lastDeleteResult.output.trim()
      const countResult = await runGitCommand(
        spawnFn,
        ['rev-list', '--count', `${lastDeleteHash}..HEAD`],
        cwd
      )
      if (countResult.exitCode !== 0) return null
      return Number.parseInt(countResult.output.trim(), 10) || 0
    },
    hasGitDirectory: (cwd: string, fileSystem: FileSystem): boolean => {
      return fileSystem.exists(`${cwd}/.git`)
    },
  }
}

export const defaultHealthCheckGitRunner: HealthCheckGitRunner =
  createHealthCheckGitRunner(spawn)

const REVIEW_TASK_PATH = '.dust/tasks/dust-review.md'
const DEFAULT_HEALTH_CHECK_THRESHOLD = 50

/**
 * Runs the periodic health check and outputs a warning if maintenance is due.
 * Returns true if a warning was emitted.
 */
export async function runHealthCheck(
  context: CommandContext,
  fileSystem: FileSystem,
  settings: DustSettings,
  gitRunner: HealthCheckGitRunner = defaultHealthCheckGitRunner
): Promise<boolean> {
  if (!gitRunner.hasGitDirectory(context.cwd, fileSystem)) {
    return false
  }

  if (!fileSystem.exists(`${context.cwd}/.dust`)) {
    return false
  }

  const threshold =
    settings.healthCheckThreshold ?? DEFAULT_HEALTH_CHECK_THRESHOLD

  const commitsSince = await gitRunner.commitsSinceLastDeletion(
    context.cwd,
    REVIEW_TASK_PATH
  )

  if (commitsSince === null || commitsSince < threshold) {
    return false
  }

  context.stderr('')
  context.stderr(
    `⚠️  ${commitsSince} commits since last dust review (threshold: ${threshold}).`
  )
  context.stderr('')
  context.stderr(
    'Action required: Instead of picking up a new task, create .dust/tasks/dust-review.md with:'
  )
  context.stderr('')
  context.stderr('  # Dust Review')
  context.stderr('  ')
  context.stderr('  Review and maintain dust planning artifacts.')
  context.stderr('  ')
  context.stderr('  ## Goals')
  context.stderr('  ')
  context.stderr('  - [Repository Hygiene](../goals/repository-hygiene.md)')
  context.stderr('  ')
  context.stderr('  ## Blocked By')
  context.stderr('  ')
  context.stderr('  (none)')
  context.stderr('  ')
  context.stderr('  ## Definition of Done')
  context.stderr('  ')
  context.stderr('  - [ ] Run `dust lint markdown` and fix any issues')
  context.stderr(
    '  - [ ] Review ideas in `.dust/ideas/` - promote, refine, or delete stale ones'
  )
  context.stderr(
    '  - [ ] Verify facts in `.dust/facts/` still reflect the codebase'
  )
  context.stderr('  - [ ] Check goals in `.dust/goals/` are still relevant')
  context.stderr('')

  return true
}
