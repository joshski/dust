/**
 * dust next - List tasks that are ready to work on
 *
 * Displays tasks from .dust/tasks/ that are not blocked by any incomplete tasks.
 * A task is blocked if its "## Blocked By" section references task files that still exist.
 */

import { parseArtifact } from '../../artifacts/parsed-artifact'
import { computeExecutionOrder } from '../../execution-order'
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

interface TaskFile {
  file: string
  content: string
}

function hasRequiredHeadings(content: string): boolean {
  return (
    /^## Blocked By\s*$/m.test(content) &&
    /^## Definition of Done\s*$/m.test(content)
  )
}

function extractBlockedBySlugs(content: string): string[] {
  // Find the "## Blocked By" section
  const blockedByMatch = content.match(
    /^## Blocked By\s*\n([\s\S]*?)(?=\n## |\n*$)/m
  )

  // hasRequiredHeadings guarantees this section exists
  const section = blockedByMatch![1].trim()

  // Check for "(none)" which means no blockers
  if (section === '(none)') {
    return []
  }

  // Extract markdown links and normalize to slugs
  const linkPattern = /\[.*?\]\(([^)]+\.md)\)/g
  const slugs: string[] = []
  let match: RegExpExecArray | null = linkPattern.exec(section)

  while (match !== null) {
    const slugMatch = match[1].match(/([^/]+)\.md$/)
    /* istanbul ignore next @preserve -- linkPattern already requires .md */
    if (slugMatch) slugs.push(slugMatch[1])
    match = linkPattern.exec(section)
  }

  return slugs
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
  const mdFiles = files.filter(f => f.endsWith('.md'))

  if (mdFiles.length === 0) {
    return { tasks: [], invalidTasks: [] }
  }

  // Get timestamps: use directoryFileSorter or fall back to file creation times
  let timestamps: Map<string, string | null>
  if (directoryFileSorter) {
    const results = await directoryFileSorter(tasksPath, mdFiles)
    timestamps = new Map(results.map(r => [r.file, r.lastCommittedAt]))
  } else {
    timestamps = new Map(
      mdFiles.map(f => {
        const ms = fileSystem.getFileCreationTime(`${tasksPath}/${f}`)
        return [f, ms > 0 ? new Date(ms).toISOString() : null]
      })
    )
  }

  const taskFiles: TaskFile[] = []
  for (const file of mdFiles) {
    const filePath = `${tasksPath}/${file}`
    taskFiles.push({ file, content: await fileSystem.readFile(filePath) })
  }

  const validTaskFiles: TaskFile[] = []
  const invalidTasks: InvalidTask[] = []

  for (const { file, content } of taskFiles) {
    if (hasRequiredHeadings(content)) {
      validTaskFiles.push({ file, content })
    } else {
      const filePath = `.dust/tasks/${file}`
      const artifact = parseArtifact(filePath, content)
      const violations = validateTaskHeadings(artifact)
      invalidTasks.push({
        path: filePath,
        messages: violations.map(v => v.message),
      })
    }
  }

  // Build task nodes for topological sort
  const taskNodes = validTaskFiles.map(({ file, content }) => ({
    slug: file.replace(/\.md$/, ''),
    file,
    content,
    blockedBy: extractBlockedBySlugs(content),
    lastCommittedAt: timestamps.get(file) ?? null,
  }))

  // Compute execution order (dependencies trump sort keys)
  const ordered = computeExecutionOrder(taskNodes)

  // Filter to unblocked tasks (all blockers absent from the task set)
  const existingSlugs = new Set(taskNodes.map(t => t.slug))
  const tasks: UnblockedTask[] = []

  for (const { node } of ordered) {
    const hasIncompleteBlocker = node.blockedBy.some(slug =>
      existingSlugs.has(slug)
    )

    if (!hasIncompleteBlocker) {
      const title = extractTitle(node.content)
      const openingSentence = extractOpeningSentence(node.content)
      tasks.push({ path: `.dust/tasks/${node.file}`, title, openingSentence })
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
