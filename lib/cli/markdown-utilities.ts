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

  // Find the H1 heading
  let h1Index = -1
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(/^#\s+.+$/)) {
      h1Index = i
      break
    }
  }

  if (h1Index === -1) {
    return null
  }

  // Find the first non-blank line after the H1
  let paragraphStart = -1
  for (let i = h1Index + 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (line !== '') {
      paragraphStart = i
      break
    }
  }

  if (paragraphStart === -1) {
    return null
  }

  const firstLine = lines[paragraphStart]
  const trimmedFirstLine = firstLine.trim()

  // Check if it's a plain paragraph (not heading, list item, or code block)
  if (
    trimmedFirstLine.startsWith('#') ||
    trimmedFirstLine.startsWith('-') ||
    trimmedFirstLine.startsWith('*') ||
    trimmedFirstLine.startsWith('+') ||
    trimmedFirstLine.match(/^\d+\./) ||
    trimmedFirstLine.startsWith('```') ||
    trimmedFirstLine.startsWith('>')
  ) {
    return null
  }

  // Collect the full paragraph (until blank line or end)
  let paragraph = ''
  for (let i = paragraphStart; i < lines.length; i++) {
    const line = lines[i].trim()
    if (line === '') break
    // Stop if we hit another structural element
    if (
      line.startsWith('#') ||
      line.startsWith('```') ||
      line.startsWith('>')
    ) {
      break
    }
    paragraph += (paragraph ? ' ' : '') + line
  }

  // Extract the first sentence (ends with . ? or !)
  const sentenceMatch = paragraph.match(/^(.+?[.?!])(?:\s|$)/)
  if (!sentenceMatch) {
    return null
  }

  return sentenceMatch[1]
}
