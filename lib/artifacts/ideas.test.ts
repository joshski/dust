import { describe, expect, test } from 'vitest'
import { createFileSystemEmulator } from '../test/test-utilities'
import { parseIdea, parseOpenQuestions } from './ideas'

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
