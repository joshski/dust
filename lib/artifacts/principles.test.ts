import { describe, expect, test } from 'vitest'
import { createFileSystemEmulator } from '../filesystem/emulator'
import { parsePrinciple } from './principles'

describe('parsePrinciple', () => {
  test('parses a principle file with title and content', async () => {
    const fileSystem = createFileSystemEmulator(
      {},
      {
        '.dust/principles/my-principle.md':
          '# My Principle\n\nThis is the principle description.',
      }
    )

    const principle = await parsePrinciple(fileSystem, '.dust', 'my-principle')

    expect(principle.slug).toBe('my-principle')
    expect(principle.title).toBe('My Principle')
    expect(principle.content).toBe(
      '# My Principle\n\nThis is the principle description.'
    )
    expect(principle.parentPrinciple).toBeNull()
    expect(principle.subPrinciples).toEqual([])
  })

  test('extracts parent principle link', async () => {
    const content = `# Child Principle

Description here.

## Parent Principle

- [Parent Name](../principles/parent-principle.md)
`
    const fileSystem = createFileSystemEmulator(
      {},
      { '.dust/principles/child.md': content }
    )

    const principle = await parsePrinciple(fileSystem, '.dust', 'child')

    expect(principle.parentPrinciple).toBe('parent-principle')
  })

  test('extracts sub-principles links', async () => {
    const content = `# Parent Principle

Description here.

## Sub-Principles

- [First Child](../principles/first-child.md)
- [Second Child](second-child.md)
`
    const fileSystem = createFileSystemEmulator(
      {},
      { '.dust/principles/parent.md': content }
    )

    const principle = await parsePrinciple(fileSystem, '.dust', 'parent')

    expect(principle.subPrinciples).toEqual(['first-child', 'second-child'])
  })

  test('returns null for parent when multiple links in Parent Principle section', async () => {
    const content = `# Principle

## Parent Principle

- [One](one.md)
- [Two](two.md)
`
    const fileSystem = createFileSystemEmulator(
      {},
      { '.dust/principles/test.md': content }
    )

    const principle = await parsePrinciple(fileSystem, '.dust', 'test')

    expect(principle.parentPrinciple).toBeNull()
  })

  test('throws when principle file does not exist', async () => {
    const fileSystem = createFileSystemEmulator({})

    await expect(
      parsePrinciple(fileSystem, '.dust', 'nonexistent')
    ).rejects.toThrow('Principle not found: "nonexistent"')
  })

  test('uses slug as fallback title when principle file has no title', async () => {
    const fileSystem = createFileSystemEmulator(
      {},
      {
        '.dust/principles/no-title.md': `No title here, just content.

## Parent Principle

- (none)

## Sub-Principles

- (none)
`,
      }
    )

    const principle = await parsePrinciple(fileSystem, '.dust', 'no-title')
    expect(principle.title).toBe('no-title')
    expect(principle.slug).toBe('no-title')
  })

  test('stops extracting links at next heading', async () => {
    const content = `# Principle

## Sub-Principles

- [Child](child.md)

## Other Section

- [Not a child](not-child.md)
`
    const fileSystem = createFileSystemEmulator(
      {},
      { '.dust/principles/test.md': content }
    )

    const principle = await parsePrinciple(fileSystem, '.dust', 'test')

    expect(principle.subPrinciples).toEqual(['child'])
  })
})
