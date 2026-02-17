/**
 * Idea file validation for .dust markdown files
 */

import type { FileSystem } from '../../cli/types'
import { extractTitle } from '../../markdown/markdown-utilities'
import { IDEA_TRANSITION_PREFIXES, titleToFilename } from '../../workflow-tasks'
import type { Violation } from './types'

export function validateIdeaOpenQuestions(
  filePath: string,
  content: string
): Violation[] {
  const violations: Violation[] = []
  const lines = content.split('\n')

  let inOpenQuestions = false
  let currentQuestionLine: number | null = null
  let inCodeBlock = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Track fenced code blocks
    if (line.startsWith('```')) {
      inCodeBlock = !inCodeBlock
      continue
    }
    if (inCodeBlock) continue

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
      continue
    }

    if (!inOpenQuestions) continue

    // bullet-point lines are not allowed in Open Questions
    if (/^[-*] /.test(line.trimStart())) {
      violations.push({
        file: filePath,
        message:
          'Open Questions must use ### headings for questions and #### headings for options, not bullet points. Run `dust new idea` to see the expected format.',
        line: i + 1,
      })
      continue
    }

    // h3 heading: a question (must end with ?)
    if (line.startsWith('### ')) {
      if (currentQuestionLine !== null) {
        violations.push({
          file: filePath,
          message: 'Question has no options listed beneath it',
          line: currentQuestionLine,
        })
      }

      if (!line.trimEnd().endsWith('?')) {
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
  fileSystem: FileSystem
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
