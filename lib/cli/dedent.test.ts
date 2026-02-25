import { describe, expect, test } from 'vitest'
import { dedent } from './dedent'

describe('dedent', () => {
  test('removes common leading whitespace from multi-line strings', () => {
    const result = dedent`
      Hello
      World
    `
    expect(result).toBe('Hello\nWorld')
  })

  test('preserves relative indentation', () => {
    const result = dedent`
      Parent
        Child
          Grandchild
    `
    expect(result).toBe('Parent\n  Child\n    Grandchild')
  })

  test('handles single line strings', () => {
    const result = dedent`Hello World`
    expect(result).toBe('Hello World')
  })

  test('handles empty strings', () => {
    const result = dedent``
    expect(result).toBe('')
  })

  test('handles strings with no indentation', () => {
    const result = dedent`No indent
Second line`
    expect(result).toBe('No indent\nSecond line')
  })

  test('interpolates values', () => {
    const name = 'World'
    const result = dedent`
      Hello ${name}
      Goodbye ${name}
    `
    expect(result).toBe('Hello World\nGoodbye World')
  })

  test('handles blank lines in the middle', () => {
    const result = dedent`
      First

      Third
    `
    expect(result).toBe('First\n\nThird')
  })

  test('ignores blank lines when calculating indent', () => {
    const result = dedent`
        First

        Third
    `
    expect(result).toBe('First\n\nThird')
  })
})
