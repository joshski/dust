import { describe, expect, test } from 'vitest'
import { extractOpeningSentence, extractTitle } from './markdown-utilities'

describe('extractTitle', () => {
  test('extracts title from H1 heading', () => {
    expect(extractTitle('# My Title')).toBe('My Title')
  })

  test('returns null if no H1 heading', () => {
    expect(extractTitle('No heading here')).toBeNull()
  })

  test('handles H1 not at start of file', () => {
    expect(extractTitle('Some text\n# My Title\nMore text')).toBe('My Title')
  })
})

describe('extractOpeningSentence', () => {
  test('extracts first sentence ending with period', () => {
    const content = '# Title\n\nThis is the opening sentence. More text here.'
    expect(extractOpeningSentence(content)).toBe(
      'This is the opening sentence.'
    )
  })

  test('extracts first sentence ending with question mark', () => {
    const content = '# Title\n\nIs this a question? Yes it is.'
    expect(extractOpeningSentence(content)).toBe('Is this a question?')
  })

  test('extracts first sentence ending with exclamation', () => {
    const content = '# Title\n\nThis is exciting! Really great.'
    expect(extractOpeningSentence(content)).toBe('This is exciting!')
  })

  test('returns null when no H1 heading exists', () => {
    const content = 'No heading\n\nThis is the opening sentence.'
    expect(extractOpeningSentence(content)).toBeNull()
  })

  test('returns null when first non-blank line is another heading', () => {
    const content = '# Title\n\n## Subtitle\n\nOpening sentence.'
    expect(extractOpeningSentence(content)).toBeNull()
  })

  test('returns null when first non-blank line is a list item', () => {
    const content = '# Title\n\n- List item\n\nOpening sentence.'
    expect(extractOpeningSentence(content)).toBeNull()
  })

  test('returns null when first non-blank line starts with asterisk list', () => {
    const content = '# Title\n\n* List item'
    expect(extractOpeningSentence(content)).toBeNull()
  })

  test('returns null when first non-blank line starts with plus list', () => {
    const content = '# Title\n\n+ List item'
    expect(extractOpeningSentence(content)).toBeNull()
  })

  test('returns null when first non-blank line is numbered list', () => {
    const content = '# Title\n\n1. Numbered item'
    expect(extractOpeningSentence(content)).toBeNull()
  })

  test('returns null when first non-blank line is code block', () => {
    const content = '# Title\n\n```\ncode\n```'
    expect(extractOpeningSentence(content)).toBeNull()
  })

  test('returns null when first non-blank line is blockquote', () => {
    const content = '# Title\n\n> Quote here'
    expect(extractOpeningSentence(content)).toBeNull()
  })

  test('returns null when paragraph has no sentence-ending punctuation', () => {
    const content = '# Title\n\nThis has no sentence ending'
    expect(extractOpeningSentence(content)).toBeNull()
  })

  test('handles multi-line paragraphs', () => {
    const content =
      '# Title\n\nThis is the first part\nand continues here. More text.'
    expect(extractOpeningSentence(content)).toBe(
      'This is the first part and continues here.'
    )
  })

  test('handles multiple blank lines after heading', () => {
    const content = '# Title\n\n\n\nOpening sentence here.'
    expect(extractOpeningSentence(content)).toBe('Opening sentence here.')
  })

  test('returns null when no content after H1', () => {
    const content = '# Title'
    expect(extractOpeningSentence(content)).toBeNull()
  })

  test('returns null when only blank lines after H1', () => {
    const content = '# Title\n\n\n'
    expect(extractOpeningSentence(content)).toBeNull()
  })

  test('stops at blank line when collecting paragraph', () => {
    const content =
      '# Title\n\nFirst paragraph. Has sentence.\n\nSecond paragraph.'
    expect(extractOpeningSentence(content)).toBe('First paragraph.')
  })

  test('stops at heading when collecting multi-line paragraph', () => {
    const content = '# Title\n\nThis is the first part\n## Next Section'
    expect(extractOpeningSentence(content)).toBeNull()
  })

  test('stops at code block when collecting multi-line paragraph', () => {
    const content = '# Title\n\nThis is the first part\n```\ncode\n```'
    expect(extractOpeningSentence(content)).toBeNull()
  })

  test('stops at blockquote when collecting multi-line paragraph', () => {
    const content = '# Title\n\nThis is the first part\n> quote'
    expect(extractOpeningSentence(content)).toBeNull()
  })
})
