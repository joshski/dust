import { spawn } from 'node:child_process'
import { createInterface } from 'node:readline'
import { describe, expect, test } from 'vitest'
import {
  defaultDependencies,
  type EventSourceDependencies,
  spawnCodex,
} from './spawn-codex'

type EventListener = (...values: unknown[]) => void

function createMockDependencies(
  lines: string[],
  exitCode: number | null = 0,
  errorToThrow?: Error,
  stderrData?: string
): EventSourceDependencies {
  return {
    spawn: (() => {
      const listeners: Record<string, EventListener[]> = {}
      const stderrListeners: Record<string, EventListener[]> = {}
      return {
        stdout: {},
        stderr: {
          on(event: string, listener: EventListener) {
            stderrListeners[event] = stderrListeners[event] || []
            stderrListeners[event].push(listener)
            if (event === 'data' && stderrData) {
              setTimeout(() => listener(Buffer.from(stderrData)), 0)
            }
            return this
          },
        },
        on(event: string, listener: EventListener) {
          listeners[event] = listeners[event] || []
          listeners[event].push(listener)
          if (event === 'close' && !errorToThrow) {
            setTimeout(() => listener(exitCode), 10)
          }
          if (event === 'error' && errorToThrow) {
            setTimeout(() => listener(errorToThrow), 0)
          }
          return this
        },
      }
    }) as unknown as typeof spawn,
    createInterface: (() => ({
      async *[Symbol.asyncIterator]() {
        for (const line of lines) {
          yield line
        }
      },
    })) as unknown as typeof createInterface,
  }
}

describe('spawnCodex', () => {
  test('defaultDependencies uses real node implementations', () => {
    expect(defaultDependencies.spawn).toBe(spawn)
    expect(defaultDependencies.createInterface).toBe(createInterface)
  })

  test('yields parsed JSON events', async () => {
    const dependencies = createMockDependencies([
      '{"type": "message", "content": "hello"}',
      '{"type": "done"}',
    ])

    const events = []
    for await (const event of spawnCodex('test prompt', {}, dependencies)) {
      events.push(event)
    }

    expect(events).toEqual([
      { type: 'message', content: 'hello' },
      { type: 'done' },
    ])
  })

  test('skips empty lines', async () => {
    const dependencies = createMockDependencies([
      '{"type": "event1"}',
      '',
      '   ',
      '{"type": "event2"}',
    ])

    const events = []
    for await (const event of spawnCodex('test', {}, dependencies)) {
      events.push(event)
    }

    expect(events).toEqual([{ type: 'event1' }, { type: 'event2' }])
  })

  test('skips malformed JSON lines', async () => {
    const dependencies = createMockDependencies([
      '{"type": "valid"}',
      'not json',
      '{"type": "also valid"}',
    ])

    const events = []
    for await (const event of spawnCodex('test', {}, dependencies)) {
      events.push(event)
    }

    expect(events).toEqual([{ type: 'valid' }, { type: 'also valid' }])
  })

  test('rejects on non-zero exit code', async () => {
    const dependencies = createMockDependencies(['{"type": "event"}'], 1)

    const consume = async () => {
      for await (const _ of spawnCodex('test', {}, dependencies)) {
        // consume
      }
    }

    await expect(consume()).rejects.toThrow('codex exited with code 1')
  })

  test('passes correct CLI arguments', async () => {
    let capturedArguments: string[] = []

    const dependencies: EventSourceDependencies = {
      spawn: ((_cmd: string, spawnArguments: string[]) => {
        capturedArguments = spawnArguments
        return {
          stdout: {},
          on(event: string, listener: EventListener) {
            if (event === 'close') setTimeout(() => listener(0), 0)
            return this
          },
        }
      }) as unknown as typeof spawn,
      createInterface: (() => ({
        async *[Symbol.asyncIterator]() {
          // no lines
        },
      })) as unknown as typeof createInterface,
    }

    for await (const _ of spawnCodex(
      'my prompt',
      { cwd: '/some/path' },
      dependencies
    )) {
      // consume
    }

    expect(capturedArguments).toContain('exec')
    expect(capturedArguments).toContain('my prompt')
    expect(capturedArguments).toContain('--json')
    expect(capturedArguments).toContain('--yolo')
    expect(capturedArguments).toContain('--cd')
    expect(capturedArguments).toContain('/some/path')
  })

  test('does not pass --cd when cwd is not set', async () => {
    let capturedArguments: string[] = []

    const dependencies: EventSourceDependencies = {
      spawn: ((_cmd: string, spawnArguments: string[]) => {
        capturedArguments = spawnArguments
        return {
          stdout: {},
          on(event: string, listener: EventListener) {
            if (event === 'close') setTimeout(() => listener(0), 0)
            return this
          },
        }
      }) as unknown as typeof spawn,
      createInterface: (() => ({
        async *[Symbol.asyncIterator]() {
          // no lines
        },
      })) as unknown as typeof createInterface,
    }

    for await (const _ of spawnCodex('test prompt', {}, dependencies)) {
      // consume
    }

    expect(capturedArguments).not.toContain('--cd')
  })

  test('includes stderr in error message on non-zero exit', async () => {
    const dependencies = createMockDependencies(
      ['{"type": "event"}'],
      1,
      undefined,
      'Something went wrong'
    )

    const consume = async () => {
      for await (const _ of spawnCodex('test', {}, dependencies)) {
        // consume
      }
    }

    await expect(consume()).rejects.toThrow(
      'codex exited with code 1: Something went wrong'
    )
  })

  test('handles process error', async () => {
    const dependencies = createMockDependencies(
      [],
      0,
      new Error('spawn failed')
    )

    const consume = async () => {
      for await (const _ of spawnCodex('test', {}, dependencies)) {
        // consume
      }
    }

    await expect(consume()).rejects.toThrow('spawn failed')
  })

  test('throws if stdout is null', async () => {
    const dependencies: EventSourceDependencies = {
      spawn: (() => ({
        stdout: null,
        on: () => {},
      })) as unknown as typeof spawn,
      createInterface: (() => ({
        async *[Symbol.asyncIterator]() {},
      })) as unknown as typeof createInterface,
    }

    const consume = async () => {
      for await (const _ of spawnCodex('test', {}, dependencies)) {
        // consume
      }
    }

    await expect(consume()).rejects.toThrow(
      'Failed to get stdout from codex process'
    )
  })
})
