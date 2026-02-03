import { describe, expect, test } from 'vitest'
import { createStdoutSink, streamEvents } from './streamer'
import { createRecordingSink, loadCassette, replayEvents } from './vcr'

describe('streamer', () => {
  test('produces expected output for write-read-echo cassette', async () => {
    const cassette = loadCassette('write-read-echo')
    const sink = createRecordingSink()

    await streamEvents(replayEvents(cassette), sink)

    expect(sink.operations).toEqual(cassette.expectedOutput)
  })

  test('streams text deltas as individual writes', async () => {
    const cassette = loadCassette('write-read-echo')
    const sink = createRecordingSink()

    await streamEvents(replayEvents(cassette), sink)

    // First operations should be individual text writes
    const textWrites = sink.operations.filter(op => op.op === 'write')
    expect(textWrites.length).toBeGreaterThan(0)
    expect(textWrites[0]).toEqual({ op: 'write', text: "I'll write" })
  })

  test('shows tool use with human-readable format', async () => {
    const cassette = loadCassette('write-read-echo')
    const sink = createRecordingSink()

    await streamEvents(replayEvents(cassette), sink)

    // Find the Write tool line with file path
    const writeToolIndex = sink.operations.findIndex(
      op => op.op === 'line' && op.text === '🔧 Write: /tmp/claude-test.txt'
    )
    expect(writeToolIndex).toBeGreaterThan(0)

    // Should have a divider after the header
    const dividerLine = sink.operations[writeToolIndex + 1]
    expect(dividerLine.op).toBe('line')
    expect(dividerLine.text).toContain('────')

    // Should have content after the divider
    const contentLine = sink.operations[writeToolIndex + 2]
    expect(contentLine.op).toBe('line')
    expect(contentLine.text).toContain('Hello from Claude!')
  })

  test('shows tool results with content', async () => {
    const cassette = loadCassette('write-read-echo')
    const sink = createRecordingSink()

    await streamEvents(replayEvents(cassette), sink)

    const resultHeaderLines = sink.operations.filter(
      op => op.op === 'line' && op.text === 'Result:'
    )
    expect(resultHeaderLines.length).toBeGreaterThan(0)
  })

  test('shows done message with turns and cost', async () => {
    const cassette = loadCassette('write-read-echo')
    const sink = createRecordingSink()

    await streamEvents(replayEvents(cassette), sink)

    const doneLine = sink.operations.find(
      op => op.op === 'line' && op.text.includes('🏁 Done:')
    )
    expect(doneLine).toBeDefined()
    expect(doneLine?.text).toContain('success')
    expect(doneLine?.text).toContain('4 turns')
    expect(doneLine?.text).toMatch(/\$\d+\.\d+/)
  })
})

describe('createStdoutSink', () => {
  test('write calls process.stdout.write', () => {
    const calls: string[] = []
    const originalWrite = process.stdout.write.bind(process.stdout)
    process.stdout.write = ((text: string) => {
      calls.push(text)
      return true
    }) as typeof process.stdout.write

    try {
      const sink = createStdoutSink()
      sink.write('hello')

      expect(calls).toContain('hello')
    } finally {
      process.stdout.write = originalWrite
    }
  })

  test('line calls console.log', () => {
    const calls: string[] = []
    const originalLog = console.log
    console.log = (text: string) => {
      calls.push(text)
    }

    try {
      const sink = createStdoutSink()
      sink.line('hello')

      expect(calls).toContain('hello')
    } finally {
      console.log = originalLog
    }
  })
})
