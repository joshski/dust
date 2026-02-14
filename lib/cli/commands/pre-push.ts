/**
 * dust pre-push - Pre-push hook handler
 *
 * Runs `dust check` for pre-push hooks.
 * Detects when an agent attempts to push a branch containing only a new task file
 * (with optional idea deletions) and reminds them to implement the task.
 */

import { detectAgent } from '../../agents/detection'
import { defaultGitRunner, type GitRunner } from '../process-runner'
import type { CommandDependencies, CommandResult } from '../types'
import { check } from './check'

/**
 * Represents a file change in a commit
 */
export interface FileChange {
  status: 'A' | 'M' | 'D' | 'R' | 'C' | 'T' | 'U' | 'X'
  path: string
}

/**
 * Parses the output of `git diff --name-status` into FileChange objects
 */
export function parseGitDiffNameStatus(output: string): FileChange[] {
  const changes: FileChange[] = []
  const lines = output.trim().split('\n').filter(Boolean)

  for (const line of lines) {
    // Format is: STATUS\tPATH (tab-separated)
    // For renames/copies: STATUS\tOLD_PATH\tNEW_PATH
    const parts = line.split('\t')
    if (parts.length >= 2) {
      const statusChar = parts[0].charAt(0) as FileChange['status']
      // For renames (R), use the new path (second path)
      const path = parts.length > 2 ? parts[2] : parts[1]
      changes.push({ status: statusChar, path })
    }
  }

  return changes
}

/**
 * Result of analyzing commit changes for task-only pattern
 */
export interface TaskOnlyAnalysis {
  isTaskOnly: boolean
  taskFiles: string[]
  ideaDeletions: string[]
  otherChanges: FileChange[]
}

/**
 * Analyzes file changes to determine if they match the "task-only" pattern:
 * - Only files in .dust/tasks/ are being added
 * - Only files in .dust/ideas/ are being deleted (optional)
 * - No other files are being changed
 */
export function analyzeChangesForTaskOnlyPattern(
  changes: FileChange[]
): TaskOnlyAnalysis {
  const taskFiles: string[] = []
  const ideaDeletions: string[] = []
  const otherChanges: FileChange[] = []

  for (const change of changes) {
    const isTaskAddition =
      change.status === 'A' && change.path.startsWith('.dust/tasks/')
    const isIdeaDeletion =
      change.status === 'D' && change.path.startsWith('.dust/ideas/')

    if (isTaskAddition) {
      taskFiles.push(change.path)
    } else if (isIdeaDeletion) {
      ideaDeletions.push(change.path)
    } else {
      otherChanges.push(change)
    }
  }

  // It's a task-only commit if:
  // 1. There's at least one task file being added
  // 2. There are no other changes (only task additions and optional idea deletions)
  const isTaskOnly = taskFiles.length > 0 && otherChanges.length === 0

  return {
    isTaskOnly,
    taskFiles,
    ideaDeletions,
    otherChanges,
  }
}

/**
 * Gets the list of file changes for commits that are not on any remote branch.
 * This avoids hardcoding specific branch names like origin/main or origin/master.
 */
async function getChangesFromRemote(
  cwd: string,
  gitRunner: GitRunner
): Promise<FileChange[]> {
  // Find commits that are not reachable from any remote branch
  const unpushedResult = await gitRunner.run(
    ['rev-list', 'HEAD', '--not', '--remotes'],
    cwd
  )

  if (unpushedResult.exitCode !== 0 || !unpushedResult.output.trim()) {
    // No unpushed commits, return empty changes
    return []
  }

  // Get the oldest unpushed commit (last line of rev-list output)
  const unpushedCommits = unpushedResult.output.trim().split('\n')
  const oldestUnpushed = unpushedCommits[unpushedCommits.length - 1]

  // Get the diff from the parent of the oldest unpushed commit to HEAD
  const diffResult = await gitRunner.run(
    ['diff', '--name-status', `${oldestUnpushed}^..HEAD`],
    cwd
  )

  if (diffResult.exitCode !== 0) {
    // If the oldest commit has no parent (initial commit), diff against empty tree
    const emptyTreeDiff = await gitRunner.run(
      [
        'diff',
        '--name-status',
        '4b825dc642cb6eb9a060e54bf8d69288fbee4904',
        'HEAD',
      ],
      cwd
    )
    if (emptyTreeDiff.exitCode !== 0) {
      return []
    }
    return parseGitDiffNameStatus(emptyTreeDiff.output)
  }

  return parseGitDiffNameStatus(diffResult.output)
}

/**
 * Gets the list of uncommitted files (staged and unstaged changes, plus untracked files)
 */
async function getUncommittedFiles(
  cwd: string,
  gitRunner: GitRunner
): Promise<string[]> {
  const result = await gitRunner.run(['status', '--porcelain'], cwd)
  if (result.exitCode !== 0 || !result.output.trim()) {
    return []
  }

  const files: string[] = []
  // Split by newlines but preserve leading spaces (don't use trim() on the whole output)
  const lines = result.output.split('\n').filter(line => line.length > 0)
  for (const line of lines) {
    // git status --porcelain format: XY PATH
    // where X is index status, Y is worktree status (2 chars total)
    // followed by a space, then the file path
    // For renames/copies: XY ORIG -> DEST (we take the destination)
    if (line.length > 3) {
      const path = line.substring(3)
      // Handle renames: "XY old -> new" - take the new path
      const arrowIndex = path.indexOf(' -> ')
      if (arrowIndex !== -1) {
        files.push(path.substring(arrowIndex + 4))
      } else {
        files.push(path)
      }
    }
  }
  return files
}

export async function prePush(
  dependencies: CommandDependencies,
  gitRunner: GitRunner = defaultGitRunner,
  env: NodeJS.ProcessEnv = process.env
): Promise<CommandResult> {
  const { context } = dependencies
  const agent = detectAgent(env)

  // Skip all checks for human pushes (no known agent detected)
  if (agent.type === 'unknown') {
    return { exitCode: 0 }
  }

  // Block push when running unattended with uncommitted changes
  if (env.DUST_UNATTENDED) {
    const uncommittedFiles = await getUncommittedFiles(context.cwd, gitRunner)
    if (uncommittedFiles.length > 0) {
      context.stderr('')
      context.stderr(
        '⚠️  Push blocked: uncommitted changes detected in unattended mode.'
      )
      context.stderr('')
      context.stderr(
        'You are running in unattended mode (DUST_UNATTENDED=1) and have uncommitted files:'
      )
      for (const file of uncommittedFiles) {
        context.stderr(`  → ${file}`)
      }
      context.stderr('')
      context.stderr(
        'Commit or discard these changes before pushing to avoid broken builds.'
      )
      context.stderr('')
      return { exitCode: 1 }
    }
  }

  // Analyze the changes being pushed
  const changes = await getChangesFromRemote(context.cwd, gitRunner)

  if (changes.length > 0) {
    const analysis = analyzeChangesForTaskOnlyPattern(changes)

    if (analysis.isTaskOnly && agent.type === 'claude-code-web') {
      context.stderr('')
      context.stderr(
        '⚠️  Task-only commit detected! You added a task but did not implement it.'
      )
      context.stderr('')
      context.stderr('New task files:')
      for (const taskFile of analysis.taskFiles) {
        context.stderr(`  → ${taskFile}`)
      }
      if (analysis.ideaDeletions.length > 0) {
        context.stderr('')
        context.stderr('Deleted idea files:')
        for (const ideaFile of analysis.ideaDeletions) {
          context.stderr(`  → ${ideaFile}`)
        }
      }
      context.stderr('')
      context.stderr(
        'Start a new sub-agent to implement the task: `bin/dust next`'
      )
      context.stderr('')
      return { exitCode: 1 }
    }
  }

  return check(dependencies)
}
