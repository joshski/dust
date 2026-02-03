import { describe, expect, test } from 'vitest'
import { defaultRunnerDependencies, type RunnerDependencies, run } from './run'
import { spawnClaudeCode } from './spawn-claude-code'
import { createStdoutSink, streamEvents } from './streamer'
import type { RawEventCallback } from './types'

describe('defaultRunnerDependencies', () => {
  test('uses real implementations', () => {
    expect(defaultRunnerDependencies.spawnClaudeCode).toBe(spawnClaudeCode)
    expect(defaultRunnerDependencies.createStdoutSink).toBe(createStdoutSink)
    expect(defaultRunnerDependencies.streamEvents).toBe(streamEvents)
  })
})

describe('run', () => {
  test('calls spawnClaudeCode with prompt and options', async () => {
    let capturedPrompt = ''
    let capturedOptions = {}

    const dependencies: RunnerDependencies = {
      spawnClaudeCode: (prompt, options) => {
        capturedPrompt = prompt
        capturedOptions = options ?? {}
        return (async function* () {})()
      },
      createStdoutSink: () => ({ write: () => {}, line: () => {} }),
      streamEvents: async () => {},
    }

    await run('test prompt', { maxTurns: 5 }, dependencies)

    expect(capturedPrompt).toBe('test prompt')
    expect(capturedOptions).toEqual({ maxTurns: 5 })
  })

  test('streams events to stdout sink', async () => {
    const streamedEvents: unknown[] = []
    let usedSink: unknown = null

    const fakeSink = { write: () => {}, line: () => {} }

    const dependencies: RunnerDependencies = {
      spawnClaudeCode: () =>
        (async function* () {
          yield { type: 'event1' }
          yield { type: 'event2' }
        })(),
      createStdoutSink: () => fakeSink,
      streamEvents: async (events, sink) => {
        usedSink = sink
        for await (const e of events) {
          streamedEvents.push(e)
        }
      },
    }

    await run('test', {}, dependencies)

    expect(usedSink).toBe(fakeSink)
    expect(streamedEvents).toEqual([{ type: 'event1' }, { type: 'event2' }])
  })

  test('passes onRawEvent callback to streamEvents when using RunOptions', async () => {
    let capturedCallback: RawEventCallback | undefined

    const fakeSink = { write: () => {}, line: () => {} }
    const onRawEvent: RawEventCallback = () => {}

    const dependencies: RunnerDependencies = {
      spawnClaudeCode: () => (async function* () {})(),
      createStdoutSink: () => fakeSink,
      streamEvents: async (_events, _sink, callback) => {
        capturedCallback = callback
      },
    }

    await run(
      'test',
      { spawnOptions: { maxTurns: 5 }, onRawEvent },
      dependencies
    )

    expect(capturedCallback).toBe(onRawEvent)
  })

  test('extracts spawnOptions from RunOptions', async () => {
    let capturedOptions = {}

    const dependencies: RunnerDependencies = {
      spawnClaudeCode: (_prompt, options) => {
        capturedOptions = options ?? {}
        return (async function* () {})()
      },
      createStdoutSink: () => ({ write: () => {}, line: () => {} }),
      streamEvents: async () => {},
    }

    await run(
      'test',
      { spawnOptions: { maxTurns: 10, cwd: '/test' } },
      dependencies
    )

    expect(capturedOptions).toEqual({ maxTurns: 10, cwd: '/test' })
  })

  test('uses empty spawnOptions when RunOptions has only onRawEvent', async () => {
    let capturedOptions = {}

    const dependencies: RunnerDependencies = {
      spawnClaudeCode: (_prompt, options) => {
        capturedOptions = options ?? {}
        return (async function* () {})()
      },
      createStdoutSink: () => ({ write: () => {}, line: () => {} }),
      streamEvents: async () => {},
    }

    await run('test', { onRawEvent: () => {} }, dependencies)

    expect(capturedOptions).toEqual({})
  })

  test('passes undefined callback when using legacy SpawnOptions', async () => {
    let capturedCallback: RawEventCallback | undefined = () => {}

    const dependencies: RunnerDependencies = {
      spawnClaudeCode: () => (async function* () {})(),
      createStdoutSink: () => ({ write: () => {}, line: () => {} }),
      streamEvents: async (_events, _sink, callback) => {
        capturedCallback = callback
      },
    }

    await run('test', { maxTurns: 5 }, dependencies)

    expect(capturedCallback).toBeUndefined()
  })
})
