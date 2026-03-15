/**
 * Idea file validation for .dust markdown files
 */

import {
  IDEA_TRANSITION_PREFIXES,
  titleToFilename,
} from '../../artifacts/workflow-tasks'
import type { ReadableFileSystem } from '../../filesystem/types'
import {
  extractTitle,
  MARKDOWN_LINK_PATTERN,
} from '../../markdown/markdown-utilities'
import type { Violation } from './types'

const WORKFLOW_PREFIX_TO_SECTION: Record<string, string> = {
  'Refine Idea: ': 'Refines Idea',
  'Decompose Idea: ': 'Decomposes Idea',
  'Shelve Idea: ': 'Shelves Idea',
  'Expedite Idea: ': 'Expedites Idea',
}

export function validateIdeaOpenQuestions(
  filePath: string,
  content: string
): Violation[] {
  const violations: Violation[] = []
  const lines = content.split('\n')
  const topLevelStructureMessage =
    'Open Questions must use `### Question?` headings and `#### Option` headings at the top level. Put supporting markdown (including lists and code blocks) under an option heading. Run `dust new idea` to see the expected format.'

  let inOpenQuestions = false
  let currentQuestionLine: number | null = null
  let inOption = false
  let inCodeBlock = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmedLine = line.trimEnd()
    const nonWhitespaceLine = line.trim()

    // h2 heading: enters or exits the Open Questions section
    if (line.startsWith('## ')) {
      if (inOpenQuestions && currentQuestionLine !== null) {
        violations.push({
          file: filePath,
          message: 'Question has no options listed beneath it',
          line: currentQuestionLine,
        })
      }
      const headingText = line.slice(3).trimEnd()
      if (
        headingText.toLowerCase() === 'open questions' &&
        headingText !== 'Open Questions'
      ) {
        violations.push({
          file: filePath,
          message: `Heading "${line.trimEnd()}" should be "## Open Questions"`,
          line: i + 1,
        })
      }
      inOpenQuestions = line === '## Open Questions'
      currentQuestionLine = null
      inOption = false
      inCodeBlock = false
      continue
    }

    if (!inOpenQuestions) continue

    // Track fenced code blocks only while inside Open Questions.
    if (line.startsWith('```')) {
      if (!inOption && !inCodeBlock) {
        violations.push({
          file: filePath,
          message: topLevelStructureMessage,
          line: i + 1,
        })
      }
      inCodeBlock = !inCodeBlock
      continue
    }
    if (inCodeBlock) continue

    // h3 heading: a question (must end with ?)
    if (line.startsWith('### ')) {
      inOption = false
      if (currentQuestionLine !== null) {
        violations.push({
          file: filePath,
          message: 'Question has no options listed beneath it',
          line: currentQuestionLine,
        })
      }

      if (!trimmedLine.endsWith('?')) {
        violations.push({
          file: filePath,
          message:
            'Questions must end with "?" (e.g., "### Should we take our own payments?")',
          line: i + 1,
        })
        currentQuestionLine = null
      } else {
        currentQuestionLine = i + 1
      }
      continue
    }

    // h4 heading: an option (satisfies the current question)
    if (line.startsWith('#### ')) {
      currentQuestionLine = null
      inOption = true
      continue
    }

    // Reject any top-level non-empty content that is not part of the heading structure.
    if (nonWhitespaceLine && !inOption) {
      violations.push({
        file: filePath,
        message: topLevelStructureMessage,
        line: i + 1,
      })
    }
  }

  // Handle question at end of file with no options
  if (inOpenQuestions && currentQuestionLine !== null) {
    violations.push({
      file: filePath,
      message: 'Question has no options listed beneath it',
      line: currentQuestionLine,
    })
  }

  return violations
}

export function validateIdeaTransitionTitle(
  filePath: string,
  content: string,
  ideasPath: string,
  fileSystem: ReadableFileSystem
): Violation | null {
  const title = extractTitle(content)
  if (!title) {
    return null
  }

  for (const prefix of IDEA_TRANSITION_PREFIXES) {
    if (title.startsWith(prefix)) {
      const ideaTitle = title.slice(prefix.length)
      const ideaFilename = titleToFilename(ideaTitle)
      if (!fileSystem.exists(`${ideasPath}/${ideaFilename}`)) {
        return {
          file: filePath,
          message: `Idea transition task references non-existent idea: "${ideaTitle}" (expected file "${ideaFilename}" in ideas/)`,
        }
      }
      return null
    }
  }

  return null
}

function extractSectionContent(
  content: string,
  sectionHeading: string
): { content: string; startLine: number } | null {
  const lines = content.split('\n')
  let inSection = false
  let sectionContent = ''
  let startLine = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (line.startsWith('## ')) {
      if (inSection) break
      if (line.trimEnd() === `## ${sectionHeading}`) {
        inSection = true
        startLine = i + 1
      }
      continue
    }

    if (line.startsWith('# ') && inSection) break

    if (inSection) {
      sectionContent += `${line}\n`
    }
  }

  if (!inSection) return null
  return { content: sectionContent, startLine }
}

export function validateWorkflowTaskBodySection(
  filePath: string,
  content: string,
  ideasPath: string,
  fileSystem: ReadableFileSystem
): Violation[] {
  const violations: Violation[] = []
  const title = extractTitle(content)
  if (!title) return violations

  let matchedPrefix: string | null = null
  for (const prefix of IDEA_TRANSITION_PREFIXES) {
    if (title.startsWith(prefix)) {
      matchedPrefix = prefix
      break
    }
  }

  if (!matchedPrefix) return violations

  const expectedHeading = WORKFLOW_PREFIX_TO_SECTION[matchedPrefix]
  const section = extractSectionContent(content, expectedHeading)

  if (!section) {
    violations.push({
      file: filePath,
      message: `Workflow task with "${matchedPrefix.trim()}" prefix is missing required "## ${expectedHeading}" section. Add a section with a link to the idea file, e.g.:\n\n## ${expectedHeading}\n\n- [Idea Title](../ideas/idea-slug.md)`,
    })
    return violations
  }

  const linkRegex = new RegExp(MARKDOWN_LINK_PATTERN.source, 'g')
  const links: { text: string; target: string; line: number }[] = []
  const sectionLines = section.content.split('\n')

  for (let i = 0; i < sectionLines.length; i++) {
    const line = sectionLines[i]
    let match: RegExpExecArray | null = linkRegex.exec(line)
    while (match !== null) {
      links.push({
        text: match[1],
        target: match[2],
        line: section.startLine + i + 1,
      })
      match = linkRegex.exec(line)
    }
  }

  if (links.length === 0) {
    violations.push({
      file: filePath,
      message: `"## ${expectedHeading}" section contains no link. Add a markdown link to the idea file, e.g.:\n\n- [Idea Title](../ideas/idea-slug.md)`,
      line: section.startLine,
    })
    return violations
  }

  const ideaLinks = links.filter(
    l => l.target.includes('/ideas/') || l.target.startsWith('../ideas/')
  )

  if (ideaLinks.length === 0) {
    violations.push({
      file: filePath,
      message: `"## ${expectedHeading}" section contains no link to an idea file. Links must point to a file in ../ideas/, e.g.:\n\n- [Idea Title](../ideas/idea-slug.md)`,
      line: section.startLine,
    })
    return violations
  }

  for (const link of ideaLinks) {
    const slugMatch = link.target.match(/([^/]+)\.md$/)
    if (!slugMatch) continue

    const ideaSlug = slugMatch[1]
    const ideaFilePath = `${ideasPath}/${ideaSlug}.md`

    if (!fileSystem.exists(ideaFilePath)) {
      violations.push({
        file: filePath,
        message: `Link to idea "${link.text}" points to non-existent file: ${ideaSlug}.md. Either create the idea file at ideas/${ideaSlug}.md or update the link to point to an existing idea.`,
        line: link.line,
      })
    }
  }

  return violations
}
