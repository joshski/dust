import { describe, expect, test } from 'vitest'
import { defaultRunnerDependencies, type RunnerDependencies, run } from './run'
import { spawnClaudeCode } from './spawn-claude-code'
import { createStdoutSink, streamEvents } from './streamer'

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
})
