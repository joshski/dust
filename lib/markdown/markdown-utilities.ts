/**
 * Shared markdown utilities for dust CLI commands
 */

/**
 * Extracts the title from markdown content (first H1 heading)
 */
export function extractTitle(content: string): string | null {
  const match = content.match(/^#\s+(.+)$/m)
  return match ? match[1].trim() : null
}

/**
 * Pattern for matching markdown links: [text](url)
 * Note: Create a new RegExp with 'g' flag for global matching:
 * `new RegExp(MARKDOWN_LINK_PATTERN.source, 'g')`
 */
export const MARKDOWN_LINK_PATTERN = /\[([^\]]+)\]\(([^)]+)\)/

function findH1Index(lines: string[]): number {
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(/^#\s+.+$/)) {
      return i
    }
  }
  return -1
}

function findFirstNonBlankLineAfter(
  lines: string[],
  startIndex: number
): number {
  for (let i = startIndex + 1; i < lines.length; i++) {
    if (lines[i].trim() !== '') {
      return i
    }
  }
  return -1
}

const LIST_ITEM_PREFIXES = ['-', '*', '+']
const STRUCTURAL_PREFIXES = ['#', '```', '>']

function isStructuralElement(line: string): boolean {
  if (STRUCTURAL_PREFIXES.some(prefix => line.startsWith(prefix))) {
    return true
  }
  if (LIST_ITEM_PREFIXES.some(prefix => line.startsWith(prefix))) {
    return true
  }
  return /^\d+\./.test(line)
}

function isBlockBreak(line: string): boolean {
  return STRUCTURAL_PREFIXES.some(prefix => line.startsWith(prefix))
}

function collectParagraph(lines: string[], startIndex: number): string {
  const parts: string[] = []
  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim()
    if (line === '' || isBlockBreak(line)) {
      break
    }
    parts.push(line)
  }
  return parts.join(' ')
}

function extractFirstSentence(paragraph: string): string | null {
  const match = paragraph.match(/^(.+?[.?!])(?:\s|$)/)
  return match ? match[1] : null
}

/**
 * Extracts the first sentence from the first paragraph after the H1 heading.
 * Returns null if no valid opening paragraph exists.
 *
 * A valid opening paragraph:
 * - Appears on the first non-blank line after the H1 heading
 * - Is a plain paragraph (not a heading, list item, or code block)
 * - Starts with a sentence that ends in `.` `?` or `!`
 */
export function extractOpeningSentence(content: string): string | null {
  const lines = content.split('\n')
  const h1Index = findH1Index(lines)
  if (h1Index === -1) {
    return null
  }

  const paragraphStart = findFirstNonBlankLineAfter(lines, h1Index)
  if (paragraphStart === -1) {
    return null
  }

  const trimmedFirstLine = lines[paragraphStart].trim()
  if (isStructuralElement(trimmedFirstLine)) {
    return null
  }

  const paragraph = collectParagraph(lines, paragraphStart)
  return extractFirstSentence(paragraph)
}
