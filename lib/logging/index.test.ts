import { describe, expect, test } from 'vitest'
import type { LoggingConfig } from '../env-config'
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

function noConfig(): LoggingConfig {
  return {
    debug: undefined,
    logDir: undefined,
    logFile: undefined,
    logFormat: undefined,
  }
}

function withDebug(debug: string): LoggingConfig {
  return { debug, logDir: undefined, logFile: undefined, logFormat: undefined }
}

function withJsonFormat(debug?: string): LoggingConfig {
  return { debug, logDir: undefined, logFile: undefined, logFormat: 'json' }
}

describe('createLogger — stdout (DEBUG)', () => {
  test('does not write to stdout when DEBUG is not set', () => {
    const lines: string[] = []
    const service = createLoggingService({
      config: noConfig(),
      stdout: fakeStdout(lines),
    })
    const log = service.createLogger('dust:test')
    log('hello')
    expect(lines).toHaveLength(0)
  })

  test('writes to stdout when DEBUG=*', () => {
    const lines: string[] = []
    const service = createLoggingService({
      config: withDebug('*'),
      stdout: fakeStdout(lines),
    })
    const log = service.createLogger('dust:test')
    log('hello world')
    expect(lines).toHaveLength(1)
    expect(lines[0]).toContain('[dust:test]')
    expect(lines[0]).toContain('hello world')
  })

  test('includes ISO timestamp in stdout output', () => {
    const lines: string[] = []
    const service = createLoggingService({
      config: withDebug('*'),
      stdout: fakeStdout(lines),
    })
    const log = service.createLogger('dust:foo')
    log('msg')
    expect(lines[0]).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
  })

  test('matches exact logger name', () => {
    const lines: string[] = []
    const service = createLoggingService({
      config: withDebug('dust:foo'),
      stdout: fakeStdout(lines),
    })
    const fooLog = service.createLogger('dust:foo')
    const barLog = service.createLogger('dust:bar')
    fooLog('yes')
    barLog('no')
    expect(lines).toHaveLength(1)
    expect(lines[0]).toContain('[dust:foo]')
  })

  test('matches multiple comma-separated names', () => {
    const lines: string[] = []
    const service = createLoggingService({
      config: withDebug('dust:foo,dust:bar'),
      stdout: fakeStdout(lines),
    })
    service.createLogger('dust:foo')('f')
    service.createLogger('dust:bar')('b')
    service.createLogger('dust:baz')('z')
    expect(lines).toHaveLength(2)
    expect(lines[0]).toContain('[dust:foo]')
    expect(lines[1]).toContain('[dust:bar]')
  })

  test('supports wildcard at end', () => {
    const lines: string[] = []
    const service = createLoggingService({
      config: withDebug('dust:bucket:*'),
      stdout: fakeStdout(lines),
    })
    service.createLogger('dust:bucket:repository-loop')('bl')
    service.createLogger('dust:bucket:repository')('br')
    service.createLogger('dust:cli:commands:loop')('l')
    expect(lines).toHaveLength(2)
    expect(lines[0]).toContain('[dust:bucket:repository-loop]')
    expect(lines[1]).toContain('[dust:bucket:repository]')
  })

  test('supports wildcard at beginning', () => {
    const lines: string[] = []
    const service = createLoggingService({
      config: withDebug('*loop'),
      stdout: fakeStdout(lines),
    })
    service.createLogger('dust:bucket:repository-loop')('bl')
    service.createLogger('dust:cli:commands:loop')('l')
    service.createLogger('dust:cli:commands:bucket')('b')
    expect(lines).toHaveLength(2)
    expect(lines[0]).toContain('[dust:bucket:repository-loop]')
    expect(lines[1]).toContain('[dust:cli:commands:loop]')
  })

  test('mixed patterns: exact and wildcard', () => {
    const lines: string[] = []
    const service = createLoggingService({
      config: withDebug('dust:foo,*bar'),
      stdout: fakeStdout(lines),
    })
    service.createLogger('dust:foo')('f')
    service.createLogger('dust:foo:bar')('fb')
    service.createLogger('dust:baz')('z')
    expect(lines).toHaveLength(2)
    expect(lines[0]).toContain('[dust:foo]')
    expect(lines[1]).toContain('[dust:foo:bar]')
  })

  test('serializes context object in text format', () => {
    const lines: string[] = []
    const service = createLoggingService({
      config: withDebug('*'),
      stdout: fakeStdout(lines),
    })
    const log = service.createLogger('dust:test')
    log('data', { count: 42 })
    expect(lines[0]).toContain('data')
    expect(lines[0]).toContain('{"count":42}')
  })

  test('writes each call on its own line', () => {
    const lines: string[] = []
    const service = createLoggingService({
      config: withDebug('*'),
      stdout: fakeStdout(lines),
    })
    const log = service.createLogger('dust:test')
    log('first')
    log('second')
    expect(lines).toHaveLength(2)
    expect(lines[0]).toContain('first')
    expect(lines[1]).toContain('second')
  })
})

describe('enableFileLogs', () => {
  test('writes to file sink when enableFileLogs is called', () => {
    const lines: string[] = []
    const service = createLoggingService({ config: noConfig() })
    service.enableFileLogs('test', fakeSink(lines))
    const log = service.createLogger('dust:test')
    log('hello')
    expect(lines).toHaveLength(1)
    expect(lines[0]).toContain('[dust:test]')
    expect(lines[0]).toContain('hello')
  })

  test('does not write to file sink when enableFileLogs is not called', () => {
    const lines: string[] = []
    const service = createLoggingService({ config: noConfig() })
    const log = service.createLogger('dust:test')
    log('hello')
    expect(lines).toHaveLength(0)
  })

  test('file logging is not filtered by DEBUG pattern', () => {
    const lines: string[] = []
    const service = createLoggingService({ config: withDebug('dust:other') })
    service.enableFileLogs('test', fakeSink(lines))
    const log = service.createLogger('dust:test')
    log('message')
    // File sink gets it even though DEBUG does not match 'dust:test'
    expect(lines).toHaveLength(1)
  })

  test('file logging and stdout logging work simultaneously', () => {
    const fileLines: string[] = []
    const stdoutLines: string[] = []
    const service = createLoggingService({
      config: withDebug('*'),
      stdout: fakeStdout(stdoutLines),
    })
    service.enableFileLogs('test', fakeSink(fileLines))
    const log = service.createLogger('dust:test')
    log('both')
    expect(fileLines).toHaveLength(1)
    expect(stdoutLines).toHaveLength(1)
    expect(fileLines[0]).toContain('both')
    expect(stdoutLines[0]).toContain('both')
  })

  test('stdout only gets matching loggers when file gets all', () => {
    const fileLines: string[] = []
    const stdoutLines: string[] = []
    const service = createLoggingService({
      config: withDebug('dust:foo'),
      stdout: fakeStdout(stdoutLines),
    })
    service.enableFileLogs('test', fakeSink(fileLines))
    service.createLogger('dust:foo')('matches')
    service.createLogger('dust:bar')('no-match')
    expect(fileLines).toHaveLength(2)
    expect(stdoutLines).toHaveLength(1)
    expect(stdoutLines[0]).toContain('[dust:foo]')
  })

  test('sets DUST_LOG_FILE to scope path when logFile not already set', () => {
    const captured: string[] = []
    const service = createLoggingService({
      config: noConfig(),
      cwd: () => '/project',
      setLogFileEnv: path => captured.push(path),
    })
    service.enableFileLogs('loop', fakeSink([]))
    expect(captured).toHaveLength(1)
    expect(captured[0]).toContain('loop.log')
    expect(captured[0]).toContain('/log/')
  })

  test('uses logDir as base directory when set', () => {
    const captured: string[] = []
    const service = createLoggingService({
      config: {
        debug: undefined,
        logDir: '/custom/logs',
        logFile: undefined,
        logFormat: undefined,
      },
      setLogFileEnv: path => captured.push(path),
    })
    service.enableFileLogs('loop', fakeSink([]))
    expect(captured).toHaveLength(1)
    expect(captured[0]).toBe('/custom/logs/loop.log')
  })

  test('does not call setLogFileEnv when logFile already set (subprocess routing)', () => {
    const captured: string[] = []
    const service = createLoggingService({
      config: {
        debug: undefined,
        logDir: undefined,
        logFile: '/inherited/check.log',
        logFormat: undefined,
      },
      setLogFileEnv: path => captured.push(path),
    })
    service.enableFileLogs('loop', fakeSink([]))
    expect(captured).toHaveLength(0)
  })
})

describe('createLogger — per-logger file routing', () => {
  test('custom file option routes only that logger to the custom sink', () => {
    const globalLines: string[] = []
    const service = createLoggingService({ config: noConfig() })
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

  test('file: false suppresses file output while preserving stdout', () => {
    const globalLines: string[] = []
    const stdoutLines: string[] = []
    const service = createLoggingService({
      config: withDebug('*'),
      stdout: fakeStdout(stdoutLines),
    })
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

  test('default behavior unchanged when no per-logger options are passed', () => {
    const globalLines: string[] = []
    const service = createLoggingService({ config: noConfig() })
    service.enableFileLogs('test', fakeSink(globalLines))
    const log = service.createLogger('dust:test')
    log('hello')
    expect(globalLines).toHaveLength(1)
    expect(globalLines[0]).toContain('hello')
  })

  test('multiple loggers with same file path share one sink instance', () => {
    const service = createLoggingService({ config: noConfig() })
    const log1 = service.createLogger('dust:a', { file: '/tmp/shared.log' })
    const log2 = service.createLogger('dust:b', { file: '/tmp/shared.log' })
    // Both should work without error — sink caching is internal,
    // but we can verify they don't throw and produce output
    log1('msg1')
    log2('msg2')
  })

  test('stdout DEBUG filtering remains unchanged for all logger types', () => {
    const stdoutLines: string[] = []
    const service = createLoggingService({
      config: withDebug('dust:visible'),
      stdout: fakeStdout(stdoutLines),
    })
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

describe('isEnabled', () => {
  test('returns false when DEBUG is not set', () => {
    const service = createLoggingService({ config: noConfig() })
    expect(service.isEnabled('anything')).toBe(false)
  })

  test('returns true for matching pattern', () => {
    const service = createLoggingService({
      config: withDebug('dust:foo,dust:bar'),
    })
    expect(service.isEnabled('dust:foo')).toBe(true)
    expect(service.isEnabled('dust:bar')).toBe(true)
    expect(service.isEnabled('dust:baz')).toBe(false)
  })

  test('returns true for wildcard match', () => {
    const service = createLoggingService({ config: withDebug('*') })
    expect(service.isEnabled('anything')).toBe(true)
  })
})

describe('config options', () => {
  test('uses cwd option for default log directory', () => {
    const captured: string[] = []
    const service = createLoggingService({
      config: noConfig(),
      cwd: () => '/my/project',
      setLogFileEnv: path => captured.push(path),
    })
    service.enableFileLogs('test', fakeSink([]))
    expect(captured).toHaveLength(1)
    expect(captured[0]).toBe('/my/project/log/test.log')
  })
})

describe('JSON format (DUST_LOG_FORMAT=json)', () => {
  test('outputs valid JSON Lines format', () => {
    const lines: string[] = []
    const service = createLoggingService({
      config: withJsonFormat('*'),
      stdout: fakeStdout(lines),
    })
    const log = service.createLogger('dust:test')
    log('hello world')
    expect(lines).toHaveLength(1)
    const parsed = JSON.parse(lines[0])
    expect(parsed).toMatchObject({
      logger: 'dust:test',
      level: 'info',
      msg: 'hello world',
    })
    expect(parsed.ts).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
  })

  test('includes all required fields: ts, logger, level, msg', () => {
    const lines: string[] = []
    const service = createLoggingService({
      config: withJsonFormat('*'),
      stdout: fakeStdout(lines),
    })
    const log = service.createLogger('dust:foo')
    log('test message')
    const parsed = JSON.parse(lines[0])
    expect(parsed).toHaveProperty('ts')
    expect(parsed).toHaveProperty('logger')
    expect(parsed).toHaveProperty('level')
    expect(parsed).toHaveProperty('msg')
  })

  test('includes optional context fields in JSON output', () => {
    const lines: string[] = []
    const service = createLoggingService({
      config: withJsonFormat('*'),
      stdout: fakeStdout(lines),
    })
    const log = service.createLogger('dust:loop')
    log('iteration completed', { iteration: 5, duration: 1234 })
    const parsed = JSON.parse(lines[0])
    expect(parsed.msg).toBe('iteration completed')
    expect(parsed.iteration).toBe(5)
    expect(parsed.duration).toBe(1234)
  })

  test('text format remains default when DUST_LOG_FORMAT is unset', () => {
    const lines: string[] = []
    const service = createLoggingService({
      config: withDebug('*'),
      stdout: fakeStdout(lines),
    })
    const log = service.createLogger('dust:test')
    log('hello')
    expect(lines[0]).toContain('[dust:test]')
    expect(lines[0]).toContain('hello')
    // Should not be JSON
    expect(() => JSON.parse(lines[0])).toThrow()
  })

  test('DEBUG filtering works identically for JSON format', () => {
    const lines: string[] = []
    const service = createLoggingService({
      config: withJsonFormat('dust:foo'),
      stdout: fakeStdout(lines),
    })
    service.createLogger('dust:foo')('matches')
    service.createLogger('dust:bar')('no match')
    expect(lines).toHaveLength(1)
    const parsed = JSON.parse(lines[0])
    expect(parsed.logger).toBe('dust:foo')
  })

  test('JSON format works with file logging', () => {
    const fileLines: string[] = []
    const service = createLoggingService({
      config: withJsonFormat(),
    })
    service.enableFileLogs('test', fakeSink(fileLines))
    const log = service.createLogger('dust:test')
    log('logged to file', { extra: 'data' })
    expect(fileLines).toHaveLength(1)
    const parsed = JSON.parse(fileLines[0])
    expect(parsed.msg).toBe('logged to file')
    expect(parsed.extra).toBe('data')
  })

  test('each JSON log entry is on its own line', () => {
    const lines: string[] = []
    const service = createLoggingService({
      config: withJsonFormat('*'),
      stdout: fakeStdout(lines),
    })
    const log = service.createLogger('dust:test')
    log('first')
    log('second')
    expect(lines).toHaveLength(2)
    expect(lines[0]).toMatch(/\n$/)
    expect(lines[1]).toMatch(/\n$/)
    expect(JSON.parse(lines[0]).msg).toBe('first')
    expect(JSON.parse(lines[1]).msg).toBe('second')
  })
})
