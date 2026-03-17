/**
 * Artifact patch building API.
 *
 * Provides functions for building multi-file artifact patches from
 * structured objects with automatic validation.
 */

import type { ReadableFileSystem } from '../filesystem/types'
import type { Violation } from '../lint/validators/types'
import { type ArtifactPatch, validatePatch } from '../validation/index'
import { MARKDOWN_LINK_PATTERN } from '../markdown/markdown-utilities'
import { type FactInput, buildFactFiles, serializeFact } from './fact'
import {
  type TaskInput,
  type StandardTaskInput,
  type WorkflowTaskInput,
  buildTaskFiles,
  serializeTask,
} from './task'

// Re-export types and functions
export { serializeFact } from './fact'
export type { FactInput } from './fact'
export { serializeTask } from './task'
export type { TaskInput, StandardTaskInput, WorkflowTaskInput } from './task'
export type { ArtifactPatch, Violation }

export interface ArtifactPatchInput {
  facts?: Record<string, FactInput | null>
  tasks?: Record<string, TaskInput | null>
}

export interface BuildArtifactPatchResult {
  valid: boolean
  violations: Violation[]
  patch: ArtifactPatch
}

interface ValidatePatchOptions {
  cwd?: string
}

const CONTENT_DIRS = ['principles', 'facts', 'ideas', 'tasks'] as const

/**
 * Scans all artifacts for markdown links to deleted files and returns
 * updated content with those links removed.
 */
async function findReferencesToDeletedPaths(
  fileSystem: ReadableFileSystem,
  dustPath: string,
  deletedPaths: Set<string>
): Promise<Map<string, string>> {
  const updates = new Map<string, string>()

  for (const dir of CONTENT_DIRS) {
    const dirPath = `${dustPath}/${dir}`

    let entries: string[]
    try {
      entries = await fileSystem.readdir(dirPath)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        continue
      }
      throw error
    }

    for (const entry of entries) {
      if (!entry.endsWith('.md')) continue

      const filePath = `${dirPath}/${entry}`
      const relativePath = `${dir}/${entry}`

      // Skip files that are being deleted
      if (deletedPaths.has(relativePath)) continue

      const content = await fileSystem.readFile(filePath)
      const updatedContent = removeLinksToDeletedPaths(
        content,
        deletedPaths,
        relativePath
      )

      if (updatedContent !== content) {
        updates.set(relativePath, updatedContent)
      }
    }
  }

  return updates
}

/**
 * Removes markdown links that point to any of the deleted paths.
 *
 * @param content - The markdown content to process
 * @param deletedPaths - Set of paths relative to dust directory (e.g., 'facts/my-fact.md')
 * @param sourceFilePath - The path of the source file relative to dust directory
 */
function removeLinksToDeletedPaths(
  content: string,
  deletedPaths: Set<string>,
  sourceFilePath: string
): string {
  const globalPattern = new RegExp(MARKDOWN_LINK_PATTERN.source, 'g')
  const sourceDir = sourceFilePath.substring(0, sourceFilePath.lastIndexOf('/'))

  let linksRemoved = false
  let result = content.replace(globalPattern, (match, text, target) => {
    // Normalize the target path for comparison
    const normalizedTarget = normalizeTargetPath(target, sourceDir)

    if (normalizedTarget !== null && deletedPaths.has(normalizedTarget)) {
      // Replace the link with just the text
      linksRemoved = true
      return text
    }

    return match
  })

  // Only clean up Blocked By sections if we actually removed a link
  if (linksRemoved) {
    result = cleanupBlockedBySection(result)
  }

  return result
}

/**
 * Filters blocked-by items to keep only those containing links.
 */
function filterBlockedByItems(items: string[]): string[] {
  return items.filter(item => MARKDOWN_LINK_PATTERN.test(item))
}

/**
 * Renders a cleaned-up Blocked By section.
 */
function renderBlockedByContent(
  heading: string,
  items: string[],
  hasRealContent: boolean
): string[] {
  const result = [heading]
  if (hasRealContent) {
    result.push(...filterBlockedByItems(items))
  } else {
    result.push('', '(none)')
  }
  return result
}

/**
 * Cleans up ## Blocked By sections by removing orphaned bullet points
 * (bullets that only contain plain text from removed links) and
 * ensuring an empty section shows (none).
 */
function cleanupBlockedBySection(content: string): string {
  const lines = content.split('\n')
  const result: string[] = []
  let inBlockedBy = false
  let blockedByStart = -1
  let blockedByItems: string[] = []
  let hasRealContent = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Check for section headings
    if (line.startsWith('## ')) {
      // End of previous Blocked By section
      if (inBlockedBy) {
        const sectionLines = renderBlockedByContent(
          lines[blockedByStart],
          blockedByItems,
          hasRealContent
        )
        result.push(...sectionLines)
        inBlockedBy = false
        blockedByItems = []
        hasRealContent = false
      }

      // Check if this is a Blocked By section
      if (line.trimEnd() === '## Blocked By') {
        inBlockedBy = true
        blockedByStart = i
        continue
      }
    }

    if (inBlockedBy) {
      // Collect lines in the Blocked By section
      if (line.startsWith('- ')) {
        blockedByItems.push(line)
        if (MARKDOWN_LINK_PATTERN.test(line)) {
          hasRealContent = true
        }
      } else if (line.trim() === '(none)') {
        // Already marked as none
        hasRealContent = false
      } else if (line.trim() !== '') {
        // Some other content
        blockedByItems.push(line)
        hasRealContent = true
      }
      continue
    }

    result.push(line)
  }

  // Handle Blocked By section at end of file
  if (inBlockedBy) {
    const sectionLines = renderBlockedByContent(
      lines[blockedByStart],
      blockedByItems,
      hasRealContent
    )
    result.push(...sectionLines)
  }

  return result.join('\n')
}

/**
 * Normalizes a link target to a path relative to the dust directory.
 * Returns null if the target doesn't point to a dust artifact.
 *
 * @param target - The link target from markdown
 * @param sourceDir - The directory of the source file relative to dust directory
 */
function normalizeTargetPath(target: string, sourceDir: string): string | null {
  // Skip external URLs
  if (target.startsWith('http://') || target.startsWith('https://')) {
    return null
  }

  // Handle relative paths like ../facts/my-fact.md or ./something/../facts/my-fact.md
  if (target.startsWith('../') || target.startsWith('./')) {
    // Resolve the path relative to the source directory
    const parts = [...sourceDir.split('/'), ...target.split('/')]
    const resolved: string[] = []
    for (const part of parts) {
      if (part === '..') {
        resolved.pop()
      } else if (part !== '.' && part !== '') {
        resolved.push(part)
      }
    }
    return resolved.join('/')
  }

  // Handle simple relative paths (same directory) like "target-fact.md"
  if (!target.includes('/')) {
    return `${sourceDir}/${target}`
  }

  // Handle paths that are already relative to dust directory
  if (
    target.startsWith('facts/') ||
    target.startsWith('ideas/') ||
    target.startsWith('tasks/') ||
    target.startsWith('principles/')
  ) {
    return target
  }

  return null
}

/**
 * Builds an artifact patch from structured input objects.
 *
 * @param fileSystem - The existing filesystem
 * @param dustPath - Absolute path to the .dust directory
 * @param input - Structured artifact input objects
 * @param options - Optional configuration (e.g., cwd for relative violation paths)
 * @returns Result with validation status and the patch
 *
 * @example
 * const result = await buildArtifactPatch(fileSystem, '.dust', {
 *   facts: {
 *     'new-fact': { title: 'New Fact', body: 'Description here.' },
 *     'old-fact': null,  // delete
 *   },
 * })
 */
export async function buildArtifactPatch(
  fileSystem: ReadableFileSystem,
  dustPath: string,
  input: ArtifactPatchInput,
  options: ValidatePatchOptions = {}
): Promise<BuildArtifactPatchResult> {
  const files: Record<string, string | null> = {}
  const deletedPaths = new Set<string>()

  // Process facts
  if (input.facts) {
    for (const [slug, factInput] of Object.entries(input.facts)) {
      if (factInput === null) {
        const relativePath = `facts/${slug}.md`
        files[relativePath] = null
        deletedPaths.add(relativePath)
      } else {
        const factFiles = buildFactFiles(factInput, slug)
        Object.assign(files, factFiles)
      }
    }
  }

  // Process tasks
  if (input.tasks) {
    for (const [slug, taskInput] of Object.entries(input.tasks)) {
      if (taskInput === null) {
        const relativePath = `tasks/${slug}.md`
        files[relativePath] = null
        deletedPaths.add(relativePath)
      } else {
        const taskFiles = buildTaskFiles(taskInput, slug)
        Object.assign(files, taskFiles)
      }
    }
  }

  // Find and update references to deleted paths
  if (deletedPaths.size > 0) {
    const referenceUpdates = await findReferencesToDeletedPaths(
      fileSystem,
      dustPath,
      deletedPaths
    )
    for (const [path, content] of referenceUpdates) {
      // Only add if not already in the patch (avoid overwriting explicit changes)
      if (!(path in files)) {
        files[path] = content
      }
    }
  }

  const patch: ArtifactPatch = { files }

  // Validate the patch
  const validationResult = await validatePatch(
    fileSystem,
    dustPath,
    patch,
    options
  )

  return {
    valid: validationResult.valid,
    violations: validationResult.violations,
    patch,
  }
}
