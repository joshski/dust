/**
 * dust github actions check - Execute quality checks with periodic review task creation
 *
 * Runs all checks from `dust check` and, when running on the default branch in GitHub Actions,
 * creates periodic review tasks based on commit patterns. Each review type is triggered by
 * commits matching specific path patterns.
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

/**
 * Defines a periodic review type with its trigger conditions
 */
export interface ReviewType {
  /** Unique identifier for this review type */
  name: string
  /** Path where the task file is created */
  taskPath: string
  /** Template to use for the task content */
  templateName: string
  /** Git path pattern - commits touching these paths count toward threshold */
  commitPattern: string
  /** Number of matching commits before creating the task */
  threshold: number
  /** Commit message when creating the task */
  commitMessage: string
}

/**
 * Default review types - each monitors a different part of .dust/
 */
export const DEFAULT_REVIEW_TYPES: ReviewType[] = [
  {
    name: 'goals',
    taskPath: '.dust/tasks/review-goals.md',
    templateName: 'review-goals',
    commitPattern: '.dust/goals/',
    threshold: 20,
    commitMessage: 'Add task: Review Goals',
  },
  {
    name: 'ideas',
    taskPath: '.dust/tasks/review-ideas.md',
    templateName: 'review-ideas',
    commitPattern: '.dust/ideas/',
    threshold: 20,
    commitMessage: 'Add task: Review Ideas',
  },
  {
    name: 'facts',
    taskPath: '.dust/tasks/review-facts.md',
    templateName: 'review-facts',
    commitPattern: '.dust/facts/',
    threshold: 20,
    commitMessage: 'Add task: Review Facts',
  },
]

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

/**
 * Count commits matching a path pattern since a task was last deleted
 */
async function getMatchingCommitsSinceLastDeletion(
  cwd: string,
  gitRunner: GitRunner,
  taskPath: string,
  commitPattern: string
): Promise<number> {
  // Find the commit where the task file was last deleted
  const lastDeleteResult = await gitRunner.run(
    ['log', '--diff-filter=D', '--format=%H', '-1', '--', taskPath],
    cwd
  )

  const lastDeleteCommit = lastDeleteResult.output.trim()

  // Build the rev-list command to count commits matching the pattern
  const revListArgs = lastDeleteCommit
    ? ['rev-list', '--count', `${lastDeleteCommit}..HEAD`, '--', commitPattern]
    : ['rev-list', '--count', 'HEAD', '--', commitPattern]

  const commitCountResult = await gitRunner.run(revListArgs, cwd)
  return Number.parseInt(commitCountResult.output.trim(), 10) || 0
}

/**
 * Create and push a review task for the given review type
 */
async function createAndPushReviewTask(
  cwd: string,
  gitRunner: GitRunner,
  fileSystem: { writeFile: (path: string, content: string) => Promise<void> },
  context: { stdout: (msg: string) => void },
  reviewType: ReviewType
): Promise<boolean> {
  const fullPath = `${cwd}/${reviewType.taskPath}`

  // Write the file
  const content = loadTemplate(reviewType.templateName)
  await fileSystem.writeFile(fullPath, content)

  // Stage the file
  const addResult = await gitRunner.run(['add', reviewType.taskPath], cwd)
  if (addResult.exitCode !== 0) {
    context.stdout(
      `Warning: Failed to stage ${reviewType.name} review task: ${addResult.output}`
    )
    return false
  }

  // Commit
  const commitResult = await gitRunner.run(
    ['commit', '-m', reviewType.commitMessage],
    cwd
  )
  if (commitResult.exitCode !== 0) {
    context.stdout(
      `Warning: Failed to commit ${reviewType.name} review task: ${commitResult.output}`
    )
    return false
  }

  return true
}

export async function githubActionsCheck(
  dependencies: CommandDependencies,
  bufferedRunner: BufferedProcessRunner = defaultBufferedRunner,
  gitRunner: GitRunner = defaultGitRunner,
  getEnv: () => GitHubActionsEnvironment = getGitHubActionsEnvironment,
  reviewTypes: ReviewType[] = DEFAULT_REVIEW_TYPES
): Promise<CommandResult> {
  const { context, fileSystem } = dependencies

  // Run all standard checks first
  const checkResult = await check(dependencies, bufferedRunner)

  // If checks failed, don't proceed with review task creation
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

  // Track which tasks were created (for batching the push)
  const createdTasks: string[] = []

  // Check each review type
  for (const reviewType of reviewTypes) {
    const taskPath = `${context.cwd}/${reviewType.taskPath}`

    // Skip if task already exists
    if (fileSystem.exists(taskPath)) {
      continue
    }

    try {
      const matchingCommits = await getMatchingCommitsSinceLastDeletion(
        context.cwd,
        gitRunner,
        reviewType.taskPath,
        reviewType.commitPattern
      )

      if (matchingCommits >= reviewType.threshold) {
        const created = await createAndPushReviewTask(
          context.cwd,
          gitRunner,
          fileSystem,
          context,
          reviewType
        )
        if (created) {
          createdTasks.push(reviewType.name)
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      context.stdout(
        `Warning: Could not check ${reviewType.name} commit history: ${errorMessage}`
      )
    }
  }

  // Push all created tasks in one push
  if (createdTasks.length > 0) {
    const pushResult = await gitRunner.run(['push'], context.cwd)
    if (pushResult.exitCode !== 0) {
      context.stdout(
        `Warning: Failed to push review tasks: ${pushResult.output}`
      )
    } else {
      context.stdout('')
      context.stdout(`Created review tasks: ${createdTasks.join(', ')}`)
    }
  }

  return checkResult
}
