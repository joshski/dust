import { request as httpRequest } from 'node:http'
import { afterEach, describe, expect, test } from 'vitest'
import type { CommandEventMessage } from '../command-events'
import {
  type CommandEventsProxy,
  isCommandEventMessage,
  startCommandEventsProxy,
} from './command-events-proxy'

const testMessage: CommandEventMessage = {
  sequence: 1,
  timestamp: '2026-03-06T00:00:00.000Z',
  event: { type: 'tasks-listed', tasks: [] },
}

async function postJson(
  port: number,
  path: string,
  method: string,
  body: string
): Promise<{ statusCode: number }> {
  return new Promise((resolve, reject) => {
    const request = httpRequest(
      {
        hostname: '127.0.0.1',
        port,
        path,
        method,
        headers: {
          'content-type': 'application/json',
          'content-length': Buffer.byteLength(body),
        },
      },
      response => {
        resolve({ statusCode: response.statusCode ?? 0 })
      }
    )
    request.on('error', reject)
    request.write(body)
    request.end()
  })
}

describe('isCommandEventMessage', () => {
  test('returns false for non-object payloads', () => {
    expect(isCommandEventMessage(null)).toBe(false)
  })

  test('returns false when sequence is missing', () => {
    expect(
      isCommandEventMessage({
        timestamp: '2026-03-06T00:00:00.000Z',
        event: { type: 'tasks-listed' },
      })
    ).toBe(false)
  })

  test('returns false when event is not an object', () => {
    expect(
      isCommandEventMessage({
        sequence: 1,
        timestamp: '2026-03-06T00:00:00.000Z',
        event: 'tasks-listed',
      })
    ).toBe(false)
  })

  test('returns true for valid payload', () => {
    expect(isCommandEventMessage(testMessage)).toBe(true)
  })

  test('returns false when event type is missing', () => {
    expect(
      isCommandEventMessage({
        sequence: 1,
        timestamp: '2026-03-06T00:00:00.000Z',
        event: {},
      })
    ).toBe(false)
  })
})

describe('startCommandEventsProxy', () => {
  let proxy: CommandEventsProxy | undefined

  afterEach(async () => {
    await proxy?.stop()
  })

  test('forwards accepted POST /events payloads', async () => {
    const events: CommandEventMessage[] = []
    proxy = await startCommandEventsProxy(event => events.push(event))

    const response = await postJson(
      proxy.port,
      '/events',
      'POST',
      JSON.stringify(testMessage)
    )

    expect(response.statusCode).toBe(202)
    expect(events).toEqual([testMessage])
  })

  test('rejects invalid JSON payloads', async () => {
    proxy = await startCommandEventsProxy(() => {})
    const response = await postJson(proxy.port, '/events', 'POST', '{')
    expect(response.statusCode).toBe(400)
  })

  test('rejects invalid event payloads', async () => {
    proxy = await startCommandEventsProxy(() => {})
    const response = await postJson(
      proxy.port,
      '/events',
      'POST',
      JSON.stringify({ sequence: 1 })
    )
    expect(response.statusCode).toBe(400)
  })

  test('returns 405 for non-POST methods', async () => {
    proxy = await startCommandEventsProxy(() => {})
    const response = await postJson(proxy.port, '/events', 'GET', '')
    expect(response.statusCode).toBe(405)
  })

  test('returns 404 for unknown paths', async () => {
    proxy = await startCommandEventsProxy(() => {})
    const response = await postJson(proxy.port, '/unknown', 'POST', '{}')
    expect(response.statusCode).toBe(404)
  })

  test('returns 413 for oversized payloads', async () => {
    proxy = await startCommandEventsProxy(() => {})
    const oversizedBody = `"${'x'.repeat(1024 * 1024 + 10)}"`
    const response = await postJson(
      proxy.port,
      '/events',
      'POST',
      oversizedBody
    )
    expect(response.statusCode).toBe(413)
  })

  test('returns 502 when forward handler throws', async () => {
    proxy = await startCommandEventsProxy(() => {
      throw new Error('cannot forward')
    })
    const response = await postJson(
      proxy.port,
      '/events',
      'POST',
      JSON.stringify(testMessage)
    )
    expect(response.statusCode).toBe(502)
  })
})
