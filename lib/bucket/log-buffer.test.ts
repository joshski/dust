import { describe, expect, it } from 'vitest'
import {
  appendLogLine,
  clearLogBuffer,
  createLogBuffer,
  createLogLine,
  getLogLines,
  getRecentLines,
} from './log-buffer'

describe('createLogBuffer', () => {
  it('creates empty buffer with default settings', () => {
    const buffer = createLogBuffer()
    expect(buffer.lines).toEqual([])
    expect(buffer.maxLines).toBe(5000)
    expect(buffer.trimToLines).toBe(3000)
  })

  it('accepts custom limits', () => {
    const buffer = createLogBuffer(100, 50)
    expect(buffer.maxLines).toBe(100)
    expect(buffer.trimToLines).toBe(50)
  })
})

describe('createLogLine', () => {
  it('creates stdout log line', () => {
    const line = createLogLine('hello', 'stdout', 1234567890)
    expect(line).toEqual({
      text: 'hello',
      stream: 'stdout',
      timestamp: 1234567890,
    })
  })

  it('creates stderr log line', () => {
    const line = createLogLine('error', 'stderr', 1234567890)
    expect(line).toEqual({
      text: 'error',
      stream: 'stderr',
      timestamp: 1234567890,
    })
  })

  it('uses current time when timestamp not provided', () => {
    const before = Date.now()
    const line = createLogLine('test', 'stdout')
    const after = Date.now()

    expect(line.timestamp).toBeGreaterThanOrEqual(before)
    expect(line.timestamp).toBeLessThanOrEqual(after)
  })
})

describe('appendLogLine', () => {
  it('appends line to buffer', () => {
    const buffer = createLogBuffer()
    const line = createLogLine('test', 'stdout', 1000)

    appendLogLine(buffer, line)

    expect(buffer.lines).toHaveLength(1)
    expect(buffer.lines[0]).toBe(line)
  })

  it('appends multiple lines in order', () => {
    const buffer = createLogBuffer()

    appendLogLine(buffer, createLogLine('first', 'stdout', 1000))
    appendLogLine(buffer, createLogLine('second', 'stderr', 2000))
    appendLogLine(buffer, createLogLine('third', 'stdout', 3000))

    expect(buffer.lines.map(l => l.text)).toEqual(['first', 'second', 'third'])
  })

  it('trims buffer when exceeding maxLines', () => {
    const buffer = createLogBuffer(10, 5)

    // Add 11 lines
    for (let i = 0; i < 11; i++) {
      appendLogLine(buffer, createLogLine(`line-${i}`, 'stdout', i))
    }

    // Should trim to 5 lines, keeping most recent
    expect(buffer.lines).toHaveLength(5)
    expect(buffer.lines.map(l => l.text)).toEqual([
      'line-6',
      'line-7',
      'line-8',
      'line-9',
      'line-10',
    ])
  })

  it('does not trim when at exactly maxLines', () => {
    const buffer = createLogBuffer(5, 3)

    for (let i = 0; i < 5; i++) {
      appendLogLine(buffer, createLogLine(`line-${i}`, 'stdout', i))
    }

    expect(buffer.lines).toHaveLength(5)
    expect(buffer.lines.map(l => l.text)).toEqual([
      'line-0',
      'line-1',
      'line-2',
      'line-3',
      'line-4',
    ])
  })
})

describe('getLogLines', () => {
  it('returns all lines', () => {
    const buffer = createLogBuffer()
    appendLogLine(buffer, createLogLine('a', 'stdout', 1))
    appendLogLine(buffer, createLogLine('b', 'stderr', 2))

    const lines = getLogLines(buffer)
    expect(lines).toHaveLength(2)
    expect(lines.map(l => l.text)).toEqual(['a', 'b'])
  })

  it('returns empty array for empty buffer', () => {
    const buffer = createLogBuffer()
    expect(getLogLines(buffer)).toEqual([])
  })
})

describe('getRecentLines', () => {
  it('returns last N lines', () => {
    const buffer = createLogBuffer()
    for (let i = 0; i < 10; i++) {
      appendLogLine(buffer, createLogLine(`line-${i}`, 'stdout', i))
    }

    const recent = getRecentLines(buffer, 3)
    expect(recent.map(l => l.text)).toEqual(['line-7', 'line-8', 'line-9'])
  })

  it('returns all lines when count exceeds buffer size', () => {
    const buffer = createLogBuffer()
    appendLogLine(buffer, createLogLine('a', 'stdout', 1))
    appendLogLine(buffer, createLogLine('b', 'stdout', 2))

    const recent = getRecentLines(buffer, 10)
    expect(recent.map(l => l.text)).toEqual(['a', 'b'])
  })

  it('returns empty array for empty buffer', () => {
    const buffer = createLogBuffer()
    expect(getRecentLines(buffer, 5)).toEqual([])
  })
})

describe('clearLogBuffer', () => {
  it('removes all lines from buffer', () => {
    const buffer = createLogBuffer()
    appendLogLine(buffer, createLogLine('a', 'stdout', 1))
    appendLogLine(buffer, createLogLine('b', 'stderr', 2))

    clearLogBuffer(buffer)

    expect(buffer.lines).toEqual([])
  })
})
