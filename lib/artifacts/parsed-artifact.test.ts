import { describe, expect, test } from 'vitest'
import { parseArtifact } from './parsed-artifact'

describe('parseArtifact', () => {
  describe('title tracking', () => {
    test('extracts title and line number', () => {
      const content = `# My Idea

Some description.
`
      const result = parseArtifact('/path/to/file.md', content)
      expect(result.title).toBe('My Idea')
      expect(result.titleLine).toBe(1)
    })

    test('handles title not on first line', () => {
      const content = `
# My Idea

Some description.
`
      const result = parseArtifact('/path/to/file.md', content)
      expect(result.title).toBe('My Idea')
      expect(result.titleLine).toBe(2)
    })

    test('returns null when no title exists', () => {
      const content = `Some text without a heading.
`
      const result = parseArtifact('/path/to/file.md', content)
      expect(result.title).toBeNull()
      expect(result.titleLine).toBeNull()
    })

    test('ignores H1 inside code fence', () => {
      const content = `\`\`\`markdown
# Fake Title
\`\`\`

# Real Title

Description.
`
      const result = parseArtifact('/path/to/file.md', content)
      expect(result.title).toBe('Real Title')
      expect(result.titleLine).toBe(5)
    })
  })

  describe('opening sentence tracking', () => {
    test('extracts opening sentence and line number', () => {
      const content = `# My Idea

This is the opening sentence. And more text.
`
      const result = parseArtifact('/path/to/file.md', content)
      expect(result.openingSentence).toBe('This is the opening sentence.')
      expect(result.openingSentenceLine).toBe(3)
    })

    test('handles multi-line paragraph', () => {
      const content = `# My Idea

This is a long opening
sentence that spans multiple lines.
`
      const result = parseArtifact('/path/to/file.md', content)
      expect(result.openingSentence).toBe(
        'This is a long opening sentence that spans multiple lines.'
      )
      expect(result.openingSentenceLine).toBe(3)
    })

    test('returns null when first content is a heading', () => {
      const content = `# My Idea

## A Section

Some text.
`
      const result = parseArtifact('/path/to/file.md', content)
      expect(result.openingSentence).toBeNull()
      expect(result.openingSentenceLine).toBeNull()
    })

    test('returns null when first content is a list', () => {
      const content = `# My Idea

- A list item
- Another item
`
      const result = parseArtifact('/path/to/file.md', content)
      expect(result.openingSentence).toBeNull()
      expect(result.openingSentenceLine).toBeNull()
    })

    test('returns null when no title exists', () => {
      const content = `This is content without a title.
`
      const result = parseArtifact('/path/to/file.md', content)
      expect(result.openingSentence).toBeNull()
      expect(result.openingSentenceLine).toBeNull()
    })
  })

  describe('section tracking', () => {
    test('extracts sections with correct line numbers', () => {
      const content = `# My Idea

Some description.

## First Section

Content of first section.

## Second Section

Content of second section.
`
      const result = parseArtifact('/path/to/file.md', content)
      expect(result.sections).toHaveLength(2)

      expect(result.sections[0].heading).toBe('First Section')
      expect(result.sections[0].level).toBe(2)
      expect(result.sections[0].startLine).toBe(5)
      expect(result.sections[0].endLine).toBe(7) // Last non-empty line before next section

      expect(result.sections[1].heading).toBe('Second Section')
      expect(result.sections[1].level).toBe(2)
      expect(result.sections[1].startLine).toBe(9)
      expect(result.sections[1].endLine).toBe(11) // Last non-empty line
    })

    test('handles nested sections', () => {
      const content = `# My Idea

## Parent Section

### Child Section

Content.

## Another Parent

More content.
`
      const result = parseArtifact('/path/to/file.md', content)
      expect(result.sections).toHaveLength(3)

      expect(result.sections[0].heading).toBe('Parent Section')
      expect(result.sections[0].level).toBe(2)

      expect(result.sections[1].heading).toBe('Child Section')
      expect(result.sections[1].level).toBe(3)

      expect(result.sections[2].heading).toBe('Another Parent')
      expect(result.sections[2].level).toBe(2)
    })

    test('ignores headings inside code fences', () => {
      const content = `# My Idea

## Real Section

\`\`\`markdown
## Fake Section
\`\`\`

## Another Real Section

Content.
`
      const result = parseArtifact('/path/to/file.md', content)
      expect(result.sections).toHaveLength(2)
      expect(result.sections[0].heading).toBe('Real Section')
      expect(result.sections[1].heading).toBe('Another Real Section')
    })
  })

  describe('link tracking', () => {
    test('extracts all links with line numbers', () => {
      const content = `# My Idea

Check out [this link](https://example.com) for more info.

## References

- [First](./first.md)
- [Second](./second.md)
`
      const result = parseArtifact('/path/to/file.md', content)
      expect(result.allLinks).toHaveLength(3)

      expect(result.allLinks[0]).toEqual({
        text: 'this link',
        target: 'https://example.com',
        line: 3,
      })
      expect(result.allLinks[1]).toEqual({
        text: 'First',
        target: './first.md',
        line: 7,
      })
      expect(result.allLinks[2]).toEqual({
        text: 'Second',
        target: './second.md',
        line: 8,
      })
    })

    test('associates links with their sections', () => {
      const content = `# My Idea

A [global link](./global.md) before sections.

## First Section

A [first link](./first.md) in section one.

## Second Section

A [second link](./second.md) in section two.
`
      const result = parseArtifact('/path/to/file.md', content)

      expect(result.sections[0].links).toHaveLength(1)
      expect(result.sections[0].links[0].text).toBe('first link')

      expect(result.sections[1].links).toHaveLength(1)
      expect(result.sections[1].links[0].text).toBe('second link')
    })

    test('handles multiple links on the same line', () => {
      const content = `# My Idea

See [foo](./foo.md) and [bar](./bar.md) for details.
`
      const result = parseArtifact('/path/to/file.md', content)
      expect(result.allLinks).toHaveLength(2)
      expect(result.allLinks[0].line).toBe(3)
      expect(result.allLinks[1].line).toBe(3)
    })

    test('ignores links inside code fences', () => {
      const content = `# My Idea

\`\`\`markdown
[fake link](./fake.md)
\`\`\`

[real link](./real.md)
`
      const result = parseArtifact('/path/to/file.md', content)
      expect(result.allLinks).toHaveLength(1)
      expect(result.allLinks[0].text).toBe('real link')
    })
  })

  describe('filePath', () => {
    test('stores the provided file path', () => {
      const content = `# My Idea

Some content.
`
      const result = parseArtifact('/project/.dust/ideas/my-idea.md', content)
      expect(result.filePath).toBe('/project/.dust/ideas/my-idea.md')
    })
  })

  describe('real-world artifact parsing', () => {
    test('parses a typical idea file', () => {
      const content = `# Add User Authentication

Implement secure user authentication using JWT tokens.

## Context

Users need to log in to access protected resources.

## Approach

Use the [passport](https://passportjs.org) library with [JWT strategy](./jwt-strategy.md).

## Principles

- [Security First](../principles/security-first.md)
- [DRY](../principles/dry.md)
`
      const result = parseArtifact(
        '/project/.dust/ideas/add-user-auth.md',
        content
      )

      expect(result.title).toBe('Add User Authentication')
      expect(result.titleLine).toBe(1)
      expect(result.openingSentence).toBe(
        'Implement secure user authentication using JWT tokens.'
      )
      expect(result.openingSentenceLine).toBe(3)
      expect(result.sections).toHaveLength(3)
      expect(result.allLinks).toHaveLength(4)

      // Verify section structure
      const principlesSection = result.sections.find(
        s => s.heading === 'Principles'
      )
      expect(principlesSection).toBeDefined()
      expect(principlesSection!.links).toHaveLength(2)
    })

    test('parses a typical task file', () => {
      const content = `# Implement Login Endpoint

Create the POST /api/login endpoint.

## Principles

- [API Design](../principles/api-design.md)

## Blocked By

- [Setup Database](./setup-database.md)

## Definition of Done

- Endpoint accepts email and password
- Returns JWT on success
- Returns 401 on failure
`
      const result = parseArtifact(
        '/project/.dust/tasks/implement-login.md',
        content
      )

      expect(result.title).toBe('Implement Login Endpoint')
      expect(result.sections).toHaveLength(3)

      const blockedBySection = result.sections.find(
        s => s.heading === 'Blocked By'
      )
      expect(blockedBySection).toBeDefined()
      expect(blockedBySection!.links).toHaveLength(1)
      expect(blockedBySection!.links[0].target).toBe('./setup-database.md')
    })
  })

  describe('edge cases', () => {
    test('handles section with only empty lines', () => {
      const content = `# My Idea

## Empty Section


## Next Section

Content here.
`
      const result = parseArtifact('/path/to/file.md', content)
      expect(result.sections).toHaveLength(2)
      // Empty section should have endLine at its start (no non-empty content)
      expect(result.sections[0].heading).toBe('Empty Section')
      expect(result.sections[0].startLine).toBe(3)
      expect(result.sections[0].endLine).toBe(3) // Falls back to start line
    })

    test('handles opening sentence starting with code fence', () => {
      const content = `# My Idea

\`\`\`typescript
const x = 1
\`\`\`
`
      const result = parseArtifact('/path/to/file.md', content)
      expect(result.openingSentence).toBeNull()
      expect(result.openingSentenceLine).toBeNull()
    })

    test('handles opening sentence starting with blockquote', () => {
      const content = `# My Idea

> A quote
`
      const result = parseArtifact('/path/to/file.md', content)
      expect(result.openingSentence).toBeNull()
      expect(result.openingSentenceLine).toBeNull()
    })

    test('handles numbered list as first content', () => {
      const content = `# My Idea

1. First item
2. Second item
`
      const result = parseArtifact('/path/to/file.md', content)
      expect(result.openingSentence).toBeNull()
      expect(result.openingSentenceLine).toBeNull()
    })

    test('handles file with only blank lines after section', () => {
      const content = `# Title

## Section


`
      const result = parseArtifact('/path/to/file.md', content)
      expect(result.sections).toHaveLength(1)
      // Section contains only blank lines, so endLine falls back
      expect(result.sections[0].endLine).toBe(3) // Falls back to section start
    })
  })
})
