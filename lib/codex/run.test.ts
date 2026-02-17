import { describe, expect, test } from 'vitest'
import type { RawEvent } from '../claude/types'
import { defaultRunnerDependencies, type RunnerDependencies, run } from './run'

describe('run', () => {
  test('defaultRunnerDependencies has all required functions', () => {
    expect(typeof defaultRunnerDependencies.spawnCodex).toBe('function')
    expect(typeof defaultRunnerDependencies.createStdoutSink).toBe('function')
    expect(typeof defaultRunnerDependencies.streamCodexEvents).toBe('function')
  })

  test('wires spawn, streamer, and sink together', async () => {
    let capturedEvents: AsyncIterable<RawEvent> | undefined
    let streamCalled = false

    const dependencies: RunnerDependencies = {
      spawnCodex: async function* () {
        yield { type: 'message', content: 'hello' }
      },
      createStdoutSink: () => ({
        write: () => {},
        line: () => {},
      }),
      streamCodexEvents: async events => {
        capturedEvents = events
        streamCalled = true
        // Consume to trigger generator
        for await (const _ of events) {
          // drain
        }
      },
    }

    await run('test prompt', {}, dependencies)
    expect(streamCalled).toBe(true)
    expect(capturedEvents).toBeDefined()
  })

  test('supports RunOptions with spawnOptions and onRawEvent', async () => {
    let capturedOnRawEvent: unknown

    const dependencies: RunnerDependencies = {
      spawnCodex: async function* () {
        // empty
      },
      createStdoutSink: () => ({
        write: () => {},
        line: () => {},
      }),
      streamCodexEvents: async (_events, _sink, onRawEvent) => {
        capturedOnRawEvent = onRawEvent
      },
    }

    const onRawEvent = () => {}
    await run(
      'test',
      { spawnOptions: { cwd: '/tmp' }, onRawEvent },
      dependencies
    )
    expect(capturedOnRawEvent).toBe(onRawEvent)
  })

  test('defaults spawnOptions to empty when RunOptions has only onRawEvent', async () => {
    let streamCalled = false

    const dependencies: RunnerDependencies = {
      spawnCodex: async function* () {
        // empty
      },
      createStdoutSink: () => ({
        write: () => {},
        line: () => {},
      }),
      streamCodexEvents: async () => {
        streamCalled = true
      },
    }

    await run('test', { onRawEvent: () => {} }, dependencies)
    expect(streamCalled).toBe(true)
  })

  test('supports legacy SpawnOptions directly', async () => {
    let streamCalled = false

    const dependencies: RunnerDependencies = {
      spawnCodex: async function* () {
        // empty
      },
      createStdoutSink: () => ({
        write: () => {},
        line: () => {},
      }),
      streamCodexEvents: async () => {
        streamCalled = true
      },
    }

    await run('test', { cwd: '/legacy' }, dependencies)
    expect(streamCalled).toBe(true)
  })
})
