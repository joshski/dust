/**
 * dust next - List tasks that are ready to work on
 *
 * Displays tasks from .dust/tasks/ that are not blocked by any incomplete tasks.
 * A task is blocked if its "## Blocked By" section references task files that still exist.
 */

import {
  extractOpeningSentence,
  extractTitle,
} from '../../markdown/markdown-utilities'
import { getColors } from '../colors'
import type {
  CommandContext,
  CommandDependencies,
  CommandResult,
  FileSystem,
} from '../types'
import { templateVariables } from './agent-shared'

function extractBlockedBy(content: string): string[] {
  // Find the "## Blocked By" section
  const blockedByMatch = content.match(
    /^## Blocked By\s*\n([\s\S]*?)(?=\n## |\n*$)/m
  )
  if (!blockedByMatch) {
    return []
  }

  const section = blockedByMatch[1].trim()

  // Check for "(none)" which means no blockers
  if (section === '(none)') {
    return []
  }

  // Extract markdown links: [text](file.md)
  const linkPattern = /\[.*?\]\(([^)]+\.md)\)/g
  const blockers: string[] = []
  let match: RegExpExecArray | null = linkPattern.exec(section)

  while (match !== null) {
    blockers.push(match[1])
    match = linkPattern.exec(section)
  }

  return blockers
}

export interface UnblockedTask {
  path: string
  title: string | null
  openingSentence: string | null
}

/**
 * Finds unblocked tasks in .dust/tasks/.
 * Returns null if .dust directory is missing, otherwise an array of unblocked tasks.
 */
export async function findUnblockedTasks(
  cwd: string,
  fileSystem: FileSystem
): Promise<{ error?: string; tasks: UnblockedTask[] }> {
  const dustPath = `${cwd}/.dust`

  if (!fileSystem.exists(dustPath)) {
    return { error: '.dust directory not found', tasks: [] }
  }

  const tasksPath = `${dustPath}/tasks`

  if (!fileSystem.exists(tasksPath)) {
    return { tasks: [] }
  }

  const files = await fileSystem.readdir(tasksPath)
  const mdFiles = files.filter(f => f.endsWith('.md')).sort()

  if (mdFiles.length === 0) {
    return { tasks: [] }
  }

  // Create a set of existing task files for quick lookup
  const existingTasks = new Set(mdFiles)

  const tasks: UnblockedTask[] = []

  for (const file of mdFiles) {
    const filePath = `${tasksPath}/${file}`
    const content = await fileSystem.readFile(filePath)
    const blockers = extractBlockedBy(content)

    // Check if any blockers still exist (are incomplete)
    const hasIncompleteBlocker = blockers.some(blocker =>
      existingTasks.has(blocker)
    )

    if (!hasIncompleteBlocker) {
      const title = extractTitle(content)
      const openingSentence = extractOpeningSentence(content)
      const relativePath = `.dust/tasks/${file}`
      tasks.push({ path: relativePath, title, openingSentence })
    }
  }

  return { tasks }
}

/**
 * Formats unblocked tasks for display.
 */
export function printTaskList(
  context: CommandContext,
  tasks: UnblockedTask[]
): void {
  const colors = getColors()

  context.stdout('📋 Next tasks')
  context.stdout('')
  for (const task of tasks) {
    const parts = task.path.split('/')
    const displayTitle =
      task.title || parts[parts.length - 1].replace('.md', '')
    context.stdout(`${colors.bold}# ${displayTitle}${colors.reset}`)

    if (task.openingSentence) {
      context.stdout(`${colors.dim}${task.openingSentence}${colors.reset}`)
    }

    context.stdout(`${colors.cyan}→ ${task.path}${colors.reset}`)
    context.stdout('')
  }
}

export async function next(
  dependencies: CommandDependencies
): Promise<CommandResult> {
  const { context, fileSystem, settings } = dependencies

  const result = await findUnblockedTasks(context.cwd, fileSystem)

  if (result.error) {
    context.stderr(`Error: ${result.error}`)
    context.stderr("Run 'dust init' to initialize a Dust repository")
    return { exitCode: 1 }
  }

  if (result.tasks.length === 0) {
    return { exitCode: 0 }
  }

  printTaskList(context, result.tasks)

  const vars = templateVariables(settings, false)
  context.stdout(
    `Pick ONE task, read its file to understand the requirements, then run \`${vars.bin} focus "<task name>"\`.`
  )

  return { exitCode: 0 }
}
