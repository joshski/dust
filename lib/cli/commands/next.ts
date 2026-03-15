/**
 * dust next - List tasks that are ready to work on
 *
 * Displays tasks from .dust/tasks/ that are not blocked by any incomplete tasks.
 * A task is blocked if its "## Blocked By" section references task files that still exist.
 */

import { validateTaskHeadings } from '../../lint/validators/content-validator'
import {
  extractOpeningSentence,
  extractTitle,
} from '../../markdown/markdown-utilities'
import { getColors } from '../colors'
import type {
  CommandContext,
  CommandDependencies,
  CommandResult,
  DirectoryFileSorter,
  FileSystem,
} from '../types'

function hasRequiredHeadings(content: string): boolean {
  return (
    /^## Blocked By\s*$/m.test(content) &&
    /^## Definition of Done\s*$/m.test(content)
  )
}

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

export interface InvalidTask {
  path: string
  messages: string[]
}

/**
 * Finds unblocked tasks in .dust/tasks/.
 * Returns null if .dust directory is missing, otherwise an array of unblocked tasks.
 */
export async function findUnblockedTasks(
  cwd: string,
  fileSystem: FileSystem,
  directoryFileSorter?: DirectoryFileSorter
): Promise<{
  error?: string
  tasks: UnblockedTask[]
  invalidTasks: InvalidTask[]
}> {
  const dustPath = `${cwd}/.dust`

  if (!fileSystem.exists(dustPath)) {
    return { error: '.dust directory not found', tasks: [], invalidTasks: [] }
  }

  const tasksPath = `${dustPath}/tasks`

  if (!fileSystem.exists(tasksPath)) {
    return { tasks: [], invalidTasks: [] }
  }

  const files = await fileSystem.readdir(tasksPath)
  let mdFiles = files.filter(f => f.endsWith('.md'))

  if (directoryFileSorter) {
    mdFiles = await directoryFileSorter(tasksPath, mdFiles)
  } else {
    mdFiles.sort((a, b) => {
      const aTime = fileSystem.getFileCreationTime(`${tasksPath}/${a}`)
      const bTime = fileSystem.getFileCreationTime(`${tasksPath}/${b}`)
      return aTime - bTime
    })
  }

  if (mdFiles.length === 0) {
    return { tasks: [], invalidTasks: [] }
  }

  const taskContents = new Map<string, string>()
  for (const file of mdFiles) {
    const filePath = `${tasksPath}/${file}`
    taskContents.set(file, await fileSystem.readFile(filePath))
  }

  const validTaskFiles: string[] = []
  const invalidTasks: InvalidTask[] = []

  for (const file of mdFiles) {
    const content = taskContents.get(file) ?? ''
    if (hasRequiredHeadings(content)) {
      validTaskFiles.push(file)
    } else {
      const violations = validateTaskHeadings(`.dust/tasks/${file}`, content)
      invalidTasks.push({
        path: `.dust/tasks/${file}`,
        messages: violations.map(v => v.message),
      })
    }
  }

  // Only valid task files participate in blocker evaluation.
  const existingTasks = new Set(validTaskFiles)

  const tasks: UnblockedTask[] = []

  for (const file of validTaskFiles) {
    const content = taskContents.get(file) ?? ''
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

  return { tasks, invalidTasks }
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

export function printSkippedTasks(
  context: CommandContext,
  invalidTasks: InvalidTask[]
): void {
  const colors = getColors()
  context.stderr(`${colors.yellow}⚠ Skipped invalid tasks${colors.reset}`)
  context.stderr('')
  for (const task of invalidTasks) {
    context.stderr(`${colors.cyan}→ ${task.path}${colors.reset}`)
    for (const message of task.messages) {
      context.stderr(`  ${message}`)
    }
    context.stderr('')
  }
}

export async function next(
  dependencies: CommandDependencies
): Promise<CommandResult> {
  const { context, fileSystem, directoryFileSorter } = dependencies

  const result = await findUnblockedTasks(
    context.cwd,
    fileSystem,
    directoryFileSorter
  )

  if (result.error) {
    context.stderr(`Error: ${result.error}`)
    context.stderr("Run 'dust init' to initialize a Dust repository")
    return { exitCode: 1 }
  }

  if (result.tasks.length === 0) {
    if (result.invalidTasks.length > 0) {
      printSkippedTasks(context, result.invalidTasks)
    }
    context.emitEvent?.({
      type: 'tasks-listed',
      tasks: [],
    })
    return { exitCode: 0 }
  }

  printTaskList(context, result.tasks)

  if (result.invalidTasks.length > 0) {
    printSkippedTasks(context, result.invalidTasks)
  }

  context.emitEvent?.({
    type: 'tasks-listed',
    tasks: result.tasks.map(task => {
      const parts = task.path.split('/')
      const filename = parts[parts.length - 1]
      return {
        path: task.path,
        title: task.title ?? filename.replace('.md', ''),
        blockedBy: [],
      }
    }),
  })

  return { exitCode: 0 }
}
