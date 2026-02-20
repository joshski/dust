import type { ReadableFileSystem } from '../filesystem/types'
import {
  extractTitle,
  MARKDOWN_LINK_PATTERN,
} from '../markdown/markdown-utilities'

export interface Principle {
  slug: string
  title: string
  content: string
  parentPrinciple: string | null
  subPrinciples: string[]
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
 * Extracts a single link from a section, or null if none/multiple exist.
 */
function extractSingleLinkFromSection(
  content: string,
  sectionHeading: string
): string | null {
  const links = extractLinksFromSection(content, sectionHeading)
  return links.length === 1 ? links[0] : null
}

/**
 * Parses a principle markdown file into a structured Principle object.
 */
export async function parsePrinciple(
  fileSystem: ReadableFileSystem,
  dustPath: string,
  slug: string
): Promise<Principle> {
  const principlePath = `${dustPath}/principles/${slug}.md`
  if (!fileSystem.exists(principlePath)) {
    throw new Error(
      `Principle not found: "${slug}" (expected file at ${principlePath})`
    )
  }

  const content = await fileSystem.readFile(principlePath)
  const title = extractTitle(content)
  if (!title) {
    throw new Error(`Principle file has no title: ${principlePath}`)
  }

  const parentPrinciple = extractSingleLinkFromSection(
    content,
    'Parent Principle'
  )
  const subPrinciples = extractLinksFromSection(content, 'Sub-Principles')

  return {
    slug,
    title,
    content,
    parentPrinciple,
    subPrinciples,
  }
}
