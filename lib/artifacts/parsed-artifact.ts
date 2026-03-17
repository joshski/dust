/**
 * Parsed artifact types with positional metadata for validation.
 *
 * These types enrich artifact parsing with line numbers to support
 * single-pass validation and better error reporting.
 */

export interface ParsedMarkdownLink {
  text: string
  target: string
  line: number
}

export interface ParsedSection {
  heading: string
  level: number
  startLine: number
  endLine: number
  links: ParsedMarkdownLink[]
}

export interface ParsedArtifact {
  filePath: string
  rawContent: string
  title: string | null
  titleLine: number | null
  openingSentence: string | null
  openingSentenceLine: number | null
  sections: ParsedSection[]
  allLinks: ParsedMarkdownLink[]
}

const MARKDOWN_LINK_PATTERN = /\[([^\]]+)\]\(([^)]+)\)/g

/**
 * Parses markdown content into a ParsedArtifact with positional metadata.
 */
export function parseArtifact(
  filePath: string,
  content: string
): ParsedArtifact {
  const lines = content.split('\n')

  let title: string | null = null
  let titleLine: number | null = null
  let openingSentence: string | null = null
  let openingSentenceLine: number | null = null
  const sections: ParsedSection[] = []
  const allLinks: ParsedMarkdownLink[] = []

  let currentSection: ParsedSection | null = null
  let inCodeFence = false
  let openingSentenceResolved = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const lineNumber = i + 1 // 1-indexed

    // Track code fences
    if (line.startsWith('```')) {
      inCodeFence = !inCodeFence
      continue
    }

    if (inCodeFence) {
      continue
    }

    // Find H1 title (first occurrence only)
    const h1Match = line.match(/^#\s+(.+)$/)
    if (h1Match) {
      if (title === null) {
        title = h1Match[1].trim()
        titleLine = lineNumber
      } else {
        // Subsequent H1 headings close the current section
        // (H1s in the middle of a file act as section boundaries)
        if (currentSection !== null) {
          currentSection.endLine = findLastNonEmptyLine(
            lines,
            currentSection.startLine,
            lineNumber - 2
          )
          sections.push(currentSection)
          currentSection = null
        }
      }
      continue
    }

    // Find section headings (H2 and below)
    const headingMatch = line.match(/^(#{2,6})\s+(.+)$/)
    if (headingMatch) {
      // Once we hit a section, opening sentence search is done
      openingSentenceResolved = true

      // Close previous section
      if (currentSection !== null) {
        currentSection.endLine = findLastNonEmptyLine(
          lines,
          currentSection.startLine, // Start after heading (startLine is 1-indexed)
          lineNumber - 2
        )
        sections.push(currentSection)
      }

      currentSection = {
        heading: headingMatch[2].trim(),
        level: headingMatch[1].length,
        startLine: lineNumber,
        endLine: -1, // Will be set when section ends
        links: [],
      }
      continue
    }

    // Find opening sentence (first non-blank line after title, before any section)
    if (shouldCheckForOpeningSentence(title, openingSentenceResolved, line)) {
      const result = tryExtractOpeningSentence(lines, i)
      openingSentence = result.sentence
      openingSentenceLine = result.sentence !== null ? lineNumber : null
      openingSentenceResolved = true
    }

    // Extract markdown links
    const linkMatches = line.matchAll(MARKDOWN_LINK_PATTERN)
    for (const match of linkMatches) {
      const link: ParsedMarkdownLink = {
        text: match[1],
        target: match[2],
        line: lineNumber,
      }
      allLinks.push(link)
      if (currentSection !== null) {
        currentSection.links.push(link)
      }
    }
  }

  // Close the final section
  if (currentSection !== null) {
    currentSection.endLine = findLastNonEmptyLine(
      lines,
      currentSection.startLine, // Start after heading (startLine is 1-indexed)
      lines.length - 1
    )
    sections.push(currentSection)
  }

  return {
    filePath,
    rawContent: content,
    title,
    titleLine,
    openingSentence,
    openingSentenceLine,
    sections,
    allLinks,
  }
}

function shouldCheckForOpeningSentence(
  title: string | null,
  resolved: boolean,
  line: string
): boolean {
  if (title === null || resolved) {
    return false
  }
  const trimmed = line.trim()
  return trimmed !== '' && !isStructuralElement(trimmed)
}

function tryExtractOpeningSentence(
  lines: string[],
  startIndex: number
): { sentence: string | null } {
  const paragraph = collectParagraph(lines, startIndex)
  return { sentence: extractFirstSentence(paragraph) }
}

function findLastNonEmptyLine(
  lines: string[],
  contentStartIndex: number, // 0-indexed line after the heading
  fromIndex: number
): number {
  for (let i = fromIndex; i >= contentStartIndex; i--) {
    if (lines[i].trim() !== '') {
      return i + 1 // Convert to 1-indexed
    }
  }
  // Section has no non-empty content lines, return the heading line
  return contentStartIndex
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
