import { spawn } from 'node:child_process'
import { createInterface } from 'node:readline'
import { describe, expect, test } from 'vitest'
import {
  defaultDependencies,
  type EventSourceDependencies,
  spawnClaudeCode,
} from './spawn-claude-code'

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

describe('spawnClaudeCode', () => {
  test('defaultDependencies uses real node implementations', () => {
    expect(defaultDependencies.spawn).toBe(spawn)
    expect(defaultDependencies.createInterface).toBe(createInterface)
  })

  test('yields parsed JSON events', async () => {
    const dependencies = createMockDependencies([
      '{"type": "stream_event", "data": "hello"}',
      '{"type": "result", "subtype": "success"}',
    ])

    const events = []
    for await (const event of spawnClaudeCode(
      'test prompt',
      {},
      dependencies
    )) {
      events.push(event)
    }

    expect(events).toEqual([
      { type: 'stream_event', data: 'hello' },
      { type: 'result', subtype: 'success' },
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
    for await (const event of spawnClaudeCode('test', {}, dependencies)) {
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
    for await (const event of spawnClaudeCode('test', {}, dependencies)) {
      events.push(event)
    }

    expect(events).toEqual([{ type: 'valid' }, { type: 'also valid' }])
  })

  test('rejects on non-zero exit code', async () => {
    const dependencies = createMockDependencies(['{"type": "event"}'], 1)

    const consume = async () => {
      for await (const _ of spawnClaudeCode('test', {}, dependencies)) {
        // consume
      }
    }

    await expect(consume()).rejects.toThrow('claude exited with code 1')
  })

  test('passes options as CLI arguments', async () => {
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

    for await (const _ of spawnClaudeCode(
      'my prompt',
      {
        maxTurns: 5,
        model: 'claude-3',
        allowedTools: ['Read', 'Write'],
        systemPrompt: 'Be helpful',
        sessionId: 'sess-123',
      },
      dependencies
    )) {
      // consume
    }

    expect(capturedArguments).toContain('-p')
    expect(capturedArguments).toContain('my prompt')
    expect(capturedArguments).toContain('--max-turns')
    expect(capturedArguments).toContain('5')
    expect(capturedArguments).toContain('--model')
    expect(capturedArguments).toContain('claude-3')
    expect(capturedArguments).toContain('--allowedTools')
    expect(capturedArguments).toContain('Read')
    expect(capturedArguments).toContain('Write')
    expect(capturedArguments).toContain('--system-prompt')
    expect(capturedArguments).toContain('Be helpful')
    expect(capturedArguments).toContain('--session-id')
    expect(capturedArguments).toContain('sess-123')
  })

  test('passes dangerously-skip-permissions flag when enabled', async () => {
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

    for await (const _ of spawnClaudeCode(
      'test prompt',
      { dangerouslySkipPermissions: true },
      dependencies
    )) {
      // consume
    }

    expect(capturedArguments).toContain('--dangerously-skip-permissions')
  })

  test('includes stderr in error message on non-zero exit', async () => {
    const dependencies = createMockDependencies(
      ['{"type": "event"}'],
      1,
      undefined,
      'Something went wrong'
    )

    const consume = async () => {
      for await (const _ of spawnClaudeCode('test', {}, dependencies)) {
        // consume
      }
    }

    await expect(consume()).rejects.toThrow(
      'claude exited with code 1: Something went wrong'
    )
  })

  test('handles process error', async () => {
    const dependencies = createMockDependencies(
      [],
      0,
      new Error('spawn failed')
    )

    const consume = async () => {
      for await (const _ of spawnClaudeCode('test', {}, dependencies)) {
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
      for await (const _ of spawnClaudeCode('test', {}, dependencies)) {
        // consume
      }
    }

    await expect(consume()).rejects.toThrow(
      'Failed to get stdout from claude process'
    )
  })

  test('kills process immediately when signal is already aborted', async () => {
    let killCalled = false
    const controller = new AbortController()
    controller.abort()

    const dependencies: EventSourceDependencies = {
      spawn: (() => {
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
      }) as unknown as typeof spawn,
      createInterface: (() => ({
        close: () => {},
        async *[Symbol.asyncIterator]() {
          // no lines
        },
      })) as unknown as typeof createInterface,
    }

    for await (const _ of spawnClaudeCode(
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
      spawn: (() => {
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
      }) as unknown as typeof spawn,
      createInterface: (() => ({
        close: () => {},
        async *[Symbol.asyncIterator]() {
          await new Promise(resolve => setTimeout(resolve, 0))
        },
      })) as unknown as typeof createInterface,
    }

    const consume = (async () => {
      for await (const _ of spawnClaudeCode(
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
      spawn: (() => {
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
      }) as unknown as typeof spawn,
      createInterface: (() => ({
        close: () => {},
        async *[Symbol.asyncIterator]() {
          // no lines
        },
      })) as unknown as typeof createInterface,
    }

    for await (const _ of spawnClaudeCode(
      'test',
      { signal: controller.signal },
      dependencies
    )) {
      // consume
    }
    expect(killCallCount).toBe(0)
  })
})
