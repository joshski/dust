import { describe, expect, test } from 'vitest'
import { formatLine, matchesAny, parsePatterns } from './match'

describe('parsePatterns', () => {
  test('returns empty array for undefined', () => {
    expect(parsePatterns(undefined)).toEqual([])
  })

  test('returns empty array for empty string', () => {
    expect(parsePatterns('')).toEqual([])
  })

  test('returns empty array for whitespace-only', () => {
    expect(parsePatterns('  , , ')).toEqual([])
  })

  test('parses single exact name', () => {
    const patterns = parsePatterns('dust.bucket')
    expect(patterns).toHaveLength(1)
    expect(patterns[0].test('dust.bucket')).toBe(true)
    expect(patterns[0].test('dust.loop')).toBe(false)
  })

  test('parses comma-separated names', () => {
    const patterns = parsePatterns('dust.bucket,dust.loop')
    expect(patterns).toHaveLength(2)
  })

  test('trims whitespace around expressions', () => {
    const patterns = parsePatterns(' dust.bucket , dust.loop ')
    expect(patterns).toHaveLength(2)
    expect(patterns[0].test('dust.bucket')).toBe(true)
    expect(patterns[1].test('dust.loop')).toBe(true)
  })

  test('converts * to .* wildcard', () => {
    const patterns = parsePatterns('dust.bucket.*')
    expect(patterns[0].test('dust.bucket.loop')).toBe(true)
    expect(patterns[0].test('dust.bucket.ws')).toBe(true)
    expect(patterns[0].test('dust.loop')).toBe(false)
  })

  test('escapes regex special characters in name', () => {
    const patterns = parsePatterns('dust.bucket')
    // The dot should be literal, not match any character
    expect(patterns[0].test('dustXbucket')).toBe(false)
    expect(patterns[0].test('dust.bucket')).toBe(true)
  })
})

describe('matchesAny', () => {
  test('returns false for empty patterns', () => {
    expect(matchesAny('anything', [])).toBe(false)
  })

  test('matches exact name', () => {
    const patterns = parsePatterns('dust.bucket')
    expect(matchesAny('dust.bucket', patterns)).toBe(true)
    expect(matchesAny('dust.loop', patterns)).toBe(false)
  })

  test('matches wildcard at end', () => {
    const patterns = parsePatterns('dust.bucket.*')
    expect(matchesAny('dust.bucket.loop', patterns)).toBe(true)
    expect(matchesAny('dust.bucket.repository', patterns)).toBe(true)
    expect(matchesAny('dust.bucket', patterns)).toBe(false)
  })

  test('matches wildcard at beginning', () => {
    const patterns = parsePatterns('*loop')
    expect(matchesAny('dust.bucket.repository-loop', patterns)).toBe(true)
    expect(matchesAny('dust.cli.commands.loop', patterns)).toBe(true)
    expect(matchesAny('dust.bucket', patterns)).toBe(false)
  })

  test('matches * alone (everything)', () => {
    const patterns = parsePatterns('*')
    expect(matchesAny('anything', patterns)).toBe(true)
    expect(matchesAny('dust.bucket.loop', patterns)).toBe(true)
  })

  test('matches any of multiple patterns', () => {
    const patterns = parsePatterns('dust.bucket,*loop')
    expect(matchesAny('dust.bucket', patterns)).toBe(true)
    expect(matchesAny('dust.cli.commands.loop', patterns)).toBe(true)
    expect(matchesAny('dust.cli.commands.bucket', patterns)).toBe(false)
  })
})

describe('formatLine', () => {
  test('includes logger name in brackets', () => {
    const line = formatLine('dust.bucket', ['hello'])
    expect(line).toContain('[dust.bucket]')
  })

  test('includes message text', () => {
    const line = formatLine('test', ['hello world'])
    expect(line).toContain('hello world')
  })

  test('starts with ISO timestamp', () => {
    const line = formatLine('test', ['msg'])
    expect(line).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
  })

  test('ends with newline', () => {
    const line = formatLine('test', ['msg'])
    expect(line.endsWith('\n')).toBe(true)
  })

  test('joins multiple string arguments with space', () => {
    const line = formatLine('test', ['hello', 'world'])
    expect(line).toContain('hello world')
  })

  test('serializes non-string arguments as JSON', () => {
    const line = formatLine('test', ['data:', { count: 42 }])
    expect(line).toContain('data: {"count":42}')
  })
})
