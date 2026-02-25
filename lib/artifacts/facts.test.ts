import { describe, expect, test } from 'vitest'
import { createFileSystemEmulator } from '../filesystem/emulator'
import { parseFact } from './facts'

describe('parseFact', () => {
  test('parses a fact file with title and content', async () => {
    const fileSystem = createFileSystemEmulator(
      {},
      {
        '.dust/facts/my-fact.md': '# My Fact\n\nThis is the fact content.',
      }
    )

    const fact = await parseFact(fileSystem, '.dust', 'my-fact')

    expect(fact.slug).toBe('my-fact')
    expect(fact.title).toBe('My Fact')
    expect(fact.content).toBe('# My Fact\n\nThis is the fact content.')
  })

  test('throws when fact file does not exist', async () => {
    const fileSystem = createFileSystemEmulator({})

    await expect(parseFact(fileSystem, '.dust', 'nonexistent')).rejects.toThrow(
      'Fact not found: "nonexistent"'
    )
  })

  test('throws when fact file has no title', async () => {
    const fileSystem = createFileSystemEmulator(
      {},
      {
        '.dust/facts/no-title.md': 'No title here, just content.',
      }
    )

    await expect(parseFact(fileSystem, '.dust', 'no-title')).rejects.toThrow(
      'Fact file has no title'
    )
  })

  test('preserves full content including markdown formatting', async () => {
    const content = `# Formatted Fact

## Section One

Some text with **bold** and *italic*.

- List item 1
- List item 2

\`\`\`js
const code = 'example';
\`\`\`
`
    const fileSystem = createFileSystemEmulator(
      {},
      { '.dust/facts/formatted.md': content }
    )

    const fact = await parseFact(fileSystem, '.dust', 'formatted')

    expect(fact.title).toBe('Formatted Fact')
    expect(fact.content).toBe(content)
  })
})
