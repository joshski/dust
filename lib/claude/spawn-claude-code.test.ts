import { spawn } from 'node:child_process'
import { createInterface } from 'node:readline'
import { describe, expect, test } from 'vitest'
import {
  defaultDependencies,
  type EventSourceDependencies,
  spawnClaudeCode,
} from './spawn-claude-code'

function createMockDependencies(
  lines: string[],
  exitCode: number | null = 0,
  errorToThrow?: Error
): EventSourceDependencies {
  return {
    spawn: (() => {
      const listeners: Record<string, ((...args: unknown[]) => void)[]> = {}
      return {
        stdout: {},
        on(event: string, listener: (...args: unknown[]) => void) {
          listeners[event] = listeners[event] || []
          listeners[event].push(listener)
          if (event === 'close' && !errorToThrow) {
            setTimeout(() => listener(exitCode), 0)
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
    let capturedArgs: string[] = []

    const dependencies: EventSourceDependencies = {
      spawn: ((_cmd: string, args: string[]) => {
        capturedArgs = args
        return {
          stdout: {},
          on(event: string, listener: (...args: unknown[]) => void) {
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

    expect(capturedArgs).toContain('-p')
    expect(capturedArgs).toContain('my prompt')
    expect(capturedArgs).toContain('--max-turns')
    expect(capturedArgs).toContain('5')
    expect(capturedArgs).toContain('--model')
    expect(capturedArgs).toContain('claude-3')
    expect(capturedArgs).toContain('--allowedTools')
    expect(capturedArgs).toContain('Read')
    expect(capturedArgs).toContain('Write')
    expect(capturedArgs).toContain('--system-prompt')
    expect(capturedArgs).toContain('Be helpful')
    expect(capturedArgs).toContain('--session-id')
    expect(capturedArgs).toContain('sess-123')
  })

  test('passes dangerously-skip-permissions flag when enabled', async () => {
    let capturedArgs: string[] = []

    const dependencies: EventSourceDependencies = {
      spawn: ((_cmd: string, args: string[]) => {
        capturedArgs = args
        return {
          stdout: {},
          on(event: string, listener: (...args: unknown[]) => void) {
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

    expect(capturedArgs).toContain('--dangerously-skip-permissions')
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
})
