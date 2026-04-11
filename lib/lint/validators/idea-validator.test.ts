import { describe, expect, test } from 'vitest'
import { parseArtifact } from '../../artifacts/parsed-artifact'
import { validateIdeaOpenQuestions } from './idea-validator'

describe('validateIdeaOpenQuestions', () => {
  describe('duplicate option detection', () => {
    test('reports violation for duplicate options under the same question', () => {
      const content = `# My Idea

Some description.

## Open Questions

### Should we do X?

#### Yes

Some notes.

#### Yes

Other notes.
`
      const artifact = parseArtifact('/test.md', content)
      const violations = validateIdeaOpenQuestions(artifact)
      const duplicate = violations.find(v => v.message.includes('Duplicate'))
      expect(duplicate).toBeDefined()
      expect(duplicate!.message).toContain('"Yes"')
      expect(duplicate!.message).toContain('"Should we do X?"')
      expect(duplicate!.message).toContain('unique name')
    })

    test('does not report violation when same option name appears under different questions', () => {
      const content = `# My Idea

Some description.

## Open Questions

### Should we do X?

#### Yes

First question yes.

#### No

First question no.

### Should we do Y?

#### Yes

Second question yes.

#### No

Second question no.
`
      const artifact = parseArtifact('/test.md', content)
      const violations = validateIdeaOpenQuestions(artifact)
      const duplicates = violations.filter(v => v.message.includes('Duplicate'))
      expect(duplicates).toHaveLength(0)
    })

    test('handles mix: duplicate under one question, unique across questions', () => {
      const content = `# My Idea

Some description.

## Open Questions

### Should we do X?

#### Yes

Notes.

#### Yes

More notes.

### Should we do Y?

#### Yes

Different question, same option name is fine.
`
      const artifact = parseArtifact('/test.md', content)
      const violations = validateIdeaOpenQuestions(artifact)
      const duplicates = violations.filter(v => v.message.includes('Duplicate'))
      expect(duplicates).toHaveLength(1)
      expect(duplicates[0].message).toContain('"Yes"')
      expect(duplicates[0].message).toContain('"Should we do X?"')
    })
  })
})
