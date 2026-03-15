import { describe, expect, test } from 'vitest'
import { parseMaxIterations } from './parse-args'

describe('parseMaxIterations', () => {
  test('returns default when no arguments', () => {
    expect(parseMaxIterations([])).toBe(10)
  })

  test('parses valid positive integer', () => {
    expect(parseMaxIterations(['5'])).toBe(5)
    expect(parseMaxIterations(['100'])).toBe(100)
  })

  test('returns default for invalid input', () => {
    expect(parseMaxIterations(['abc'])).toBe(10)
    expect(parseMaxIterations(['0'])).toBe(10)
    expect(parseMaxIterations(['-5'])).toBe(10)
  })
})
