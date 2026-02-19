import type { ReadableFileSystem } from '../cli/types'
import {
  extractTitle,
  MARKDOWN_LINK_PATTERN,
} from '../markdown/markdown-utilities'

export interface Task {
  slug: string
  title: string
  content: string
  principles: string[]
  blockedBy: string[]
  definitionOfDone: string[]
}

/**
 * Extracts link targets from a section of markdown.
 * Returns an array of slugs derived from the link targets.
 */
function extractLinksFromSection(
  content: string,
  sectionHeading: string
): string[] {
  const lines = content.split('\n')
  const links: string[] = []

  let inSection = false

  for (const line of lines) {
    // Check for h2 headings
    if (line.startsWith('## ')) {
      inSection = line.trimEnd() === `## ${sectionHeading}`
      continue
    }

    if (!inSection) continue

    // Stop at next h2 or h1
    if (line.startsWith('# ')) break

    // Look for markdown links
    const linkMatch = line.match(MARKDOWN_LINK_PATTERN)
    if (linkMatch) {
      const target = linkMatch[2]
      // Extract slug from relative path like '../principles/some-principle.md'
      // or 'some-principle.md'
      const slugMatch = target.match(/([^/]+)\.md$/)
      if (slugMatch) {
        links.push(slugMatch[1])
      }
    }
  }

  return links
}

/**
 * Extracts checklist items from the Definition of Done section.
 * Returns an array of item texts (without the checkbox markers).
 */
function extractDefinitionOfDone(content: string): string[] {
  const lines = content.split('\n')
  const items: string[] = []

  let inSection = false

  for (const line of lines) {
    // Check for h2 headings
    if (line.startsWith('## ')) {
      inSection = line.trimEnd() === '## Definition of Done'
      continue
    }

    if (!inSection) continue

    // Stop at next h2 or h1
    if (line.startsWith('# ')) break

    // Match checklist items: - [ ] or - [x]
    const checklistMatch = line.match(/^-\s+\[[x\s]\]\s+(.+)$/i)
    if (checklistMatch) {
      items.push(checklistMatch[1].trim())
    }
  }

  return items
}

/**
 * Parses a task markdown file into a structured Task object.
 */
export async function parseTask(
  fileSystem: ReadableFileSystem,
  dustPath: string,
  slug: string
): Promise<Task> {
  const taskPath = `${dustPath}/tasks/${slug}.md`
  if (!fileSystem.exists(taskPath)) {
    throw new Error(`Task not found: "${slug}" (expected file at ${taskPath})`)
  }

  const content = await fileSystem.readFile(taskPath)
  const title = extractTitle(content)
  if (!title) {
    throw new Error(`Task file has no title: ${taskPath}`)
  }

  const principles = extractLinksFromSection(content, 'Principles')
  const blockedBy = extractLinksFromSection(content, 'Blocked By')
  const definitionOfDone = extractDefinitionOfDone(content)

  return {
    slug,
    title,
    content,
    principles,
    blockedBy,
    definitionOfDone,
  }
}
