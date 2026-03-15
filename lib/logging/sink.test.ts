import { describe, expect, test } from 'vitest'
import { FileSink } from './sink'

const noOpMkdirSync = () => {}

const throwingMkdirSync = () => {
  throw new Error('permission denied')
}

const throwingAppendFileSync = () => {
  throw new Error('disk full')
}

function makeFakes() {
  const appended: [string, string][] = []
  const mkdirPaths: string[] = []
  const appendFileSync = (path: string, data: string) =>
    appended.push([path, data])
  const mkdirSync = (path: string, _opts: { recursive: boolean }) =>
    mkdirPaths.push(path)
  return { appended, mkdirPaths, appendFileSync, mkdirSync }
}

describe('FileSink', () => {
  test('creates the log directory on first write', () => {
    const { mkdirPaths, appendFileSync, mkdirSync } = makeFakes()
    const sink = new FileSink(
      '/home/user/.dust/logs/debug.log',
      appendFileSync,
      mkdirSync
    )
    sink.write('hello\n')
    expect(mkdirPaths).toHaveLength(1)
    expect(mkdirPaths[0]).toBe('/home/user/.dust/logs')
  })

  test('appends the line to the log file on write', () => {
    const { appended, appendFileSync, mkdirSync } = makeFakes()
    const sink = new FileSink(
      '/home/user/.dust/logs/debug.log',
      appendFileSync,
      mkdirSync
    )
    sink.write('hello\n')
    expect(appended).toHaveLength(1)
    expect(appended[0][1]).toBe('hello\n')
  })

  test('writes to the given path', () => {
    const { appended, appendFileSync, mkdirSync } = makeFakes()
    const sink = new FileSink(
      '/home/user/.dust/logs/loop.log',
      appendFileSync,
      mkdirSync
    )
    sink.write('msg\n')
    expect(appended[0][0]).toBe('/home/user/.dust/logs/loop.log')
  })

  test('only calls mkdirSync once across multiple writes', () => {
    const { mkdirPaths, appendFileSync, mkdirSync } = makeFakes()
    const sink = new FileSink(
      '/home/user/.dust/logs/debug.log',
      appendFileSync,
      mkdirSync
    )
    sink.write('first\n')
    sink.write('second\n')
    sink.write('third\n')
    expect(mkdirPaths).toHaveLength(1)
  })

  test('silently no-ops when mkdirSync throws', () => {
    const appended: [string, string][] = []
    const appendFileSync = (path: string, data: string) =>
      appended.push([path, data])
    const sink = new FileSink(
      '/home/user/.dust/logs/debug.log',
      appendFileSync,
      throwingMkdirSync
    )
    expect(() => sink.write('msg\n')).not.toThrow()
    expect(appended).toHaveLength(0)
  })

  test('silently no-ops when appendFileSync throws', () => {
    const sink = new FileSink(
      '/home/user/.dust/logs/debug.log',
      throwingAppendFileSync,
      noOpMkdirSync
    )
    expect(() => sink.write('msg\n')).not.toThrow()
  })
})
