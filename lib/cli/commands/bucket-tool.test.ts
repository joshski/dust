import { describe, expect, test } from 'vitest'
import type { ToolDefinition } from '../../bucket/server-messages'
import {
  createContextEmulator,
  createFetchStub,
  createFileSystemEmulator,
} from '../../test/test-utilities'
import type { CommandDependencies } from '../types'
import { type BucketToolDependencies, bucketTool } from './bucket-tool'

const sampleTools: ToolDefinition[] = [
  {
    name: 'asset-upload',
    description: 'Upload a file',
    endpoint: '/api/assets',
    method: 'POST',
    parameters: [],
  },
]

function createCommandDependencies(
  commandArguments: string[]
): CommandDependencies {
  const context = createContextEmulator()
  const fileSystem = createFileSystemEmulator()
  return {
    arguments: commandArguments,
    context,
    fileSystem,
    globScanner: fileSystem,
    settings: { dustCommand: 'dust' },
  }
}

function createToolDependencies(
  fetchImpl: typeof fetch
): BucketToolDependencies {
  return {
    fetch: fetchImpl,
  }
}

describe('bucketTool', () => {
  test('uses default dependencies when dependency argument is omitted', async () => {
    const commandDependencies = createCommandDependencies([])
    const context = commandDependencies.context as ReturnType<
      typeof createContextEmulator
    >

    const result = await bucketTool(commandDependencies)

    expect(result.exitCode).toBe(1)
    expect(context.stderrLines.join('\n')).toContain('Usage:')
  })

  test('shows usage when no tool name provided', async () => {
    const commandDependencies = createCommandDependencies([])
    const context = commandDependencies.context as ReturnType<
      typeof createContextEmulator
    >

    const result = await bucketTool(
      commandDependencies,
      createToolDependencies(fetch)
    )

    expect(result.exitCode).toBe(1)
    expect(context.stderrLines.join('\n')).toContain('Usage:')
    expect(context.stderrLines.join('\n')).toContain('dust bucket tool <name>')
  })

  test('returns error when DUST_REPOSITORY_ID is not set', async () => {
    const commandDependencies = createCommandDependencies(['asset-upload'])
    const context = commandDependencies.context as ReturnType<
      typeof createContextEmulator
    >

    const result = await bucketTool(
      commandDependencies,
      createToolDependencies(fetch),
      {
        DUST_PROXY_PORT: '4444',
      }
    )

    expect(result.exitCode).toBe(1)
    expect(context.stderrLines.join('\n')).toContain('DUST_REPOSITORY_ID')
  })

  test('returns error when DUST_PROXY_PORT is not set', async () => {
    const commandDependencies = createCommandDependencies(['asset-upload'])
    const context = commandDependencies.context as ReturnType<
      typeof createContextEmulator
    >

    const result = await bucketTool(
      commandDependencies,
      createToolDependencies(fetch),
      {
        DUST_REPOSITORY_ID: 'repo-id',
      }
    )

    expect(result.exitCode).toBe(1)
    expect(context.stderrLines.join('\n')).toContain('DUST_PROXY_PORT')
  })

  test('returns error when tool list proxy request fails', async () => {
    const commandDependencies = createCommandDependencies(['asset-upload'])
    const context = commandDependencies.context as ReturnType<
      typeof createContextEmulator
    >
    const mockFetch = async () => {
      throw new Error('connect ECONNREFUSED')
    }

    const result = await bucketTool(
      commandDependencies,
      createToolDependencies(createFetchStub(mockFetch)),
      {
        DUST_REPOSITORY_ID: 'repo-id',
        DUST_PROXY_PORT: '4444',
      }
    )

    expect(result.exitCode).toBe(1)
    expect(context.stderrLines.join('\n')).toContain(
      'Tool proxy request failed: connect ECONNREFUSED'
    )
  })

  test('returns error when tools payload is invalid', async () => {
    const commandDependencies = createCommandDependencies(['asset-upload'])
    const context = commandDependencies.context as ReturnType<
      typeof createContextEmulator
    >
    const mockFetch = async () => new Response('ok', { status: 200 })

    const result = await bucketTool(
      commandDependencies,
      createToolDependencies(createFetchStub(mockFetch)),
      {
        DUST_REPOSITORY_ID: 'repo-id',
        DUST_PROXY_PORT: '4444',
      }
    )

    expect(result.exitCode).toBe(1)
    expect(context.stderrLines.join('\n')).toContain(
      'Invalid tools payload from local proxy'
    )
  })

  test('returns error when tools payload is valid JSON without tools array', async () => {
    const commandDependencies = createCommandDependencies(['asset-upload'])
    const context = commandDependencies.context as ReturnType<
      typeof createContextEmulator
    >
    const mockFetch = async () =>
      new Response(JSON.stringify({ ok: true }), { status: 200 })

    const result = await bucketTool(
      commandDependencies,
      createToolDependencies(createFetchStub(mockFetch)),
      {
        DUST_REPOSITORY_ID: 'repo-id',
        DUST_PROXY_PORT: '4444',
      }
    )

    expect(result.exitCode).toBe(1)
    expect(context.stderrLines.join('\n')).toContain(
      'Invalid tools payload from local proxy'
    )
  })

  test('returns plain-text proxy error when tools endpoint returns non-2xx', async () => {
    const commandDependencies = createCommandDependencies(['asset-upload'])
    const context = commandDependencies.context as ReturnType<
      typeof createContextEmulator
    >
    const mockFetch = async () =>
      new Response('proxy unavailable', { status: 503 })

    const result = await bucketTool(
      commandDependencies,
      createToolDependencies(createFetchStub(mockFetch)),
      {
        DUST_REPOSITORY_ID: 'repo-id',
        DUST_PROXY_PORT: '4444',
      }
    )

    expect(result.exitCode).toBe(1)
    expect(context.stderrLines.join('\n')).toContain('proxy unavailable')
  })

  test('falls back to status code message for empty non-2xx tools response body', async () => {
    const commandDependencies = createCommandDependencies(['asset-upload'])
    const context = commandDependencies.context as ReturnType<
      typeof createContextEmulator
    >
    const mockFetch = async () => new Response('', { status: 503 })

    const result = await bucketTool(
      commandDependencies,
      createToolDependencies(createFetchStub(mockFetch)),
      {
        DUST_REPOSITORY_ID: 'repo-id',
        DUST_PROXY_PORT: '4444',
      }
    )

    expect(result.exitCode).toBe(1)
    expect(context.stderrLines.join('\n')).toContain(
      'Tool proxy request failed (503)'
    )
  })

  test('returns error when tool is not available from proxy tool list', async () => {
    const commandDependencies = createCommandDependencies(['missing'])
    const context = commandDependencies.context as ReturnType<
      typeof createContextEmulator
    >

    const mockFetch = async () =>
      new Response(JSON.stringify({ tools: sampleTools }), { status: 200 })

    const result = await bucketTool(
      commandDependencies,
      createToolDependencies(createFetchStub(mockFetch)),
      {
        DUST_REPOSITORY_ID: 'repo-id',
        DUST_PROXY_PORT: '4444',
      }
    )

    expect(result.exitCode).toBe(1)
    expect(context.stderrLines.join('\n')).toContain('Unknown tool: missing')
    expect(context.stderrLines.join('\n')).toContain('asset-upload')
  })

  test('shows message when no tools are available from proxy', async () => {
    const commandDependencies = createCommandDependencies(['missing'])
    const context = commandDependencies.context as ReturnType<
      typeof createContextEmulator
    >

    const mockFetch = async () =>
      new Response(JSON.stringify({ tools: [] }), { status: 200 })

    const result = await bucketTool(
      commandDependencies,
      createToolDependencies(createFetchStub(mockFetch)),
      {
        DUST_REPOSITORY_ID: 'repo-id',
        DUST_PROXY_PORT: '4444',
      }
    )

    expect(result.exitCode).toBe(1)
    expect(context.stderrLines.join('\n')).toContain('No tools available')
  })

  test('executes tool via proxy and outputs result', async () => {
    const commandDependencies = createCommandDependencies([
      'asset-upload',
      '/tmp/file.png',
    ])
    const context = commandDependencies.context as ReturnType<
      typeof createContextEmulator
    >

    const requests: Array<{ url: string; method: string; body: string }> = []
    const mockFetch = async (input: URL | RequestInfo, init?: RequestInit) => {
      requests.push({
        url: String(input),
        method: String(init?.method ?? ''),
        body: String(init?.body ?? ''),
      })

      if (requests.length === 1) {
        return new Response(JSON.stringify({ tools: sampleTools }), {
          status: 200,
        })
      }

      return new Response(
        JSON.stringify({
          success: true,
          output: 'https://proxy.example/result',
          status: 'success',
        }),
        { status: 200 }
      )
    }

    const result = await bucketTool(
      commandDependencies,
      createToolDependencies(createFetchStub(mockFetch)),
      {
        DUST_REPOSITORY_ID: 'repo-id',
        DUST_PROXY_PORT: '4444',
      }
    )

    expect(result.exitCode).toBe(0)
    expect(context.stdoutLines).toEqual(['https://proxy.example/result'])
    expect(requests[0].url).toBe('http://127.0.0.1:4444/tools')
    expect(requests[0].method).toBe('GET')
    expect(requests[1].url).toBe('http://127.0.0.1:4444/tools/asset-upload')
    expect(requests[1].method).toBe('POST')
    expect(requests[1].body).toContain('"repositoryId":"repo-id"')
    expect(requests[1].body).toContain('"arguments":["/tmp/file.png"]')
  })

  test('returns proxy tool execution errors', async () => {
    const commandDependencies = createCommandDependencies(['asset-upload'])
    const context = commandDependencies.context as ReturnType<
      typeof createContextEmulator
    >

    let requestCount = 0
    const mockFetch = async () => {
      requestCount += 1
      if (requestCount === 1) {
        return new Response(JSON.stringify({ tools: sampleTools }), {
          status: 200,
        })
      }

      return new Response(
        JSON.stringify({
          success: false,
          status: 'error',
          error: 'proxy upstream failed',
        }),
        { status: 502 }
      )
    }

    const result = await bucketTool(
      commandDependencies,
      createToolDependencies(createFetchStub(mockFetch)),
      {
        DUST_REPOSITORY_ID: 'repo-id',
        DUST_PROXY_PORT: '4444',
      }
    )

    expect(result.exitCode).toBe(1)
    expect(context.stderrLines.join('\n')).toContain('proxy upstream failed')
  })

  test('returns plain-text proxy execution errors for non-json responses', async () => {
    const commandDependencies = createCommandDependencies(['asset-upload'])
    const context = commandDependencies.context as ReturnType<
      typeof createContextEmulator
    >

    let requestCount = 0
    const mockFetch = async () => {
      requestCount += 1
      if (requestCount === 1) {
        return new Response(JSON.stringify({ tools: sampleTools }), {
          status: 200,
        })
      }

      return new Response('proxy unavailable', { status: 503 })
    }

    const result = await bucketTool(
      commandDependencies,
      createToolDependencies(createFetchStub(mockFetch)),
      {
        DUST_REPOSITORY_ID: 'repo-id',
        DUST_PROXY_PORT: '4444',
      }
    )

    expect(result.exitCode).toBe(1)
    expect(context.stderrLines.join('\n')).toContain('proxy unavailable')
  })

  test('falls back to status code message when proxy execution error body is empty', async () => {
    const commandDependencies = createCommandDependencies(['asset-upload'])
    const context = commandDependencies.context as ReturnType<
      typeof createContextEmulator
    >

    let requestCount = 0
    const mockFetch = async () => {
      requestCount += 1
      if (requestCount === 1) {
        return new Response(JSON.stringify({ tools: sampleTools }), {
          status: 200,
        })
      }

      return new Response('', { status: 503 })
    }

    const result = await bucketTool(
      commandDependencies,
      createToolDependencies(createFetchStub(mockFetch)),
      {
        DUST_REPOSITORY_ID: 'repo-id',
        DUST_PROXY_PORT: '4444',
      }
    )

    expect(result.exitCode).toBe(1)
    expect(context.stderrLines.join('\n')).toContain(
      'Tool proxy request failed (503)'
    )
  })

  test('uses generic tool execution error when proxy payload has empty error field', async () => {
    const commandDependencies = createCommandDependencies(['asset-upload'])
    const context = commandDependencies.context as ReturnType<
      typeof createContextEmulator
    >

    let requestCount = 0
    const mockFetch = async () => {
      requestCount += 1
      if (requestCount === 1) {
        return new Response(JSON.stringify({ tools: sampleTools }), {
          status: 200,
        })
      }

      return new Response(
        JSON.stringify({
          success: false,
          status: 'error',
          error: '',
        }),
        { status: 502 }
      )
    }

    const result = await bucketTool(
      commandDependencies,
      createToolDependencies(createFetchStub(mockFetch)),
      {
        DUST_REPOSITORY_ID: 'repo-id',
        DUST_PROXY_PORT: '4444',
      }
    )

    expect(result.exitCode).toBe(1)
    expect(context.stderrLines.join('\n')).toContain('Tool execution failed')
  })

  test('handles successful execution responses that omit output', async () => {
    const commandDependencies = createCommandDependencies(['asset-upload'])
    const context = commandDependencies.context as ReturnType<
      typeof createContextEmulator
    >

    let requestCount = 0
    const mockFetch = async () => {
      requestCount += 1
      if (requestCount === 1) {
        return new Response(JSON.stringify({ tools: sampleTools }), {
          status: 200,
        })
      }

      return new Response(
        JSON.stringify({ success: true, status: 'success' }),
        {
          status: 200,
        }
      )
    }

    const result = await bucketTool(
      commandDependencies,
      createToolDependencies(createFetchStub(mockFetch)),
      {
        DUST_REPOSITORY_ID: 'repo-id',
        DUST_PROXY_PORT: '4444',
      }
    )

    expect(result.exitCode).toBe(0)
    expect(context.stdoutLines).toEqual([])
  })

  test('returns proxy request failure when execution proxy fetch throws', async () => {
    const commandDependencies = createCommandDependencies(['asset-upload'])
    const context = commandDependencies.context as ReturnType<
      typeof createContextEmulator
    >

    let requestCount = 0
    const mockFetch = async () => {
      requestCount += 1
      if (requestCount === 1) {
        return new Response(JSON.stringify({ tools: sampleTools }), {
          status: 200,
        })
      }
      throw new Error('connect ECONNREFUSED')
    }

    const result = await bucketTool(
      commandDependencies,
      createToolDependencies(createFetchStub(mockFetch)),
      {
        DUST_REPOSITORY_ID: 'repo-id',
        DUST_PROXY_PORT: '4444',
      }
    )

    expect(result.exitCode).toBe(1)
    expect(context.stderrLines.join('\n')).toContain(
      'Tool proxy request failed: connect ECONNREFUSED'
    )
  })
})
