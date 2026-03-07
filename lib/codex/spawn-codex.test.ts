import { spawn } from 'node:child_process'
import { createInterface } from 'node:readline'
import { describe, expect, test } from 'vitest'
import { asCreateInterfaceStub, asSpawnStub } from '../test/test-utilities'
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
    spawn: asSpawnStub(() => {
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
    }),
    createInterface: asCreateInterfaceStub(() => ({
      async *[Symbol.asyncIterator]() {
        for (const line of lines) {
          yield line
        }
      },
    })),
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
      spawn: asSpawnStub((_cmd: string, spawnArguments: string[]) => {
        capturedArguments = spawnArguments
        return {
          stdout: {},
          on(event: string, listener: EventListener) {
            if (event === 'close') setTimeout(() => listener(0), 0)
            return this
          },
        }
      }),
      createInterface: asCreateInterfaceStub(() => ({
        async *[Symbol.asyncIterator]() {
          // no lines
        },
      })),
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
      spawn: asSpawnStub((_cmd: string, spawnArguments: string[]) => {
        capturedArguments = spawnArguments
        return {
          stdout: {},
          on(event: string, listener: EventListener) {
            if (event === 'close') setTimeout(() => listener(0), 0)
            return this
          },
        }
      }),
      createInterface: asCreateInterfaceStub(() => ({
        async *[Symbol.asyncIterator]() {
          // no lines
        },
      })),
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
      spawn: asSpawnStub(() => ({
        stdout: null,
        on: () => {},
      })),
      createInterface: asCreateInterfaceStub(() => ({
        async *[Symbol.asyncIterator]() {},
      })),
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

  test('kills process immediately when signal is already aborted', async () => {
    let killCalled = false
    const controller = new AbortController()
    controller.abort()

    const dependencies: EventSourceDependencies = {
      spawn: asSpawnStub(() => {
        return {
          killed: false,
          kill() {
            killCalled = true
            ;(this as { killed: boolean }).killed = true
            return true
          },
          stdout: {},
          stderr: { on: () => {} },
          on(event: string, listener: EventListener) {
            if (event === 'close') setTimeout(() => listener(0), 0)
            return this
          },
        }
      }),
      createInterface: asCreateInterfaceStub(() => ({
        close: () => {},
        async *[Symbol.asyncIterator]() {
          // no lines
        },
      })),
    }

    for await (const _ of spawnCodex(
      'test',
      { signal: controller.signal },
      dependencies
    )) {
      // consume
    }

    expect(killCalled).toBe(true)
  })

  test('registers abort handler and kills process when signal aborts', async () => {
    let killCalled = false
    const closeListeners: EventListener[] = []
    const controller = new AbortController()

    const dependencies: EventSourceDependencies = {
      spawn: asSpawnStub(() => {
        return {
          killed: false,
          kill() {
            killCalled = true
            ;(this as { killed: boolean }).killed = true
            for (const listener of closeListeners) listener(0)
            return true
          },
          stdout: {},
          stderr: { on: () => {} },
          on(event: string, listener: EventListener) {
            if (event === 'close') {
              closeListeners.push(listener)
            }
            return this
          },
        }
      }),
      createInterface: asCreateInterfaceStub(() => ({
        close: () => {},
        async *[Symbol.asyncIterator]() {
          await new Promise(resolve => setTimeout(resolve, 0))
        },
      })),
    }

    const consume = (async () => {
      for await (const _ of spawnCodex(
        'test',
        { signal: controller.signal },
        dependencies
      )) {
        // consume
      }
    })()

    controller.abort()
    await consume
    expect(killCalled).toBe(true)
  })

  test('does not call kill when signal aborts an already-killed process', async () => {
    let killCallCount = 0
    const controller = new AbortController()
    controller.abort()

    const dependencies: EventSourceDependencies = {
      spawn: asSpawnStub(() => {
        return {
          killed: true,
          kill() {
            killCallCount++
            return true
          },
          stdout: {},
          stderr: { on: () => {} },
          on(event: string, listener: EventListener) {
            if (event === 'close') setTimeout(() => listener(0), 0)
            return this
          },
        }
      }),
      createInterface: asCreateInterfaceStub(() => ({
        close: () => {},
        async *[Symbol.asyncIterator]() {
          // no lines
        },
      })),
    }

    for await (const _ of spawnCodex(
      'test',
      { signal: controller.signal },
      dependencies
    )) {
      // consume
    }

    expect(killCallCount).toBe(0)
  })
})
