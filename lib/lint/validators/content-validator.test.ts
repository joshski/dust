import { describe, expect, test } from 'vitest'
import type { ParsedArtifact } from '../../artifacts/parsed-artifact'
import { parseArtifact } from '../../artifacts/parsed-artifact'
import {
  validateImperativeOpeningSentence,
  validateOpeningSentence,
  validateOpeningSentenceLength,
  validateTaskType,
} from './content-validator'

function createArtifact(overrides: Partial<ParsedArtifact>): ParsedArtifact {
  return {
    filePath: '/test.md',
    rawContent: '',
    title: null,
    titleLine: null,
    openingSentence: null,
    openingSentenceLine: null,
    sections: [],
    allLinks: [],
    ...overrides,
  }
}

describe('content-validator', () => {
  describe('validateOpeningSentence', () => {
    test('returns violation when no opening sentence and no title', () => {
      // File without an H1 title - titleLine will be null
      const content = `Some text without a heading.
`
      const artifact = parseArtifact('/test.md', content)
      expect(artifact.titleLine).toBeNull()
      expect(artifact.openingSentence).toBeNull()

      const violation = validateOpeningSentence(artifact)
      expect(violation).not.toBeNull()
      expect(violation!.line).toBeUndefined() // titleLine was null
      expect(violation!.message).toContain(
        'Missing or malformed opening sentence'
      )
    })

    test('returns null when opening sentence exists', () => {
      const content = `# Title

This is a sentence.
`
      const artifact = parseArtifact('/test.md', content)
      const violation = validateOpeningSentence(artifact)
      expect(violation).toBeNull()
    })
  })

  describe('validateOpeningSentenceLength', () => {
    test('returns violation with line number when sentence too long', () => {
      const longSentence = 'A'.repeat(160) + '.'
      const content = `# Title

${longSentence}
`
      const artifact = parseArtifact('/test.md', content)
      expect(artifact.openingSentenceLine).toBe(3)

      const violation = validateOpeningSentenceLength(artifact)
      expect(violation).not.toBeNull()
      expect(violation!.line).toBe(3)
    })
  })

  describe('validateImperativeOpeningSentence', () => {
    test('returns violation with line number for non-imperative sentence', () => {
      const content = `# Title

This task does something.
`
      const artifact = parseArtifact('/test.md', content)
      expect(artifact.openingSentenceLine).toBe(3)

      const violation = validateImperativeOpeningSentence(artifact)
      expect(violation).not.toBeNull()
      expect(violation!.line).toBe(3)
    })

    test('returns violation for -ing starting word', () => {
      const content = `# Title

Adding new functionality.
`
      const artifact = parseArtifact('/test.md', content)

      const violation = validateImperativeOpeningSentence(artifact)
      expect(violation).not.toBeNull()
      expect(violation!.message).toContain('imperative form')
    })
  })

  describe('edge cases with null line numbers', () => {
    test('validateOpeningSentenceLength handles null openingSentenceLine', () => {
      // Manually construct artifact with openingSentence but null line
      const artifact = createArtifact({
        openingSentence: 'A'.repeat(160) + '.',
        openingSentenceLine: null,
      })

      const violation = validateOpeningSentenceLength(artifact)
      expect(violation).not.toBeNull()
      expect(violation!.line).toBeUndefined()
    })

    test('validateImperativeOpeningSentence handles null openingSentenceLine', () => {
      // Manually construct artifact with non-imperative sentence but null line
      const artifact = createArtifact({
        openingSentence: 'This does something.',
        openingSentenceLine: null,
      })

      const violation = validateImperativeOpeningSentence(artifact)
      expect(violation).not.toBeNull()
      expect(violation!.line).toBeUndefined()
    })
  })

  describe('validateTaskType', () => {
    test('returns null when Task Type section is missing', () => {
      const content = `# Task Title

Some content.

## Blocked By

(none)

## Definition of Done

- Task is complete
`
      const artifact = parseArtifact('/test.md', content)
      const violation = validateTaskType(artifact)
      expect(violation).toBeNull()
    })

    test('returns violation when Task Type section is empty', () => {
      const content = `# Task Title

Some content.

## Task Type

## Blocked By

(none)
`
      const artifact = parseArtifact('/test.md', content)
      const violation = validateTaskType(artifact)
      expect(violation).not.toBeNull()
      expect(violation!.message).toContain('must contain one of')
    })

    test('returns violation for invalid task type', () => {
      const content = `# Task Title

Some content.

## Task Type

invalid-type

## Blocked By

(none)
`
      const artifact = parseArtifact('/test.md', content)
      const violation = validateTaskType(artifact)
      expect(violation).not.toBeNull()
      expect(violation!.message).toContain('Invalid task type "invalid-type"')
    })

    test('returns null for valid task type: implement', () => {
      const content = `# Task Title

Some content.

## Task Type

implement

## Blocked By

(none)
`
      const artifact = parseArtifact('/test.md', content)
      const violation = validateTaskType(artifact)
      expect(violation).toBeNull()
    })

    test('returns null for valid task type: capture', () => {
      const content = `# Task Title

Some content.

## Task Type

capture

## Blocked By

(none)
`
      const artifact = parseArtifact('/test.md', content)
      const violation = validateTaskType(artifact)
      expect(violation).toBeNull()
    })

    test('returns null for valid task type: refine', () => {
      const content = `# Task Title

Some content.

## Task Type

refine

## Blocked By

(none)
`
      const artifact = parseArtifact('/test.md', content)
      const violation = validateTaskType(artifact)
      expect(violation).toBeNull()
    })

    test('returns null for valid task type: decompose', () => {
      const content = `# Task Title

Some content.

## Task Type

decompose

## Blocked By

(none)
`
      const artifact = parseArtifact('/test.md', content)
      const violation = validateTaskType(artifact)
      expect(violation).toBeNull()
    })

    test('returns null for valid task type: shelve', () => {
      const content = `# Task Title

Some content.

## Task Type

shelve

## Blocked By

(none)
`
      const artifact = parseArtifact('/test.md', content)
      const violation = validateTaskType(artifact)
      expect(violation).toBeNull()
    })

    test('handles whitespace around task type value', () => {
      const content = `# Task Title

Some content.

## Task Type

  implement

## Blocked By

(none)
`
      const artifact = parseArtifact('/test.md', content)
      const violation = validateTaskType(artifact)
      expect(violation).toBeNull()
    })
  })
})
