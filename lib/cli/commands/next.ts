/**
 * dust next - List tasks that are ready to work on
 *
 * Displays tasks from .dust/tasks/ that are not blocked by any incomplete tasks.
 * A task is blocked if its "## Blocked by" section references task files that still exist.
 */

import { extractOpeningSentence, extractTitle } from '../markdown-utilities'
import type { CommandDependencies, CommandResult } from '../types'

const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
}

function extractBlockedBy(content: string): string[] {
  // Find the "## Blocked by" section
  const blockedByMatch = content.match(
    /^## Blocked by\s*\n([\s\S]*?)(?=\n## |\n*$)/m
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

export async function next(
  dependencies: CommandDependencies
): Promise<CommandResult> {
  const { context, fileSystem } = dependencies
  const dustPath = `${context.cwd}/.dust`

  if (!fileSystem.exists(dustPath)) {
    context.stderr('Error: .dust directory not found')
    context.stderr("Run 'dust init' to initialize a Dust repository")
    return { exitCode: 1 }
  }

  const tasksPath = `${dustPath}/tasks`

  if (!fileSystem.exists(tasksPath)) {
    // No tasks directory means no tasks to show
    return { exitCode: 0 }
  }

  const files = await fileSystem.readdir(tasksPath)
  const mdFiles = files.filter(f => f.endsWith('.md')).sort()

  if (mdFiles.length === 0) {
    return { exitCode: 0 }
  }

  // Create a set of existing task files for quick lookup
  const existingTasks = new Set(mdFiles)

  // Find unblocked tasks
  const unblockedTasks: Array<{
    path: string
    title: string | null
    openingSentence: string | null
  }> = []

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
      unblockedTasks.push({ path: relativePath, title, openingSentence })
    }
  }

  if (unblockedTasks.length === 0) {
    return { exitCode: 0 }
  }

  context.stdout('📋 Next tasks')
  context.stdout('')
  for (const task of unblockedTasks) {
    const displayTitle =
      task.title || task.path.split('/').pop()!.replace('.md', '')
    context.stdout(`${colors.bold}# ${displayTitle}${colors.reset}`)

    if (task.openingSentence) {
      context.stdout(`${colors.dim}${task.openingSentence}${colors.reset}`)
    }

    context.stdout(`${colors.cyan}→ ${task.path}${colors.reset}`)
    context.stdout('')
  }

  return { exitCode: 0 }
}
