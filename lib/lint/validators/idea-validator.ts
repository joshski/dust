/**
 * Idea file validation for .dust markdown files
 */

import {
  IDEA_TRANSITION_PREFIXES,
  titleToFilename,
} from '../../artifacts/workflow-tasks'
import type { ReadableFileSystem } from '../../filesystem/types'
import { extractTitle } from '../../markdown/markdown-utilities'
import type { Violation } from './types'

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
