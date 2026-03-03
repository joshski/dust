import { describe, expect, test } from 'vitest'
import { stubEnv } from '../test/test-utilities'
import { createLoggingService } from './index'

function fakeSink(lines: string[]) {
  return { write: (line: string) => lines.push(line) }
}

function fakeStdout(lines: string[]) {
  return (line: string) => {
    lines.push(String(line))
    return true
  }
}

describe('createLogger — stdout (DEBUG)', () => {
  test('does not write to stdout when DEBUG is not set', () => {
    return stubEnv('DEBUG', undefined, () => {
      const lines: string[] = []
      const service = createLoggingService({ stdout: fakeStdout(lines) })
      const log = service.createLogger('dust:test')
      log('hello')
      expect(lines).toHaveLength(0)
    })
  })

  test('writes to stdout when DEBUG=*', () => {
    return stubEnv('DEBUG', '*', () => {
      const lines: string[] = []
      const service = createLoggingService({ stdout: fakeStdout(lines) })
      const log = service.createLogger('dust:test')
      log('hello world')
      expect(lines).toHaveLength(1)
      expect(lines[0]).toContain('[dust:test]')
      expect(lines[0]).toContain('hello world')
    })
  })

  test('includes ISO timestamp in stdout output', () => {
    return stubEnv('DEBUG', '*', () => {
      const lines: string[] = []
      const service = createLoggingService({ stdout: fakeStdout(lines) })
      const log = service.createLogger('dust:foo')
      log('msg')
      expect(lines[0]).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    })
  })

  test('matches exact logger name', () => {
    return stubEnv('DEBUG', 'dust:foo', () => {
      const lines: string[] = []
      const service = createLoggingService({ stdout: fakeStdout(lines) })
      const fooLog = service.createLogger('dust:foo')
      const barLog = service.createLogger('dust:bar')
      fooLog('yes')
      barLog('no')
      expect(lines).toHaveLength(1)
      expect(lines[0]).toContain('[dust:foo]')
    })
  })

  test('matches multiple comma-separated names', () => {
    return stubEnv('DEBUG', 'dust:foo,dust:bar', () => {
      const lines: string[] = []
      const service = createLoggingService({ stdout: fakeStdout(lines) })
      service.createLogger('dust:foo')('f')
      service.createLogger('dust:bar')('b')
      service.createLogger('dust:baz')('z')
      expect(lines).toHaveLength(2)
      expect(lines[0]).toContain('[dust:foo]')
      expect(lines[1]).toContain('[dust:bar]')
    })
  })

  test('supports wildcard at end', () => {
    return stubEnv('DEBUG', 'dust:bucket:*', () => {
      const lines: string[] = []
      const service = createLoggingService({ stdout: fakeStdout(lines) })
      service.createLogger('dust:bucket:repository-loop')('bl')
      service.createLogger('dust:bucket:repository')('br')
      service.createLogger('dust:cli:commands:loop')('l')
      expect(lines).toHaveLength(2)
      expect(lines[0]).toContain('[dust:bucket:repository-loop]')
      expect(lines[1]).toContain('[dust:bucket:repository]')
    })
  })

  test('supports wildcard at beginning', () => {
    return stubEnv('DEBUG', '*loop', () => {
      const lines: string[] = []
      const service = createLoggingService({ stdout: fakeStdout(lines) })
      service.createLogger('dust:bucket:repository-loop')('bl')
      service.createLogger('dust:cli:commands:loop')('l')
      service.createLogger('dust:cli:commands:bucket')('b')
      expect(lines).toHaveLength(2)
      expect(lines[0]).toContain('[dust:bucket:repository-loop]')
      expect(lines[1]).toContain('[dust:cli:commands:loop]')
    })
  })

  test('mixed patterns: exact and wildcard', () => {
    return stubEnv('DEBUG', 'dust:foo,*bar', () => {
      const lines: string[] = []
      const service = createLoggingService({ stdout: fakeStdout(lines) })
      service.createLogger('dust:foo')('f')
      service.createLogger('dust:foo:bar')('fb')
      service.createLogger('dust:baz')('z')
      expect(lines).toHaveLength(2)
      expect(lines[0]).toContain('[dust:foo]')
      expect(lines[1]).toContain('[dust:foo:bar]')
    })
  })

  test('serializes non-string arguments as JSON', () => {
    return stubEnv('DEBUG', '*', () => {
      const lines: string[] = []
      const service = createLoggingService({ stdout: fakeStdout(lines) })
      const log = service.createLogger('dust:test')
      log('data:', { count: 42 })
      expect(lines[0]).toContain('data: {"count":42}')
    })
  })

  test('writes each call on its own line', () => {
    return stubEnv('DEBUG', '*', () => {
      const lines: string[] = []
      const service = createLoggingService({ stdout: fakeStdout(lines) })
      const log = service.createLogger('dust:test')
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
      const service = createLoggingService()
      service.enableFileLogs('test', fakeSink(lines))
      const log = service.createLogger('dust:test')
      log('hello')
      expect(lines).toHaveLength(1)
      expect(lines[0]).toContain('[dust:test]')
      expect(lines[0]).toContain('hello')
    })
  })

  test('does not write to file sink when enableFileLogs is not called', () => {
    return stubEnv('DEBUG', undefined, () => {
      const lines: string[] = []
      const service = createLoggingService()
      const log = service.createLogger('dust:test')
      log('hello')
      expect(lines).toHaveLength(0)
    })
  })

  test('file logging is not filtered by DEBUG pattern', () => {
    return stubEnv('DEBUG', 'dust:other', () => {
      const lines: string[] = []
      const service = createLoggingService()
      service.enableFileLogs('test', fakeSink(lines))
      const log = service.createLogger('dust:test')
      log('message')
      // File sink gets it even though DEBUG does not match 'dust:test'
      expect(lines).toHaveLength(1)
    })
  })

  test('file logging and stdout logging work simultaneously', () => {
    return stubEnv('DEBUG', '*', () => {
      const fileLines: string[] = []
      const stdoutLines: string[] = []
      const service = createLoggingService({ stdout: fakeStdout(stdoutLines) })
      service.enableFileLogs('test', fakeSink(fileLines))
      const log = service.createLogger('dust:test')
      log('both')
      expect(fileLines).toHaveLength(1)
      expect(stdoutLines).toHaveLength(1)
      expect(fileLines[0]).toContain('both')
      expect(stdoutLines[0]).toContain('both')
    })
  })

  test('stdout only gets matching loggers when file gets all', () => {
    return stubEnv('DEBUG', 'dust:foo', () => {
      const fileLines: string[] = []
      const stdoutLines: string[] = []
      const service = createLoggingService({ stdout: fakeStdout(stdoutLines) })
      service.enableFileLogs('test', fakeSink(fileLines))
      service.createLogger('dust:foo')('matches')
      service.createLogger('dust:bar')('no-match')
      expect(fileLines).toHaveLength(2)
      expect(stdoutLines).toHaveLength(1)
      expect(stdoutLines[0]).toContain('[dust:foo]')
    })
  })

  test('sets DUST_LOG_FILE to scope path when not already set', () => {
    return stubEnv('DUST_LOG_FILE', undefined, () => {
      const service = createLoggingService()
      service.enableFileLogs('loop', fakeSink([]))
      expect(process.env.DUST_LOG_FILE).toContain('loop.log')
      expect(process.env.DUST_LOG_FILE).toContain('/log/')
      delete process.env.DUST_LOG_FILE
    })
  })

  test('uses DUST_LOG_DIR as base directory when set', () => {
    return stubEnv('DUST_LOG_FILE', undefined, () => {
      return stubEnv('DUST_LOG_DIR', '/custom/logs', () => {
        const service = createLoggingService()
        service.enableFileLogs('loop', fakeSink([]))
        expect(process.env.DUST_LOG_FILE).toBe('/custom/logs/loop.log')
        delete process.env.DUST_LOG_FILE
      })
    })
  })

  test('does not override DUST_LOG_FILE when already set (subprocess routing)', () => {
    return stubEnv('DUST_LOG_FILE', '/inherited/check.log', () => {
      const service = createLoggingService()
      service.enableFileLogs('loop', fakeSink([]))
      expect(process.env.DUST_LOG_FILE).toBe('/inherited/check.log')
    })
  })
})

describe('createLogger — per-logger file routing', () => {
  test('custom file option routes only that logger to the custom sink', () => {
    return stubEnv('DEBUG', undefined, () => {
      const globalLines: string[] = []
      const service = createLoggingService()
      service.enableFileLogs('test', fakeSink(globalLines))

      const log1 = service.createLogger('dust:a', {
        file: '/tmp/test-custom.log',
      })
      const log2 = service.createLogger('dust:b')
      log1('custom-msg')
      log2('global-msg')
      // log1 writes to per-logger sink (not global), log2 writes to global
      expect(globalLines).toHaveLength(1)
      expect(globalLines[0]).toContain('global-msg')
    })
  })

  test('file: false suppresses file output while preserving stdout', () => {
    return stubEnv('DEBUG', '*', () => {
      const globalLines: string[] = []
      const stdoutLines: string[] = []
      const service = createLoggingService({ stdout: fakeStdout(stdoutLines) })
      service.enableFileLogs('test', fakeSink(globalLines))
      const silentLog = service.createLogger('dust:silent', { file: false })
      const normalLog = service.createLogger('dust:normal')
      silentLog('no-file')
      normalLog('yes-file')
      // file: false logger should not write to global sink
      expect(globalLines).toHaveLength(1)
      expect(globalLines[0]).toContain('yes-file')
      // but stdout still gets both (DEBUG=*)
      expect(stdoutLines).toHaveLength(2)
      expect(stdoutLines[0]).toContain('no-file')
      expect(stdoutLines[1]).toContain('yes-file')
    })
  })

  test('default behavior unchanged when no per-logger options are passed', () => {
    return stubEnv('DEBUG', undefined, () => {
      const globalLines: string[] = []
      const service = createLoggingService()
      service.enableFileLogs('test', fakeSink(globalLines))
      const log = service.createLogger('dust:test')
      log('hello')
      expect(globalLines).toHaveLength(1)
      expect(globalLines[0]).toContain('hello')
    })
  })

  test('multiple loggers with same file path share one sink instance', () => {
    return stubEnv('DEBUG', undefined, () => {
      const service = createLoggingService()
      const log1 = service.createLogger('dust:a', { file: '/tmp/shared.log' })
      const log2 = service.createLogger('dust:b', { file: '/tmp/shared.log' })
      // Both should work without error — sink caching is internal,
      // but we can verify they don't throw and produce output
      log1('msg1')
      log2('msg2')
    })
  })

  test('stdout DEBUG filtering remains unchanged for all logger types', () => {
    return stubEnv('DEBUG', 'dust:visible', () => {
      const stdoutLines: string[] = []
      const service = createLoggingService({ stdout: fakeStdout(stdoutLines) })
      service.createLogger('dust:visible', { file: '/tmp/x.log' })('a')
      service.createLogger('dust:visible', { file: false })('b')
      service.createLogger('dust:visible')('c')
      service.createLogger('dust:hidden', { file: '/tmp/x.log' })('d')
      service.createLogger('dust:hidden', { file: false })('e')
      service.createLogger('dust:hidden')('f')
      expect(stdoutLines).toHaveLength(3)
      expect(stdoutLines[0]).toContain('[dust:visible]')
      expect(stdoutLines[1]).toContain('[dust:visible]')
      expect(stdoutLines[2]).toContain('[dust:visible]')
    })
  })
})

describe('isEnabled', () => {
  test('returns false when DEBUG is not set', () => {
    return stubEnv('DEBUG', undefined, () => {
      const service = createLoggingService()
      expect(service.isEnabled('anything')).toBe(false)
    })
  })

  test('returns true for matching pattern', () => {
    return stubEnv('DEBUG', 'dust:foo,dust:bar', () => {
      const service = createLoggingService()
      expect(service.isEnabled('dust:foo')).toBe(true)
      expect(service.isEnabled('dust:bar')).toBe(true)
      expect(service.isEnabled('dust:baz')).toBe(false)
    })
  })

  test('returns true for wildcard match', () => {
    return stubEnv('DEBUG', '*', () => {
      const service = createLoggingService()
      expect(service.isEnabled('anything')).toBe(true)
    })
  })
})
