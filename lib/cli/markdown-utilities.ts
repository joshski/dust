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
