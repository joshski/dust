import { describe, expect, test } from 'vitest'
import { parseLoopArgs, parseMaxIterations } from './parse-args'

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

describe('parseLoopArgs', () => {
  test('returns default values when no arguments', () => {
    expect(parseLoopArgs([])).toEqual({ maxIterations: 10, docker: false })
  })

  test('parses --docker flag', () => {
    expect(parseLoopArgs(['--docker'])).toEqual({
      maxIterations: 10,
      docker: true,
    })
  })

  test('parses max iterations with --docker flag', () => {
    expect(parseLoopArgs(['5', '--docker'])).toEqual({
      maxIterations: 5,
      docker: true,
    })
  })

  test('parses --docker flag before max iterations', () => {
    expect(parseLoopArgs(['--docker', '5'])).toEqual({
      maxIterations: 5,
      docker: true,
    })
  })

  test('parses max iterations without --docker flag', () => {
    expect(parseLoopArgs(['20'])).toEqual({
      maxIterations: 20,
      docker: false,
    })
  })
})
