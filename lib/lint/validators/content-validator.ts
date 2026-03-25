/**
 * Content validation for .dust markdown files
 */

import type { ParsedArtifact } from '../../artifacts/parsed-artifact'
import { VALID_TASK_TYPES } from '../../artifacts/workflow-tasks'
import type { Violation } from './types'

const REQUIRED_TASK_HEADINGS = ['Task Type', 'Blocked By', 'Definition of Done']

const ALLOWED_TASK_TYPES: Set<string> = new Set(VALID_TASK_TYPES)

const MAX_OPENING_SENTENCE_LENGTH = 150 // Enforces concise summaries that fit comfortably in a single line of context

const NON_IMPERATIVE_STARTERS = new Set([
  'the',
  'a',
  'an',
  'this',
  'that',
  'these',
  'those',
  'we',
  'it',
  'they',
  'you',
  'i',
])

export function validateOpeningSentence(
  artifact: ParsedArtifact
): Violation | null {
  if (!artifact.openingSentence) {
    return {
      file: artifact.filePath,
      line: artifact.titleLine ?? undefined,
      message: 'Missing or malformed opening sentence after H1 heading',
    }
  }
  return null
}

export function validateOpeningSentenceLength(
  artifact: ParsedArtifact
): Violation | null {
  const openingSentence = artifact.openingSentence
  if (!openingSentence) {
    return null // Missing sentence is handled by validateOpeningSentence
  }
  if (openingSentence.length > MAX_OPENING_SENTENCE_LENGTH) {
    return {
      file: artifact.filePath,
      line: artifact.openingSentenceLine ?? undefined,
      message: `Opening sentence is ${openingSentence.length} characters (max ${MAX_OPENING_SENTENCE_LENGTH}). Split into multiple sentences; only the first sentence is checked.`,
    }
  }
  return null
}

export function validateImperativeOpeningSentence(
  artifact: ParsedArtifact
): Violation | null {
  const openingSentence = artifact.openingSentence
  if (!openingSentence) {
    return null
  }

  const firstWord = openingSentence.split(/\s/)[0].replace(/[^a-zA-Z]/g, '')
  const lower = firstWord.toLowerCase()

  if (NON_IMPERATIVE_STARTERS.has(lower) || lower.endsWith('ing')) {
    const preview =
      openingSentence.length > 40
        ? `${openingSentence.slice(0, 40)}...`
        : openingSentence
    return {
      file: artifact.filePath,
      line: artifact.openingSentenceLine ?? undefined,
      message: `Opening sentence should use imperative form (e.g., "Add X" not "This adds X"). Found: "${preview}"`,
    }
  }

  return null
}

export function validateTaskHeadings(artifact: ParsedArtifact): Violation[] {
  const violations: Violation[] = []
  const sectionHeadings = new Set(artifact.sections.map(s => s.heading))

  for (const heading of REQUIRED_TASK_HEADINGS) {
    if (!sectionHeadings.has(heading)) {
      violations.push({
        file: artifact.filePath,
        message: `Missing required heading: "## ${heading}"`,
      })
    }
  }
  return violations
}

export function validateTaskType(artifact: ParsedArtifact): Violation | null {
  const taskTypeSection = artifact.sections.find(s => s.heading === 'Task Type')

  if (!taskTypeSection) {
    return null // Missing section is handled by validateTaskHeadings
  }

  // Extract section content from rawContent using startLine and endLine
  const lines = artifact.rawContent.split('\n')
  const sectionLines = lines.slice(
    taskTypeSection.startLine,
    taskTypeSection.endLine + 1
  )
  const content = sectionLines.join('\n').trim()

  if (!content) {
    return {
      file: artifact.filePath,
      line: taskTypeSection.startLine,
      message:
        'Task Type section must contain one of: implement, capture, refine, decompose, shelve',
    }
  }

  if (!ALLOWED_TASK_TYPES.has(content)) {
    return {
      file: artifact.filePath,
      line: taskTypeSection.startLine,
      message: `Invalid task type "${content}". Must be one of: implement, capture, refine, decompose, shelve`,
    }
  }

  return null
}
