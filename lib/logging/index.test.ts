import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { stubEnv } from '../test/test-utilities'
import { _reset, createLogger, enableFileLogs, isEnabled } from './index'

beforeEach(() => {
  _reset()
})

afterEach(() => {
  _reset()
  vi.restoreAllMocks()
})

function fakeSink(lines: string[]) {
  return { write: (line: string) => lines.push(line) }
}

describe('createLogger — stdout (DEBUG)', () => {
  test('does not write to stdout when DEBUG is not set', () => {
    return stubEnv('DEBUG', undefined, () => {
      const spy = vi
        .spyOn(process.stdout, 'write')
        .mockImplementation(() => true)
      const log = createLogger('dust.test')
      log('hello')
      expect(spy).not.toHaveBeenCalled()
    })
  })

  test('writes to stdout when DEBUG=*', () => {
    return stubEnv('DEBUG', '*', () => {
      const lines: string[] = []
      vi.spyOn(process.stdout, 'write').mockImplementation(line => {
        lines.push(String(line))
        return true
      })
      const log = createLogger('dust.test')
      log('hello world')
      expect(lines).toHaveLength(1)
      expect(lines[0]).toContain('[dust.test]')
      expect(lines[0]).toContain('hello world')
    })
  })

  test('includes ISO timestamp in stdout output', () => {
    return stubEnv('DEBUG', '*', () => {
      const lines: string[] = []
      vi.spyOn(process.stdout, 'write').mockImplementation(line => {
        lines.push(String(line))
        return true
      })
      const log = createLogger('dust.foo')
      log('msg')
      expect(lines[0]).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    })
  })

  test('matches exact logger name', () => {
    return stubEnv('DEBUG', 'dust.foo', () => {
      const lines: string[] = []
      vi.spyOn(process.stdout, 'write').mockImplementation(line => {
        lines.push(String(line))
        return true
      })
      const fooLog = createLogger('dust.foo')
      const barLog = createLogger('dust.bar')
      fooLog('yes')
      barLog('no')
      expect(lines).toHaveLength(1)
      expect(lines[0]).toContain('[dust.foo]')
    })
  })

  test('matches multiple comma-separated names', () => {
    return stubEnv('DEBUG', 'dust.foo,dust.bar', () => {
      const lines: string[] = []
      vi.spyOn(process.stdout, 'write').mockImplementation(line => {
        lines.push(String(line))
        return true
      })
      createLogger('dust.foo')('f')
      createLogger('dust.bar')('b')
      createLogger('dust.baz')('z')
      expect(lines).toHaveLength(2)
      expect(lines[0]).toContain('[dust.foo]')
      expect(lines[1]).toContain('[dust.bar]')
    })
  })

  test('supports wildcard at end', () => {
    return stubEnv('DEBUG', 'dust.bucket.*', () => {
      const lines: string[] = []
      vi.spyOn(process.stdout, 'write').mockImplementation(line => {
        lines.push(String(line))
        return true
      })
      createLogger('dust.bucket.repository-loop')('bl')
      createLogger('dust.bucket.repository')('br')
      createLogger('dust.cli.commands.loop')('l')
      expect(lines).toHaveLength(2)
      expect(lines[0]).toContain('[dust.bucket.repository-loop]')
      expect(lines[1]).toContain('[dust.bucket.repository]')
    })
  })

  test('supports wildcard at beginning', () => {
    return stubEnv('DEBUG', '*loop', () => {
      const lines: string[] = []
      vi.spyOn(process.stdout, 'write').mockImplementation(line => {
        lines.push(String(line))
        return true
      })
      createLogger('dust.bucket.repository-loop')('bl')
      createLogger('dust.cli.commands.loop')('l')
      createLogger('dust.cli.commands.bucket')('b')
      expect(lines).toHaveLength(2)
      expect(lines[0]).toContain('[dust.bucket.repository-loop]')
      expect(lines[1]).toContain('[dust.cli.commands.loop]')
    })
  })

  test('mixed patterns: exact and wildcard', () => {
    return stubEnv('DEBUG', 'dust.foo,*bar', () => {
      const lines: string[] = []
      vi.spyOn(process.stdout, 'write').mockImplementation(line => {
        lines.push(String(line))
        return true
      })
      createLogger('dust.foo')('f')
      createLogger('dust.foo.bar')('fb')
      createLogger('dust.baz')('z')
      expect(lines).toHaveLength(2)
      expect(lines[0]).toContain('[dust.foo]')
      expect(lines[1]).toContain('[dust.foo.bar]')
    })
  })

  test('serializes non-string arguments as JSON', () => {
    return stubEnv('DEBUG', '*', () => {
      const lines: string[] = []
      vi.spyOn(process.stdout, 'write').mockImplementation(line => {
        lines.push(String(line))
        return true
      })
      const log = createLogger('dust.test')
      log('data:', { count: 42 })
      expect(lines[0]).toContain('data: {"count":42}')
    })
  })

  test('writes each call on its own line', () => {
    return stubEnv('DEBUG', '*', () => {
      const lines: string[] = []
      vi.spyOn(process.stdout, 'write').mockImplementation(line => {
        lines.push(String(line))
        return true
      })
      const log = createLogger('dust.test')
      log('first')
      log('second')
      expect(lines).toHaveLength(2)
      expect(lines[0]).toContain('first')
      expect(lines[1]).toContain('second')
    })
  })
})

describe('enableFileLogs', () => {
  test('writes to file sink when enableFileLogs is called', () => {
    return stubEnv('DEBUG', undefined, () => {
      const lines: string[] = []
      enableFileLogs('test', fakeSink(lines))
      const log = createLogger('dust.test')
      log('hello')
      expect(lines).toHaveLength(1)
      expect(lines[0]).toContain('[dust.test]')
      expect(lines[0]).toContain('hello')
    })
  })

  test('does not write to file sink when enableFileLogs is not called', () => {
    return stubEnv('DEBUG', undefined, () => {
      const lines: string[] = []
      const log = createLogger('dust.test')
      log('hello')
      expect(lines).toHaveLength(0)
    })
  })

  test('file logging is not filtered by DEBUG pattern', () => {
    return stubEnv('DEBUG', 'dust.other', () => {
      const lines: string[] = []
      enableFileLogs('test', fakeSink(lines))
      const log = createLogger('dust.test')
      log('message')
      // File sink gets it even though DEBUG does not match 'dust.test'
      expect(lines).toHaveLength(1)
    })
  })

  test('file logging and stdout logging work simultaneously', () => {
    return stubEnv('DEBUG', '*', () => {
      const fileLines: string[] = []
      const stdoutLines: string[] = []
      enableFileLogs('test', fakeSink(fileLines))
      vi.spyOn(process.stdout, 'write').mockImplementation(line => {
        stdoutLines.push(String(line))
        return true
      })
      const log = createLogger('dust.test')
      log('both')
      expect(fileLines).toHaveLength(1)
      expect(stdoutLines).toHaveLength(1)
      expect(fileLines[0]).toContain('both')
      expect(stdoutLines[0]).toContain('both')
    })
  })

  test('stdout only gets matching loggers when file gets all', () => {
    return stubEnv('DEBUG', 'dust.foo', () => {
      const fileLines: string[] = []
      const stdoutLines: string[] = []
      enableFileLogs('test', fakeSink(fileLines))
      vi.spyOn(process.stdout, 'write').mockImplementation(line => {
        stdoutLines.push(String(line))
        return true
      })
      createLogger('dust.foo')('matches')
      createLogger('dust.bar')('no-match')
      expect(fileLines).toHaveLength(2)
      expect(stdoutLines).toHaveLength(1)
      expect(stdoutLines[0]).toContain('[dust.foo]')
    })
  })

  test('sets DUST_LOG_FILE to scope path when not already set', () => {
    return stubEnv('DUST_LOG_FILE', undefined, () => {
      enableFileLogs('loop', fakeSink([]))
      expect(process.env.DUST_LOG_FILE).toContain('loop.log')
      expect(process.env.DUST_LOG_FILE).toContain('.dust/logs')
    })
  })

  test('does not override DUST_LOG_FILE when already set (subprocess routing)', () => {
    return stubEnv('DUST_LOG_FILE', '/inherited/check.log', () => {
      enableFileLogs('loop', fakeSink([]))
      expect(process.env.DUST_LOG_FILE).toBe('/inherited/check.log')
    })
  })

  test('_reset clears DUST_LOG_FILE when this module set it', () => {
    return stubEnv('DUST_LOG_FILE', undefined, () => {
      enableFileLogs('loop', fakeSink([]))
      expect(process.env.DUST_LOG_FILE).toBeDefined()
      _reset()
      expect(process.env.DUST_LOG_FILE).toBeUndefined()
    })
  })

  test('_reset does not clear DUST_LOG_FILE when inherited', () => {
    return stubEnv('DUST_LOG_FILE', '/inherited/check.log', () => {
      enableFileLogs('loop', fakeSink([]))
      _reset()
      expect(process.env.DUST_LOG_FILE).toBe('/inherited/check.log')
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
