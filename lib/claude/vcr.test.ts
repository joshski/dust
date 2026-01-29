import { existsSync, readFileSync, rmSync } from 'node:fs'
import { afterEach, describe, expect, test } from 'vitest'
import { restoreEnv, stubEnv } from '../cli/test-utilities'
import { spawnClaudeCode } from './spawn-claude-code'
import { streamEvents } from './streamer'
import {
  type Cassette,
  cassetteExists,
  createRecordingSink,
  defaultRecorderDependencies,
  getCassettePath,
  getVcrMode,
  loadCassette,
  type RecorderDependencies,
  recordCassette,
  replayEvents,
  saveCassette,
} from './vcr'

describe('createRecordingSink', () => {
  test('records write operations', () => {
    const sink = createRecordingSink()

    sink.write('hello')
    sink.write(' world')

    expect(sink.operations).toEqual([
      { op: 'write', text: 'hello' },
      { op: 'write', text: ' world' },
    ])
  })

  test('records line operations', () => {
    const sink = createRecordingSink()

    sink.line('first line')
    sink.line('second line')

    expect(sink.operations).toEqual([
      { op: 'line', text: 'first line' },
      { op: 'line', text: 'second line' },
    ])
  })

  test('records mixed operations in order', () => {
    const sink = createRecordingSink()

    sink.write('hello')
    sink.line('')
    sink.write('world')

    expect(sink.operations).toEqual([
      { op: 'write', text: 'hello' },
      { op: 'line', text: '' },
      { op: 'write', text: 'world' },
    ])
  })
})

describe('replayEvents', () => {
  test('yields all events from cassette', async () => {
    const cassette: Cassette = {
      name: 'test',
      rawEvents: [{ type: 'a' }, { type: 'b' }, { type: 'c' }],
      expectedOutput: [],
    }

    const events = []
    for await (const event of replayEvents(cassette)) {
      events.push(event)
    }

    expect(events).toEqual([{ type: 'a' }, { type: 'b' }, { type: 'c' }])
  })

  test('handles empty cassette', async () => {
    const cassette: Cassette = {
      name: 'empty',
      rawEvents: [],
      expectedOutput: [],
    }

    const events = []
    for await (const event of replayEvents(cassette)) {
      events.push(event)
    }

    expect(events).toEqual([])
  })
})

describe('getCassettePath', () => {
  test('returns path in fixtures directory', () => {
    const path = getCassettePath('my-test')

    expect(path).toContain('fixtures')
    expect(path).toContain('my-test.json')
  })
})

describe('loadCassette', () => {
  test('loads cassette from fixtures directory', () => {
    const cassette = loadCassette('write-read-echo')

    expect(cassette.name).toBe('write-read-echo')
    expect(cassette.rawEvents.length).toBeGreaterThan(0)
    expect(cassette.expectedOutput.length).toBeGreaterThan(0)
  })
})

describe('saveCassette', () => {
  const testCassetteName = 'test-save-cassette-temp'
  const testCassettePath = getCassettePath(testCassetteName)

  afterEach(() => {
    if (existsSync(testCassettePath)) {
      rmSync(testCassettePath)
    }
  })

  test('saves cassette to fixtures directory', () => {
    const cassette: Cassette = {
      name: testCassetteName,
      description: 'Test cassette',
      rawEvents: [{ type: 'test' }],
      expectedOutput: [{ op: 'write', text: 'test' }],
    }

    saveCassette(cassette)

    expect(existsSync(testCassettePath)).toBe(true)
    const content = JSON.parse(readFileSync(testCassettePath, 'utf-8'))
    expect(content.name).toBe(testCassetteName)
    expect(content.description).toBe('Test cassette')
  })
})

describe('cassetteExists', () => {
  test('returns true for existing cassette', () => {
    expect(cassetteExists('write-read-echo')).toBe(true)
  })

  test('returns false for non-existing cassette', () => {
    expect(cassetteExists('definitely-does-not-exist')).toBe(false)
  })
})

describe('getVcrMode', () => {
  afterEach(() => {
    restoreEnv()
  })

  test('returns replay by default', () => {
    expect(getVcrMode()).toBe('replay')
  })

  test('returns record when env var is set', () => {
    stubEnv('CLAUDE_CODE_VCR_MODE', 'record')

    expect(getVcrMode()).toBe('record')
  })

  test('returns replay for other env values', () => {
    stubEnv('CLAUDE_CODE_VCR_MODE', 'something-else')

    expect(getVcrMode()).toBe('replay')
  })
})

describe('defaultRecorderDependencies', () => {
  test('uses real implementations', () => {
    expect(defaultRecorderDependencies.spawnClaudeCode).toBe(spawnClaudeCode)
    expect(defaultRecorderDependencies.streamEvents).toBe(streamEvents)
  })
})

describe('recordCassette', () => {
  const testCassetteName = 'test-record-cassette-temp'
  const testCassettePath = getCassettePath(testCassetteName)

  afterEach(() => {
    if (existsSync(testCassettePath)) {
      rmSync(testCassettePath)
    }
  })

  test('collects raw events and saves cassette', async () => {
    const dependencies: RecorderDependencies = {
      spawnClaudeCode: () =>
        (async function* () {
          yield { type: 'raw1' }
          yield { type: 'raw2' }
        })(),
      streamEvents: async events => {
        for await (const _ of events) {
          // consume
        }
      },
    }

    const result = await recordCassette(
      testCassetteName,
      'test prompt',
      { maxTurns: 3 },
      'Test description',
      dependencies
    )

    expect(result.name).toBe(testCassetteName)
    expect(result.description).toBe('Test description')
    expect(result.rawEvents).toEqual([{ type: 'raw1' }, { type: 'raw2' }])
    expect(existsSync(testCassettePath)).toBe(true)
  })

  test('passes events through to streamEvents', async () => {
    const streamedEvents: unknown[] = []

    const dependencies: RecorderDependencies = {
      spawnClaudeCode: () =>
        (async function* () {
          yield { type: 'a' }
          yield { type: 'b' }
        })(),
      streamEvents: async events => {
        for await (const e of events) {
          streamedEvents.push(e)
        }
      },
    }

    await recordCassette(
      testCassetteName,
      'prompt',
      {},
      undefined,
      dependencies
    )

    expect(streamedEvents).toEqual([{ type: 'a' }, { type: 'b' }])
  })
})
