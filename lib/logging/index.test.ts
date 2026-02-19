import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { stubEnv } from '../test/test-utilities'
import { _reset, createLogger, isEnabled } from './index'

beforeEach(() => {
  _reset()
})

afterEach(() => {
  _reset()
})

function fakeSink(lines: string[]) {
  return { write: (line: string) => lines.push(line) }
}

describe('createLogger', () => {
  test('does not write when DEBUG is not set', () => {
    return stubEnv('DEBUG', undefined, () => {
      const lines: string[] = []
      const log = createLogger('dust.test', fakeSink(lines))
      log('hello')
      expect(lines).toHaveLength(0)
    })
  })

  test('writes when DEBUG=*', () => {
    return stubEnv('DEBUG', '*', () => {
      const lines: string[] = []
      const log = createLogger('dust.test', fakeSink(lines))
      log('hello world')
      expect(lines).toHaveLength(1)
      expect(lines[0]).toContain('[dust.test]')
      expect(lines[0]).toContain('hello world')
    })
  })

  test('includes ISO timestamp', () => {
    return stubEnv('DEBUG', '*', () => {
      const lines: string[] = []
      const log = createLogger('dust.foo', fakeSink(lines))
      log('msg')
      expect(lines[0]).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    })
  })

  test('matches exact logger name', () => {
    return stubEnv('DEBUG', 'dust.foo', () => {
      const lines: string[] = []
      const fooLog = createLogger('dust.foo', fakeSink(lines))
      const barLog = createLogger('dust.bar', fakeSink(lines))
      fooLog('yes')
      barLog('no')
      expect(lines).toHaveLength(1)
      expect(lines[0]).toContain('[dust.foo]')
    })
  })

  test('matches multiple comma-separated names', () => {
    return stubEnv('DEBUG', 'dust.foo,dust.bar', () => {
      const lines: string[] = []
      const sink = fakeSink(lines)
      createLogger('dust.foo', sink)('f')
      createLogger('dust.bar', sink)('b')
      createLogger('dust.baz', sink)('z')
      expect(lines).toHaveLength(2)
      expect(lines[0]).toContain('[dust.foo]')
      expect(lines[1]).toContain('[dust.bar]')
    })
  })

  test('supports wildcard at end', () => {
    return stubEnv('DEBUG', 'dust.bucket.*', () => {
      const lines: string[] = []
      const sink = fakeSink(lines)
      createLogger('dust.bucket.repository-loop', sink)('bl')
      createLogger('dust.bucket.repository', sink)('br')
      createLogger('dust.cli.commands.loop', sink)('l')
      expect(lines).toHaveLength(2)
      expect(lines[0]).toContain('[dust.bucket.repository-loop]')
      expect(lines[1]).toContain('[dust.bucket.repository]')
    })
  })

  test('supports wildcard at beginning', () => {
    return stubEnv('DEBUG', '*loop', () => {
      const lines: string[] = []
      const sink = fakeSink(lines)
      createLogger('dust.bucket.repository-loop', sink)('bl')
      createLogger('dust.cli.commands.loop', sink)('l')
      createLogger('dust.cli.commands.bucket', sink)('b')
      expect(lines).toHaveLength(2)
      expect(lines[0]).toContain('[dust.bucket.repository-loop]')
      expect(lines[1]).toContain('[dust.cli.commands.loop]')
    })
  })

  test('mixed patterns: exact and wildcard', () => {
    return stubEnv('DEBUG', 'dust.foo,*bar', () => {
      const lines: string[] = []
      const sink = fakeSink(lines)
      createLogger('dust.foo', sink)('f')
      createLogger('dust.foo.bar', sink)('fb')
      createLogger('dust.baz', sink)('z')
      expect(lines).toHaveLength(2)
      expect(lines[0]).toContain('[dust.foo]')
      expect(lines[1]).toContain('[dust.foo.bar]')
    })
  })

  test('serializes non-string arguments as JSON', () => {
    return stubEnv('DEBUG', '*', () => {
      const lines: string[] = []
      const log = createLogger('dust.test', fakeSink(lines))
      log('data:', { count: 42 })
      expect(lines[0]).toContain('data: {"count":42}')
    })
  })

  test('writes each call on its own line', () => {
    return stubEnv('DEBUG', '*', () => {
      const lines: string[] = []
      const log = createLogger('dust.test', fakeSink(lines))
      log('first')
      log('second')
      expect(lines).toHaveLength(2)
      expect(lines[0]).toContain('first')
      expect(lines[1]).toContain('second')
    })
  })
})

describe('isEnabled', () => {
  test('returns false when DEBUG is not set', () => {
    return stubEnv('DEBUG', undefined, () => {
      expect(isEnabled('anything')).toBe(false)
    })
  })

  test('returns true for matching pattern', () => {
    return stubEnv('DEBUG', 'dust.foo,dust.bar', () => {
      expect(isEnabled('dust.foo')).toBe(true)
      expect(isEnabled('dust.bar')).toBe(true)
      expect(isEnabled('dust.baz')).toBe(false)
    })
  })

  test('returns true for wildcard match', () => {
    return stubEnv('DEBUG', '*', () => {
      expect(isEnabled('anything')).toBe(true)
    })
  })
})
