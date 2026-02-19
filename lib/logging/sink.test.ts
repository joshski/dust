import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { FileSink } from './sink'

function makeFakes() {
  const appended: [string, string][] = []
  const mkdirPaths: string[] = []
  const appendFileSync = (path: string, data: string) =>
    appended.push([path, data])
  const mkdirSync = (path: string, _opts: { recursive: boolean }) =>
    mkdirPaths.push(path)
  return { appended, mkdirPaths, appendFileSync, mkdirSync }
}

beforeEach(() => {
  delete process.env.DEBUG_LOG_SCOPE
})

afterEach(() => {
  delete process.env.DEBUG_LOG_SCOPE
})

describe('FileSink', () => {
  test('creates the log directory on first write', () => {
    const { mkdirPaths, appendFileSync, mkdirSync } = makeFakes()
    const sink = new FileSink(appendFileSync, mkdirSync)
    sink.write('hello\n')
    expect(mkdirPaths).toHaveLength(1)
    expect(mkdirPaths[0]).toContain('log/dust')
  })

  test('appends the line to the log file on write', () => {
    const { appended, appendFileSync, mkdirSync } = makeFakes()
    const sink = new FileSink(appendFileSync, mkdirSync)
    sink.write('hello\n')
    expect(appended).toHaveLength(1)
    expect(appended[0][1]).toBe('hello\n')
  })

  test('uses "debug" as the default scope', () => {
    const { appended, appendFileSync, mkdirSync } = makeFakes()
    const sink = new FileSink(appendFileSync, mkdirSync)
    sink.write('msg\n')
    expect(appended[0][0]).toContain('debug.log')
  })

  test('uses DEBUG_LOG_SCOPE env var as the default scope', () => {
    process.env.DEBUG_LOG_SCOPE = 'myenv'
    const { appended, appendFileSync, mkdirSync } = makeFakes()
    const sink = new FileSink(appendFileSync, mkdirSync)
    sink.write('msg\n')
    expect(appended[0][0]).toContain('myenv.log')
  })

  test('only calls mkdirSync once across multiple writes', () => {
    const { mkdirPaths, appendFileSync, mkdirSync } = makeFakes()
    const sink = new FileSink(appendFileSync, mkdirSync)
    sink.write('first\n')
    sink.write('second\n')
    sink.write('third\n')
    expect(mkdirPaths).toHaveLength(1)
  })

  test('setScope changes the log file path', () => {
    const { appended, appendFileSync, mkdirSync } = makeFakes()
    const sink = new FileSink(appendFileSync, mkdirSync)
    sink.setScope('loop')
    sink.write('msg\n')
    expect(appended[0][0]).toContain('loop.log')
  })

  test('setScope sets DEBUG_LOG_SCOPE env var', () => {
    const { appendFileSync, mkdirSync } = makeFakes()
    const sink = new FileSink(appendFileSync, mkdirSync)
    sink.setScope('check')
    expect(process.env.DEBUG_LOG_SCOPE).toBe('check')
  })

  test('setScope resets the directory so mkdirSync is called again', () => {
    const { mkdirPaths, appendFileSync, mkdirSync } = makeFakes()
    const sink = new FileSink(appendFileSync, mkdirSync)
    sink.write('first\n')
    sink.setScope('loop')
    sink.write('second\n')
    expect(mkdirPaths).toHaveLength(2)
  })

  test('silently no-ops when mkdirSync throws', () => {
    const appended: [string, string][] = []
    const appendFileSync = (path: string, data: string) =>
      appended.push([path, data])
    const mkdirSync = () => {
      throw new Error('permission denied')
    }
    const sink = new FileSink(appendFileSync, mkdirSync)
    expect(() => sink.write('msg\n')).not.toThrow()
    expect(appended).toHaveLength(0)
  })

  test('silently no-ops when appendFileSync throws', () => {
    const mkdirSync = () => {}
    const appendFileSync = () => {
      throw new Error('disk full')
    }
    const sink = new FileSink(appendFileSync, mkdirSync)
    expect(() => sink.write('msg\n')).not.toThrow()
  })
})
