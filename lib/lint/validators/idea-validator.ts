/**
 * Idea file validation for .dust markdown files
 */

import type { ParsedArtifact } from '../../artifacts/parsed-artifact'
import {
  IDEA_TRANSITION_PREFIXES,
  titleToFilename,
} from '../../artifacts/workflow-tasks'
import type { ReadableFileSystem } from '../../filesystem/types'
import type { Violation } from './types'

const WORKFLOW_PREFIX_TO_SECTION: Record<string, string> = {
  'Refine Idea: ': 'Refines Idea',
  'Decompose Idea: ': 'Decomposes Idea',
  'Shelve Idea: ': 'Shelves Idea',
  'Expedite Idea: ': 'Expedites Idea',
}

function validateH2Heading(
  filePath: string,
  line: string,
  lineNumber: number,
  inOpenQuestions: boolean,
  currentQuestionLine: number | null
): Violation[] {
  const violations: Violation[] = []

  if (inOpenQuestions && currentQuestionLine !== null) {
    violations.push({
      file: filePath,
      message: 'Question has no options listed beneath it',
      line: currentQuestionLine,
    })
  }
  if (inOpenQuestions && line !== '## Open Questions') {
    violations.push({
      file: filePath,
      message:
        'Open Questions must be the last section in an idea file. Move this section above ## Open Questions.',
      line: lineNumber,
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
      line: lineNumber,
    })
  }

  return violations
}

export function validateIdeaOpenQuestions(
  artifact: ParsedArtifact
): Violation[] {
  const violations: Violation[] = []
  const lines = artifact.rawContent.split('\n')
  const filePath = artifact.filePath
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

    // Track fenced code blocks — skip headings inside them
    if (inOpenQuestions && line.startsWith('```')) {
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

    // h2 heading: enters or exits the Open Questions section
    if (line.startsWith('## ')) {
      violations.push(
        ...validateH2Heading(
          filePath,
          line,
          i + 1,
          inOpenQuestions,
          currentQuestionLine
        )
      )
      inOpenQuestions = line === '## Open Questions'
      currentQuestionLine = null
      inOption = false
      inCodeBlock = false
      continue
    }

    if (!inOpenQuestions) continue

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
  artifact: ParsedArtifact,
  ideasPath: string,
  fileSystem: ReadableFileSystem
): Violation | null {
  const title = artifact.title
  if (!title) {
    return null
  }

  for (const prefix of IDEA_TRANSITION_PREFIXES) {
    if (title.startsWith(prefix)) {
      const ideaTitle = title.slice(prefix.length)
      const ideaFilename = titleToFilename(ideaTitle)
      if (!fileSystem.exists(`${ideasPath}/${ideaFilename}`)) {
        return {
          file: artifact.filePath,
          message: `Idea transition task references non-existent idea: "${ideaTitle}" (expected file "${ideaFilename}" in ideas/)`,
        }
      }
      return null
    }
  }

  return null
}

export function validateWorkflowTaskBodySection(
  artifact: ParsedArtifact,
  ideasPath: string,
  fileSystem: ReadableFileSystem
): Violation[] {
  const violations: Violation[] = []
  const title = artifact.title
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
  const section = artifact.sections.find(
    s => s.heading === expectedHeading && s.level === 2
  )

  if (!section) {
    violations.push({
      file: artifact.filePath,
      message: `Workflow task with "${matchedPrefix.trim()}" prefix is missing required "## ${expectedHeading}" section. Add a section with a link to the idea file, e.g.:\n\n## ${expectedHeading}\n\n- [Idea Title](../ideas/idea-slug.md)`,
    })
    return violations
  }

  if (section.links.length === 0) {
    violations.push({
      file: artifact.filePath,
      message: `"## ${expectedHeading}" section contains no link. Add a markdown link to the idea file, e.g.:\n\n- [Idea Title](../ideas/idea-slug.md)`,
      line: section.startLine,
    })
    return violations
  }

  const ideaLinks = section.links.filter(
    l => l.target.includes('/ideas/') || l.target.startsWith('../ideas/')
  )

  if (ideaLinks.length === 0) {
    violations.push({
      file: artifact.filePath,
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
        file: artifact.filePath,
        message: `Link to idea "${link.text}" points to non-existent file: ${ideaSlug}.md. Either create the idea file at ideas/${ideaSlug}.md or update the link to point to an existing idea.`,
        line: link.line,
      })
    }
  }

  return violations
}
