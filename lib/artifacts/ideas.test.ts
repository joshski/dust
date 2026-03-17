import { describe, expect, test } from 'vitest'
import { createFileSystemEmulator } from '../test/test-utilities'
import {
  ideaContentToMarkdown,
  parseIdea,
  parseIdeaContent,
  parseOpenQuestions,
} from './ideas'

describe('parseOpenQuestions', () => {
  test('returns empty array when there is no Open Questions section', () => {
    const content = `# My Idea

A great idea.

## Concept

Some concept details.
`
    expect(parseOpenQuestions(content)).toEqual([])
  })

  test('parses a single question with multiple options', () => {
    const content = `# My Idea

A great idea.

## Open Questions

### Should we use WebSockets?

#### Yes

Lower latency and real-time updates.

#### No

Simpler architecture with polling.
`
    const questions = parseOpenQuestions(content)
    expect(questions).toEqual([
      {
        question: 'Should we use WebSockets?',
        options: [
          {
            name: 'Yes',
            description: 'Lower latency and real-time updates.',
          },
          {
            name: 'No',
            description: 'Simpler architecture with polling.',
          },
        ],
      },
    ])
  })

  test('parses multiple questions', () => {
    const content = `# My Idea

A great idea.

## Open Questions

### Should we use WebSockets?

#### Yes

Real-time updates.

#### No

Polling is simpler.

### How should errors be handled?

#### Retry automatically

Resilient but complex.

#### Fail fast

Simple but fragile.

#### Queue for later

Deferred processing.
`
    const questions = parseOpenQuestions(content)
    expect(questions).toHaveLength(2)
    expect(questions[0].question).toBe('Should we use WebSockets?')
    expect(questions[0].options).toHaveLength(2)
    expect(questions[1].question).toBe('How should errors be handled?')
    expect(questions[1].options).toHaveLength(3)
  })

  test('preserves multi-line option descriptions', () => {
    const content = `# My Idea

A great idea.

## Open Questions

### Which approach?

#### Option A

First paragraph of discussion.

Second paragraph with more detail.

- A bullet point
- Another bullet point
`
    const questions = parseOpenQuestions(content)
    expect(questions[0].options[0].description).toBe(
      `First paragraph of discussion.

Second paragraph with more detail.

- A bullet point
- Another bullet point`
    )
  })

  test('stops parsing at the next h2 section', () => {
    const content = `# My Idea

A great idea.

## Open Questions

### Should we cache?

#### Yes

Faster responses.

#### No

Simpler code.

## Implementation Notes

This section is not part of Open Questions.
`
    const questions = parseOpenQuestions(content)
    expect(questions).toHaveLength(1)
    expect(questions[0].options).toHaveLength(2)
  })

  test('handles question with no options as empty options array', () => {
    const content = `# My Idea

## Open Questions

### What color should it be?
`
    const questions = parseOpenQuestions(content)
    expect(questions).toEqual([
      {
        question: 'What color should it be?',
        options: [],
      },
    ])
  })

  test('ignores headings inside code fences', () => {
    const content = `# My Idea

A great idea.

## Open Questions

### Real question?

#### Real option

Here is an example:

\`\`\`markdown
## Open Questions

### Fake question?

#### Fake option

Not a real option.
\`\`\`

#### Another real option

This is real.
`
    const questions = parseOpenQuestions(content)
    expect(questions).toHaveLength(1)
    expect(questions[0].question).toBe('Real question?')
    expect(questions[0].options).toHaveLength(2)
    expect(questions[0].options[0].name).toBe('Real option')
    expect(questions[0].options[0].description).toContain('Here is an example:')
    expect(questions[0].options[0].description).toContain('### Fake question?')
    expect(questions[0].options[1].name).toBe('Another real option')
  })

  test('does not treat code fence as opening a new section', () => {
    const content = `# My Idea

\`\`\`markdown
## Open Questions

### Not a real question?

#### Not a real option
\`\`\`
`
    expect(parseOpenQuestions(content)).toEqual([])
  })

  test('ignores orphan options that appear before any question', () => {
    const content = `# My Idea

## Open Questions

#### Orphan option

This option has no parent question.

### Actual question?

#### Valid option

This is a real option.
`
    const questions = parseOpenQuestions(content)
    expect(questions).toHaveLength(1)
    expect(questions[0].question).toBe('Actual question?')
    expect(questions[0].options).toHaveLength(1)
    expect(questions[0].options[0].name).toBe('Valid option')
  })
})

describe('parseIdea', () => {
  test('parses a simple idea without open questions', async () => {
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          ideas: {
            'my-idea.md': '# My Idea\n\nDo something useful.\n',
          },
        },
      },
    })

    const idea = await parseIdea(fileSystem, '/project/.dust', 'my-idea')
    expect(idea.slug).toBe('my-idea')
    expect(idea.title).toBe('My Idea')
    expect(idea.openingSentence).toBe('Do something useful.')
    expect(idea.openQuestions).toEqual([])
  })

  test('parses an idea with open questions', async () => {
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          ideas: {
            'my-idea.md': `# My Idea

Do something useful.

## Open Questions

### Should we use REST or GraphQL?

#### REST

Simple and well-understood.

#### GraphQL

Flexible queries.
`,
          },
        },
      },
    })

    const idea = await parseIdea(fileSystem, '/project/.dust', 'my-idea')
    expect(idea.openQuestions).toHaveLength(1)
    expect(idea.openQuestions[0].question).toBe(
      'Should we use REST or GraphQL?'
    )
    expect(idea.openQuestions[0].options).toHaveLength(2)
    expect(idea.openQuestions[0].options[0].name).toBe('REST')
    expect(idea.openQuestions[0].options[1].name).toBe('GraphQL')
  })

  test('includes full markdown content', async () => {
    const content =
      '# My Idea\n\nDo something useful.\n\n## Concept\n\nDetails here.\n'
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          ideas: {
            'my-idea.md': content,
          },
        },
      },
    })

    const idea = await parseIdea(fileSystem, '/project/.dust', 'my-idea')
    expect(idea.content).toBe(content)
  })

  test('throws when idea file does not exist', async () => {
    const fileSystem = createFileSystemEmulator({
      project: { '.dust': { ideas: {} } },
    })

    await expect(
      parseIdea(fileSystem, '/project/.dust', 'nonexistent')
    ).rejects.toThrow(
      'Idea not found: "nonexistent" (expected file at /project/.dust/ideas/nonexistent.md)'
    )
  })

  test('throws when idea file has no title', async () => {
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          ideas: {
            'no-title.md': 'Just some text without a heading.',
          },
        },
      },
    })

    await expect(
      parseIdea(fileSystem, '/project/.dust', 'no-title')
    ).rejects.toThrow(
      'Idea file has no title: /project/.dust/ideas/no-title.md'
    )
  })
})

describe('parseIdeaContent', () => {
  test('extracts title, body, and open questions', () => {
    const markdown = `# My Idea

Some description.

## Motivation

Why we need this.

## Open Questions

### Should we cache?

#### Yes

Faster responses.

#### No

Simpler code.
`
    const result = parseIdeaContent(markdown)
    expect(result.title).toBe('My Idea')
    expect(result.body).toBe(`Some description.

## Motivation

Why we need this.
`)
    expect(result.openQuestions).toHaveLength(1)
    expect(result.openQuestions[0].question).toBe('Should we cache?')
    expect(result.openQuestions[0].options).toHaveLength(2)
  })

  test('returns full body when no Open Questions section', () => {
    const markdown = `# Simple Idea

Just a description.

## Notes

Some notes.
`
    const result = parseIdeaContent(markdown)
    expect(result.title).toBe('Simple Idea')
    expect(result.body).toBe(`Just a description.

## Notes

Some notes.
`)
    expect(result.openQuestions).toEqual([])
  })

  test('handles content with no title', () => {
    const markdown = `Some text without a heading.
`
    const result = parseIdeaContent(markdown)
    expect(result.title).toBeNull()
    expect(result.body).toBe('Some text without a heading.\n')
  })

  test('preserves code fences in body when stripping Open Questions', () => {
    const markdown = `# My Idea

Example:

\`\`\`typescript
const x = 1
\`\`\`

## Open Questions

### Should we cache?

#### Yes

Faster.
`
    const result = parseIdeaContent(markdown)
    expect(result.body).toContain('```typescript')
    expect(result.body).toContain('const x = 1')
    expect(result.body).not.toContain('Open Questions')
  })

  test('handles code fences in Open Questions section', () => {
    const markdown = `# My Idea

Description.

## Open Questions

### Which format?

#### Markdown

Use markdown like this:

\`\`\`markdown
## Example Heading

Some content.
\`\`\`

#### Plain text

Just use plain text.
`
    const result = parseIdeaContent(markdown)
    expect(result.body).toBe('Description.\n')
    expect(result.openQuestions).toHaveLength(1)
    expect(result.openQuestions[0].options[0].description).toContain(
      '## Example Heading'
    )
  })
})

describe('ideaContentToMarkdown', () => {
  test('serializes with open questions', () => {
    const content = {
      title: 'My Idea',
      body: 'Some description.\n\n## Motivation\n\nWhy we need this.',
      openQuestions: [
        {
          question: 'Should we cache?',
          options: [
            { name: 'Yes', description: 'Faster responses.' },
            { name: 'No', description: 'Simpler code.' },
          ],
        },
      ],
    }
    const result = ideaContentToMarkdown(content)
    expect(result).toBe(`# My Idea

Some description.

## Motivation

Why we need this.

## Open Questions

### Should we cache?

#### Yes

Faster responses.

#### No

Simpler code.
`)
  })

  test('serializes without open questions', () => {
    const content = {
      title: 'My Idea',
      body: 'Some description.',
      openQuestions: [
        {
          question: 'Should we cache?',
          options: [{ name: 'Yes', description: 'Faster.' }],
        },
      ],
    }
    const result = ideaContentToMarkdown(content, {
      includeOpenQuestions: false,
    })
    expect(result).toBe(`# My Idea

Some description.
`)
  })

  test('handles empty open questions array', () => {
    const content = {
      title: 'Simple Idea',
      body: 'Just a description.',
      openQuestions: [],
    }
    const result = ideaContentToMarkdown(content)
    expect(result).toBe(`# Simple Idea

Just a description.
`)
  })

  test('handles null title', () => {
    const content = {
      title: null,
      body: 'Body only.',
      openQuestions: [],
    }
    const result = ideaContentToMarkdown(content)
    expect(result).toBe('Body only.\n')
  })

  test('handles empty body', () => {
    const content = {
      title: 'Title Only',
      body: '',
      openQuestions: [],
    }
    const result = ideaContentToMarkdown(content)
    expect(result).toBe('# Title Only\n')
  })

  test('handles options without descriptions', () => {
    const content = {
      title: 'My Idea',
      body: 'Description.',
      openQuestions: [
        {
          question: 'Pick one?',
          options: [
            { name: 'A', description: '' },
            { name: 'B', description: '' },
          ],
        },
      ],
    }
    const result = ideaContentToMarkdown(content)
    expect(result).toContain('#### A\n\n#### B')
  })

  test('round-trips through parse and serialize', () => {
    const original = `# Multi-part Idea

Overview of the idea.

## Background

Some context here.

## Open Questions

### Should we use WebSockets?

#### Yes

Real-time updates.

#### No

Polling is simpler.

### How should errors be handled?

#### Retry automatically

Resilient but complex.

#### Fail fast

Simple but fragile.
`
    const parsed = parseIdeaContent(original)
    const serialized = ideaContentToMarkdown(parsed)
    const reparsed = parseIdeaContent(serialized)

    expect(reparsed.title).toBe(parsed.title)
    expect(reparsed.openQuestions).toEqual(parsed.openQuestions)
  })
})
