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
    const result = parseLoopArgs([])
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.args).toEqual({
        maxIterations: 10,
        docker: false,
        appleContainer: false,
      })
    }
  })

  test('parses --docker flag', () => {
    const result = parseLoopArgs(['--docker'])
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.args).toEqual({
        maxIterations: 10,
        docker: true,
        appleContainer: false,
      })
    }
  })

  test('parses --apple-container flag', () => {
    const result = parseLoopArgs(['--apple-container'])
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.args).toEqual({
        maxIterations: 10,
        docker: false,
        appleContainer: true,
      })
    }
  })

  test('parses max iterations with --docker flag', () => {
    const result = parseLoopArgs(['5', '--docker'])
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.args).toEqual({
        maxIterations: 5,
        docker: true,
        appleContainer: false,
      })
    }
  })

  test('parses --docker flag before max iterations', () => {
    const result = parseLoopArgs(['--docker', '5'])
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.args).toEqual({
        maxIterations: 5,
        docker: true,
        appleContainer: false,
      })
    }
  })

  test('parses max iterations without --docker flag', () => {
    const result = parseLoopArgs(['20'])
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.args).toEqual({
        maxIterations: 20,
        docker: false,
        appleContainer: false,
      })
    }
  })

  test('returns error when both --docker and --apple-container are set', () => {
    const result = parseLoopArgs(['--docker', '--apple-container'])
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe(
        'Cannot use both --docker and --apple-container. Choose one container runtime.'
      )
    }
  })

  test('parses max iterations with --apple-container flag', () => {
    const result = parseLoopArgs(['--apple-container', '15'])
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.args).toEqual({
        maxIterations: 15,
        docker: false,
        appleContainer: true,
      })
    }
  })
})
