import { describe, expect, test } from 'vitest'
import type { CommandEventMessage } from './command-events'
import {
  createCommandEventWriter,
  DUST_EVENTS_FD,
  DUST_PROXY_PORT,
  parseProxyPort,
} from './command-events-transport'

const testMessage: CommandEventMessage = {
  sequence: 0,
  timestamp: '2026-03-06T00:00:00.000Z',
  event: { type: 'tasks-listed', tasks: [] },
}

function waitForAsyncCallbacks(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 0))
}

describe('parseProxyPort', () => {
  test('returns undefined for non-numeric values', () => {
    expect(parseProxyPort('abc')).toBeUndefined()
  })

  test('returns undefined for out-of-range values', () => {
    expect(parseProxyPort('0')).toBeUndefined()
    expect(parseProxyPort('70000')).toBeUndefined()
  })

  test('returns parsed port for valid values', () => {
    expect(parseProxyPort('3000')).toBe(3000)
  })
})

describe('createCommandEventWriter', () => {
  test('returns undefined when no transport environment is configured', () => {
    const writer = createCommandEventWriter({})
    expect(writer).toBeUndefined()
  })

  test('prefers DUST_EVENTS_FD when both transports are configured', () => {
    const writeCalls: Array<{ fd: number; text: string }> = []
    const fetchCalls: Array<{ input: string; init: unknown }> = []
    const errorMessages: string[] = []

    const writer = createCommandEventWriter(
      { [DUST_EVENTS_FD]: '3', [DUST_PROXY_PORT]: '4123' },
      {
        writeSync: (fd, text) => {
          writeCalls.push({ fd, text: String(text) })
          return String(text).length
        },
        fetch: async (input, init) => {
          fetchCalls.push({ input, init })
          return { ok: true, status: 202 }
        },
        onError: message => {
          errorMessages.push(message)
        },
      }
    )

    writer?.(testMessage)
    expect(writeCalls).toEqual([
      { fd: 3, text: `${JSON.stringify(testMessage)}\n` },
    ])
    expect(fetchCalls).toEqual([])
    expect(errorMessages).toEqual([])
  })

  test('posts to proxy when DUST_PROXY_PORT is configured', async () => {
    const fetchCalls: Array<{
      input: string
      init: { method: string; headers: Record<string, string>; body: string }
    }> = []
    const errorMessages: string[] = []

    const writer = createCommandEventWriter(
      { [DUST_PROXY_PORT]: '4123' },
      {
        writeSync: () => 0,
        fetch: async (input, init) => {
          fetchCalls.push({ input, init })
          return { ok: true, status: 202 }
        },
        onError: message => {
          errorMessages.push(message)
        },
      }
    )

    writer?.(testMessage)
    await waitForAsyncCallbacks()

    expect(fetchCalls).toEqual([
      {
        input: 'http://127.0.0.1:4123/events',
        init: {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            connection: 'close',
          },
          body: JSON.stringify(testMessage),
        },
      },
    ])
    expect(errorMessages).toEqual([])
  })

  test('reports proxy transport errors when endpoint is unreachable', async () => {
    const errorMessages: string[] = []

    const writer = createCommandEventWriter(
      { [DUST_PROXY_PORT]: '4123' },
      {
        writeSync: () => 0,
        fetch: async () => {
          throw new Error('connect ECONNREFUSED')
        },
        onError: message => {
          errorMessages.push(message)
        },
      }
    )

    writer?.(testMessage)
    await waitForAsyncCallbacks()

    expect(errorMessages[0]).toContain(
      'Event proxy POST failed (connect ECONNREFUSED)'
    )
  })

  test('reports non-error rejections from proxy fetch', async () => {
    const errorMessages: string[] = []

    const writer = createCommandEventWriter(
      { [DUST_PROXY_PORT]: '4123' },
      {
        writeSync: () => 0,
        fetch: async () => {
          throw 'socket closed'
        },
        onError: message => {
          errorMessages.push(message)
        },
      }
    )

    writer?.(testMessage)
    await waitForAsyncCallbacks()

    expect(errorMessages[0]).toContain(
      'Event proxy POST failed (socket closed)'
    )
  })

  test('reports non-2xx proxy responses', async () => {
    const errorMessages: string[] = []

    const writer = createCommandEventWriter(
      { [DUST_PROXY_PORT]: '4123' },
      {
        writeSync: () => 0,
        fetch: async () => ({ ok: false, status: 503 }),
        onError: message => {
          errorMessages.push(message)
        },
      }
    )

    writer?.(testMessage)
    await waitForAsyncCallbacks()

    expect(errorMessages).toEqual([
      'Event proxy POST failed (503): http://127.0.0.1:4123/events',
    ])
  })

  test('uses default dependencies when dependency argument is omitted', async () => {
    const originalFetch = globalThis.fetch
    const originalConsoleError = console.error
    const fetchCalls: string[] = []
    const errorMessages: string[] = []

    try {
      globalThis.fetch = (async input => {
        fetchCalls.push(String(input))
        return { ok: false, status: 500 } as Response
      }) as typeof fetch
      console.error = (message?: unknown) => {
        errorMessages.push(String(message))
      }

      const writer = createCommandEventWriter({ [DUST_PROXY_PORT]: '4123' })
      writer?.(testMessage)
      await waitForAsyncCallbacks()
    } finally {
      globalThis.fetch = originalFetch
      console.error = originalConsoleError
    }

    expect(fetchCalls).toEqual(['http://127.0.0.1:4123/events'])
    expect(errorMessages[0]).toContain('Event proxy POST failed (500)')
  })
})
