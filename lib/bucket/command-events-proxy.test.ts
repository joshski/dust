import { request as httpRequest } from 'node:http'
import { afterEach, describe, expect, test } from 'vitest'
import type { CommandEventMessage } from '../command-events'
import {
  type CommandEventsProxy,
  isCommandEventMessage,
  startCommandEventsProxy,
  type ToolExecutionRequest,
  type ToolExecutionResult,
} from './command-events-proxy'
import type { ToolDefinition } from './server-messages'

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
): Promise<{ statusCode: number; body: string }> {
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
        const chunks: Buffer[] = []
        response.on('data', (chunk: Buffer) => {
          chunks.push(chunk)
        })
        response.on('end', () => {
          resolve({
            statusCode: response.statusCode ?? 0,
            body: Buffer.concat(chunks).toString('utf8'),
          })
        })
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

  const getProxyPort = (): number => {
    if (!proxy) {
      throw new Error('proxy not initialized')
    }
    return proxy.port
  }

  const createProxy = async (
    overrides: Partial<{
      forwardEvent: (event: CommandEventMessage) => void
      getTools: () => ToolDefinition[]
      forwardToolExecution: (
        request: ToolExecutionRequest
      ) => Promise<ToolExecutionResult>
    }> = {}
  ) => {
    proxy = await startCommandEventsProxy({
      forwardEvent: overrides.forwardEvent ?? (() => {}),
      getTools: overrides.getTools ?? (() => []),
      forwardToolExecution:
        overrides.forwardToolExecution ??
        (async () => ({
          status: 'success',
          output: 'ok',
        })),
    })
  }

  afterEach(async () => {
    await proxy?.stop()
  })

  test('forwards accepted POST /events payloads', async () => {
    const events: CommandEventMessage[] = []
    await createProxy({
      forwardEvent: event => events.push(event),
    })

    const response = await postJson(
      getProxyPort(),
      '/events',
      'POST',
      JSON.stringify(testMessage)
    )

    expect(response.statusCode).toBe(202)
    expect(events).toEqual([testMessage])
  })

  test('rejects invalid JSON payloads', async () => {
    await createProxy()
    const response = await postJson(getProxyPort(), '/events', 'POST', '{')
    expect(response.statusCode).toBe(400)
  })

  test('rejects invalid event payloads', async () => {
    await createProxy()
    const response = await postJson(
      getProxyPort(),
      '/events',
      'POST',
      JSON.stringify({ sequence: 1 })
    )
    expect(response.statusCode).toBe(400)
  })

  test('returns 405 for non-POST methods', async () => {
    await createProxy()
    const response = await postJson(getProxyPort(), '/events', 'GET', '')
    expect(response.statusCode).toBe(405)
  })

  test('returns 404 for unknown paths', async () => {
    await createProxy()
    const response = await postJson(getProxyPort(), '/unknown', 'POST', '{}')
    expect(response.statusCode).toBe(404)
  })

  test('returns 413 for oversized payloads', async () => {
    await createProxy()
    const oversizedBody = `"${'x'.repeat(1024 * 1024 + 10)}"`
    const response = await postJson(
      getProxyPort(),
      '/events',
      'POST',
      oversizedBody
    )
    expect(response.statusCode).toBe(413)
  })

  test('returns 502 when forward handler throws', async () => {
    await createProxy({
      forwardEvent: () => {
        throw new Error('cannot forward')
      },
    })
    const response = await postJson(
      getProxyPort(),
      '/events',
      'POST',
      JSON.stringify(testMessage)
    )
    expect(response.statusCode).toBe(502)
  })

  test('forwards POST /tools/:name and returns success payload', async () => {
    let capturedToolName = ''
    let capturedArgs: string[] = []
    let capturedRepositoryId = ''
    await createProxy({
      forwardToolExecution: async request => {
        capturedToolName = request.toolName
        capturedArgs = request.arguments
        capturedRepositoryId = request.repositoryId
        return { status: 'success', output: 'https://example.com/asset.png' }
      },
    })

    const response = await postJson(
      getProxyPort(),
      '/tools/asset-upload',
      'POST',
      JSON.stringify({
        arguments: ['/tmp/file.png'],
        repositoryId: 'repo-123',
      })
    )

    expect(response.statusCode).toBe(200)
    expect(capturedToolName).toBe('asset-upload')
    expect(capturedArgs).toEqual(['/tmp/file.png'])
    expect(capturedRepositoryId).toBe('repo-123')
    expect(response.body).toContain('"success":true')
    expect(response.body).toContain('"status":"success"')
  })

  test('returns tool definitions for GET /tools', async () => {
    const tools: ToolDefinition[] = [
      {
        name: 'asset-upload',
        description: 'Upload a file',
        endpoint: '/api/assets',
        method: 'POST',
        parameters: [],
      },
    ]

    await createProxy({
      getTools: () => tools,
    })
    const response = await postJson(getProxyPort(), '/tools', 'GET', '')
    expect(response.statusCode).toBe(200)
    expect(response.body).toBe(JSON.stringify({ tools }))
  })

  test('returns 405 for non-GET methods on /tools', async () => {
    await createProxy()
    const response = await postJson(getProxyPort(), '/tools', 'POST', '{}')
    expect(response.statusCode).toBe(405)
  })

  test('returns 404 for tool-not-found proxy results', async () => {
    await createProxy({
      forwardToolExecution: async () => ({
        status: 'tool-not-found',
        error: 'Unknown tool: nope',
      }),
    })

    const response = await postJson(
      getProxyPort(),
      '/tools/nope',
      'POST',
      JSON.stringify({
        arguments: [],
        repositoryId: 'repo-123',
      })
    )

    expect(response.statusCode).toBe(404)
    expect(response.body).toContain('"success":false')
    expect(response.body).toContain('"status":"tool-not-found"')
  })

  test('returns 502 for proxied tool execution errors', async () => {
    await createProxy({
      forwardToolExecution: async () => ({
        status: 'error',
        error: 'upstream failed',
      }),
    })

    const response = await postJson(
      getProxyPort(),
      '/tools/break',
      'POST',
      JSON.stringify({
        arguments: ['x'],
        repositoryId: 'repo-123',
      })
    )

    expect(response.statusCode).toBe(502)
    expect(response.body).toContain('"status":"error"')
  })

  test('returns 405 for non-POST methods on /tools/:name', async () => {
    await createProxy()
    const response = await postJson(getProxyPort(), '/tools/ping', 'GET', '')
    expect(response.statusCode).toBe(405)
  })

  test('rejects invalid JSON payloads for /tools/:name', async () => {
    await createProxy()
    const response = await postJson(getProxyPort(), '/tools/ping', 'POST', '{')
    expect(response.statusCode).toBe(400)
  })

  test('rejects invalid tool payload shape for /tools/:name', async () => {
    await createProxy()
    const response = await postJson(
      getProxyPort(),
      '/tools/ping',
      'POST',
      JSON.stringify({
        arguments: [1],
        repositoryId: 'repo-123',
      })
    )
    expect(response.statusCode).toBe(400)
  })

  test('rejects non-object tool payloads for /tools/:name', async () => {
    await createProxy()
    const response = await postJson(
      getProxyPort(),
      '/tools/ping',
      'POST',
      JSON.stringify('not-an-object')
    )
    expect(response.statusCode).toBe(400)
  })

  test('rejects tool payloads missing arguments array', async () => {
    await createProxy()
    const response = await postJson(
      getProxyPort(),
      '/tools/ping',
      'POST',
      JSON.stringify({
        repositoryId: 'repo-123',
      })
    )
    expect(response.statusCode).toBe(400)
  })

  test('returns 502 when tool forwarding rejects with a non-error value', async () => {
    await createProxy({
      forwardToolExecution: async () => Promise.reject('socket closed'),
    })
    const response = await postJson(
      getProxyPort(),
      '/tools/ping',
      'POST',
      JSON.stringify({
        arguments: [],
        repositoryId: 'repo-123',
      })
    )
    expect(response.statusCode).toBe(502)
    expect(response.body).toContain('socket closed')
  })

  test('returns 502 when tool forwarding rejects with an Error', async () => {
    await createProxy({
      forwardToolExecution: async () =>
        Promise.reject(new Error('forward failed')),
    })
    const response = await postJson(
      getProxyPort(),
      '/tools/ping',
      'POST',
      JSON.stringify({
        arguments: [],
        repositoryId: 'repo-123',
      })
    )
    expect(response.statusCode).toBe(502)
    expect(response.body).toContain('forward failed')
  })
})
