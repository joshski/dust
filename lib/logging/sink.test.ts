import { describe, expect, test } from 'vitest'
import { FileSink } from './sink'

function makeFakes(fakeHome = '/fake/home') {
  const appended: [string, string][] = []
  const mkdirPaths: string[] = []
  const appendFileSync = (path: string, data: string) =>
    appended.push([path, data])
  const mkdirSync = (path: string, _opts: { recursive: boolean }) =>
    mkdirPaths.push(path)
  return { appended, mkdirPaths, appendFileSync, mkdirSync, fakeHome }
}

describe('FileSink', () => {
  test('creates the log directory on first write', () => {
    const { mkdirPaths, appendFileSync, mkdirSync, fakeHome } = makeFakes()
    const sink = new FileSink('debug', fakeHome, appendFileSync, mkdirSync)
    sink.write('hello\n')
    expect(mkdirPaths).toHaveLength(1)
    expect(mkdirPaths[0]).toContain('.dust/logs')
  })

  test('appends the line to the log file on write', () => {
    const { appended, appendFileSync, mkdirSync, fakeHome } = makeFakes()
    const sink = new FileSink('debug', fakeHome, appendFileSync, mkdirSync)
    sink.write('hello\n')
    expect(appended).toHaveLength(1)
    expect(appended[0][1]).toBe('hello\n')
  })

  test('uses the scope as the log filename', () => {
    const { appended, appendFileSync, mkdirSync, fakeHome } = makeFakes()
    const sink = new FileSink('debug', fakeHome, appendFileSync, mkdirSync)
    sink.write('msg\n')
    expect(appended[0][0]).toContain('debug.log')
  })

  test('writes to ~/.dust/logs/<scope>.log', () => {
    const { appended, appendFileSync, mkdirSync } = makeFakes('/home/user')
    const sink = new FileSink('loop', '/home/user', appendFileSync, mkdirSync)
    sink.write('msg\n')
    expect(appended[0][0]).toContain('/home/user/.dust/logs/loop.log')
  })

  test('only calls mkdirSync once across multiple writes', () => {
    const { mkdirPaths, appendFileSync, mkdirSync, fakeHome } = makeFakes()
    const sink = new FileSink('debug', fakeHome, appendFileSync, mkdirSync)
    sink.write('first\n')
    sink.write('second\n')
    sink.write('third\n')
    expect(mkdirPaths).toHaveLength(1)
  })

  test('silently no-ops when mkdirSync throws', () => {
    const appended: [string, string][] = []
    const appendFileSync = (path: string, data: string) =>
      appended.push([path, data])
    const mkdirSync = () => {
      throw new Error('permission denied')
    }
    const sink = new FileSink('debug', '/fake/home', appendFileSync, mkdirSync)
    expect(() => sink.write('msg\n')).not.toThrow()
    expect(appended).toHaveLength(0)
  })

  test('silently no-ops when appendFileSync throws', () => {
    const mkdirSync = () => {}
    const appendFileSync = () => {
      throw new Error('disk full')
    }
    const sink = new FileSink('debug', '/fake/home', appendFileSync, mkdirSync)
    expect(() => sink.write('msg\n')).not.toThrow()
  })
})
