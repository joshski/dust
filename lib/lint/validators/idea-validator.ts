/**
 * Idea file validation for .dust markdown files
 */

import type { ParsedArtifact } from '../../artifacts/parsed-artifact'
import type { FileReader } from '../../filesystem/types'
import type { Violation } from './types'

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
  let currentQuestionText: string | null = null
  let currentQuestionOptionNames = new Set<string>()
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
      currentQuestionText = null
      currentQuestionOptionNames = new Set<string>()
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

      currentQuestionOptionNames = new Set<string>()
      if (!trimmedLine.endsWith('?')) {
        violations.push({
          file: filePath,
          message:
            'Questions must end with "?" (e.g., "### Should we take our own payments?")',
          line: i + 1,
        })
        currentQuestionLine = null
        currentQuestionText = null
      } else {
        currentQuestionLine = i + 1
        currentQuestionText = trimmedLine.slice(4)
      }
      continue
    }

    // h4 heading: an option (satisfies the current question)
    if (line.startsWith('#### ')) {
      const optionName = trimmedLine.slice(5)
      if (currentQuestionOptionNames.has(optionName)) {
        violations.push({
          file: filePath,
          message: `Duplicate option "${optionName}" under question "${currentQuestionText}" — each option must have a unique name`,
          line: i + 1,
        })
      } else {
        currentQuestionOptionNames.add(optionName)
      }
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
  _artifact: ParsedArtifact,
  _ideasPath: string,
  _fileSystem: FileReader
): Violation | null {
  // Title prefixes are now cosmetic - no validation needed
  return null
}

export function validateWorkflowTaskBodySection(
  _artifact: ParsedArtifact,
  _ideasPath: string,
  _fileSystem: FileReader
): Violation[] {
  // Title prefixes are now cosmetic - no validation based on title prefix needed
  return []
}
