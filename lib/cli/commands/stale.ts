/**
 * dust stale - Flag ideas that haven't been modified in a configurable number of commits
 *
 * Uses git history to find ideas unchanged for N commits (default: 50).
 * Outputs prescriptive instructions for each stale idea.
 */

import { type ChildProcess, spawn } from 'node:child_process'
import { extractTitle } from '../../markdown/markdown-utilities'
import { getColors } from '../colors'
import type { CommandDependencies, CommandResult } from '../types'

export interface GitLogRunner {
  commitCount: (cwd: string) => Promise<number>
  lastCommitTouching: (cwd: string, filePath: string) => Promise<number | null>
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

export function createGitLogRunner(spawnFn: SpawnFn): GitLogRunner {
  return {
    commitCount: async (cwd: string) => {
      const result = await runGitCommand(
        spawnFn,
        ['rev-list', '--count', 'HEAD'],
        cwd
      )
      if (result.exitCode !== 0) return 0
      return Number.parseInt(result.output.trim(), 10) || 0
    },
    lastCommitTouching: async (cwd: string, filePath: string) => {
      // Get the number of commits since the last time this file was touched
      const lastTouchResult = await runGitCommand(
        spawnFn,
        ['log', '-1', '--format=%H', '--', filePath],
        cwd
      )
      if (lastTouchResult.exitCode !== 0 || !lastTouchResult.output.trim()) {
        return null
      }
      const lastTouchHash = lastTouchResult.output.trim()

      const countResult = await runGitCommand(
        spawnFn,
        ['rev-list', '--count', `${lastTouchHash}..HEAD`],
        cwd
      )
      if (countResult.exitCode !== 0) return null
      return Number.parseInt(countResult.output.trim(), 10) || 0
    },
  }
}

export const defaultGitLogRunner: GitLogRunner = createGitLogRunner(spawn)

const DEFAULT_THRESHOLD = 50

export async function stale(
  dependencies: CommandDependencies,
  gitLogRunner: GitLogRunner = defaultGitLogRunner
): Promise<CommandResult> {
  const { context, fileSystem, settings } = dependencies
  const dustPath = `${context.cwd}/.dust`
  const colors = getColors()

  if (!fileSystem.exists(dustPath)) {
    context.stderr('Error: .dust directory not found')
    context.stderr("Run 'dust init' to initialize a Dust repository")
    return { exitCode: 1 }
  }

  const ideasPath = `${dustPath}/ideas`

  if (!fileSystem.exists(ideasPath)) {
    context.stdout('No ideas directory found.')
    return { exitCode: 0 }
  }

  const files = await fileSystem.readdir(ideasPath)
  const mdFiles = files.filter(f => f.endsWith('.md')).sort()

  if (mdFiles.length === 0) {
    context.stdout('No ideas found.')
    return { exitCode: 0 }
  }

  const threshold = settings.staleThreshold ?? DEFAULT_THRESHOLD

  const staleIdeas: Array<{
    file: string
    title: string | null
    commitsSinceModified: number
  }> = []

  for (const file of mdFiles) {
    const filePath = `.dust/ideas/${file}`
    const commitsSince = await gitLogRunner.lastCommitTouching(
      context.cwd,
      filePath
    )

    if (commitsSince !== null && commitsSince >= threshold) {
      const fullPath = `${ideasPath}/${file}`
      const content = await fileSystem.readFile(fullPath)
      const title = extractTitle(content)
      staleIdeas.push({ file, title, commitsSinceModified: commitsSince })
    }
  }

  if (staleIdeas.length === 0) {
    context.stdout('No stale ideas found.')
    return { exitCode: 0 }
  }

  context.stdout(
    `${colors.bold}🕸️  ${staleIdeas.length} stale idea${staleIdeas.length === 1 ? '' : 's'} (unchanged for ${threshold}+ commits)${colors.reset}`
  )
  context.stdout('')

  for (const idea of staleIdeas) {
    const displayTitle = idea.title || idea.file.replace('.md', '')
    context.stdout(
      `${colors.bold}# ${displayTitle}${colors.reset} ${colors.dim}(${idea.commitsSinceModified} commits ago)${colors.reset}`
    )
    context.stdout(`${colors.cyan}→ .dust/ideas/${idea.file}${colors.reset}`)
    context.stdout('')
  }

  context.stdout(
    `${colors.dim}Review each idea: promote to a task, refine, or delete.${colors.reset}`
  )

  return { exitCode: 0 }
}
