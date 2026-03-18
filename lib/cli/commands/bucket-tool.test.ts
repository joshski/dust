import { describe, expect, test } from 'vitest'
import type { ToolDefinition } from '../../bucket/server-messages'
import {
  createContextEmulator,
  createFetchStub,
  createFileSystemEmulator,
  createTestRuntimeConfig,
} from '../../test/test-utilities'
import type { CommandDependencies } from '../types'
import { type BucketToolDependencies, bucketTool } from './bucket-tool'

const throwingMockFetch = async () => {
  throw new Error('connect ECONNREFUSED')
}

const okMockFetch = async () => new Response('ok', { status: 200 })

const jsonOkMockFetch = async () =>
  new Response(JSON.stringify({ ok: true }), { status: 200 })

const proxyUnavailableMockFetch = async () =>
  new Response('proxy unavailable', { status: 503 })

const empty503MockFetch = async () => new Response('', { status: 503 })

const emptyToolsMockFetch = async () =>
  new Response(JSON.stringify({ tools: [] }), { status: 200 })

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
    runtime: createTestRuntimeConfig(),
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

    const result = await bucketTool(
      commandDependencies,
      createToolDependencies(createFetchStub(throwingMockFetch)),
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

    const result = await bucketTool(
      commandDependencies,
      createToolDependencies(createFetchStub(okMockFetch)),
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

    const result = await bucketTool(
      commandDependencies,
      createToolDependencies(createFetchStub(jsonOkMockFetch)),
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

    const result = await bucketTool(
      commandDependencies,
      createToolDependencies(createFetchStub(proxyUnavailableMockFetch)),
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

    const result = await bucketTool(
      commandDependencies,
      createToolDependencies(createFetchStub(empty503MockFetch)),
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

    const result = await bucketTool(
      commandDependencies,
      createToolDependencies(createFetchStub(emptyToolsMockFetch)),
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

  test('shows help text when invoking a tool family without a sub-tool', async () => {
    const toolFamily: ToolDefinition[] = [
      {
        name: 'sessions',
        description: 'Access historic agent sessions',
        endpoint: '/api/sessions',
        method: 'GET',
        parameters: [],
        children: [
          {
            name: 'search',
            description: 'Search through past sessions',
            endpoint: '/api/sessions/search',
            method: 'GET',
            parameters: [
              {
                name: 'query',
                type: 'string',
                required: true,
                description: 'Search term',
              },
            ],
          },
        ],
      },
    ]
    const commandDependencies = createCommandDependencies(['sessions'])
    const context = commandDependencies.context as ReturnType<
      typeof createContextEmulator
    >

    const requests: Array<{ url: string; method: string }> = []
    const mockFetch = async (input: URL | RequestInfo, init?: RequestInit) => {
      requests.push({
        url: String(input),
        method: String(init?.method ?? 'GET'),
      })

      if (String(input).endsWith('/tools')) {
        return new Response(JSON.stringify({ tools: toolFamily }), {
          status: 200,
        })
      }

      // Reveal endpoint
      return new Response('OK', { status: 200 })
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
    const stdout = context.stdoutLines.join('\n')
    expect(stdout).toContain('## sessions')
    expect(stdout).toContain('Access historic agent sessions')
    expect(stdout).toContain('### search')
    expect(stdout).toContain('Search through past sessions')
    expect(stdout).toContain(
      'Usage: `dust bucket tool sessions search <query>`'
    )

    // Should have called reveal endpoint
    const revealRequest = requests.find(r => r.url.includes('/reveal/'))
    expect(revealRequest).toBeDefined()
    expect(revealRequest?.url).toContain('/reveal/sessions')
    expect(revealRequest?.method).toBe('POST')
  })

  test('executes sub-tool when invoking a tool family with a sub-tool', async () => {
    const toolFamily: ToolDefinition[] = [
      {
        name: 'sessions',
        description: 'Access historic agent sessions',
        endpoint: '/api/sessions',
        method: 'GET',
        parameters: [],
        children: [
          {
            name: 'search',
            description: 'Search through past sessions',
            endpoint: '/api/sessions/search',
            method: 'GET',
            parameters: [
              {
                name: 'query',
                type: 'string',
                required: true,
                description: 'Search term',
              },
            ],
          },
        ],
      },
    ]
    const commandDependencies = createCommandDependencies([
      'sessions',
      'search',
      'my-query',
    ])
    const context = commandDependencies.context as ReturnType<
      typeof createContextEmulator
    >

    const requests: Array<{ url: string; method: string; body: string }> = []
    const mockFetch = async (input: URL | RequestInfo, init?: RequestInit) => {
      requests.push({
        url: String(input),
        method: String(init?.method ?? 'GET'),
        body: String(init?.body ?? ''),
      })

      if (String(input).endsWith('/tools')) {
        return new Response(JSON.stringify({ tools: toolFamily }), {
          status: 200,
        })
      }

      // Tool execution endpoint
      return new Response(
        JSON.stringify({
          success: true,
          output: 'Search results here',
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
    expect(context.stdoutLines.join('\n')).toContain('Search results here')

    // Should have called tool execution endpoint with family/sub-tool path
    const execRequest = requests.find(r =>
      r.url.includes('/tools/sessions%2Fsearch')
    )
    expect(execRequest).toBeDefined()
    expect(execRequest?.method).toBe('POST')
    expect(execRequest?.body).toContain('"arguments":["my-query"]')
  })

  test('returns error when invoking unknown sub-tool', async () => {
    const toolFamily: ToolDefinition[] = [
      {
        name: 'sessions',
        description: 'Access historic agent sessions',
        endpoint: '/api/sessions',
        method: 'GET',
        parameters: [],
        children: [
          {
            name: 'search',
            description: 'Search through past sessions',
            endpoint: '/api/sessions/search',
            method: 'GET',
            parameters: [],
          },
        ],
      },
    ]
    const commandDependencies = createCommandDependencies([
      'sessions',
      'unknown',
    ])
    const context = commandDependencies.context as ReturnType<
      typeof createContextEmulator
    >

    const mockFetch = async () => {
      return new Response(JSON.stringify({ tools: toolFamily }), {
        status: 200,
      })
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
    const stderr = context.stderrLines.join('\n')
    expect(stderr).toContain('Unknown sub-tool: unknown')
    expect(stderr).toContain(
      'Run `dust bucket tool sessions` to see available operations'
    )
  })

  test('returns error when sub-tool execution fails', async () => {
    const toolFamily: ToolDefinition[] = [
      {
        name: 'sessions',
        description: 'Access historic agent sessions',
        endpoint: '/api/sessions',
        method: 'GET',
        parameters: [],
        children: [
          {
            name: 'search',
            description: 'Search through past sessions',
            endpoint: '/api/sessions/search',
            method: 'GET',
            parameters: [],
          },
        ],
      },
    ]
    const commandDependencies = createCommandDependencies([
      'sessions',
      'search',
      'my-query',
    ])
    const context = commandDependencies.context as ReturnType<
      typeof createContextEmulator
    >

    let requestCount = 0
    const mockFetch = async () => {
      requestCount++
      if (requestCount === 1) {
        return new Response(JSON.stringify({ tools: toolFamily }), {
          status: 200,
        })
      }

      return new Response(
        JSON.stringify({
          success: false,
          error: 'sub-tool upstream failed',
          status: 'error',
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
    expect(context.stderrLines.join('\n')).toContain('sub-tool upstream failed')
  })

  test('returns generic error when sub-tool execution fails without error message', async () => {
    const toolFamily: ToolDefinition[] = [
      {
        name: 'sessions',
        description: 'Access historic agent sessions',
        endpoint: '/api/sessions',
        method: 'GET',
        parameters: [],
        children: [
          {
            name: 'delete',
            description: 'Delete a session',
            endpoint: '/api/sessions/delete',
            method: 'POST',
            parameters: [],
          },
        ],
      },
    ]
    const commandDependencies = createCommandDependencies([
      'sessions',
      'delete',
      'session-123',
    ])
    const context = commandDependencies.context as ReturnType<
      typeof createContextEmulator
    >

    let requestCount = 0
    const mockFetch = async () => {
      requestCount++
      if (requestCount === 1) {
        return new Response(JSON.stringify({ tools: toolFamily }), {
          status: 200,
        })
      }

      return new Response(
        JSON.stringify({
          success: false,
          status: 'error',
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

  test('handles sub-tool success without output', async () => {
    const toolFamily: ToolDefinition[] = [
      {
        name: 'sessions',
        description: 'Access historic agent sessions',
        endpoint: '/api/sessions',
        method: 'GET',
        parameters: [],
        children: [
          {
            name: 'delete',
            description: 'Delete a session',
            endpoint: '/api/sessions/delete',
            method: 'POST',
            parameters: [],
          },
        ],
      },
    ]
    const commandDependencies = createCommandDependencies([
      'sessions',
      'delete',
      'session-123',
    ])
    const context = commandDependencies.context as ReturnType<
      typeof createContextEmulator
    >

    let requestCount = 0
    const mockFetch = async () => {
      requestCount++
      if (requestCount === 1) {
        return new Response(JSON.stringify({ tools: toolFamily }), {
          status: 200,
        })
      }

      return new Response(
        JSON.stringify({
          success: true,
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
    expect(context.stdoutLines).toEqual([])
  })

  test('shows help when invoking tool with required parameters but no arguments', async () => {
    const toolWithRequiredParam: ToolDefinition[] = [
      {
        name: 'asset-upload',
        description: 'Upload a file to dustbucket',
        endpoint: '/api/assets',
        method: 'POST',
        parameters: [
          {
            name: 'file',
            type: 'file',
            required: true,
            description: 'The file to upload',
          },
        ],
      },
    ]
    const commandDependencies = createCommandDependencies(['asset-upload'])
    const context = commandDependencies.context as ReturnType<
      typeof createContextEmulator
    >

    const mockFetch = async () => {
      return new Response(JSON.stringify({ tools: toolWithRequiredParam }), {
        status: 200,
      })
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
    const stdout = context.stdoutLines.join('\n')
    expect(stdout).toContain('## asset-upload')
    expect(stdout).toContain('Upload a file to dustbucket')
    expect(stdout).toContain('Parameters:')
    expect(stdout).toContain('- `file` (file, required): The file to upload')
    expect(stdout).toContain('Usage: `dust bucket tool asset-upload <file>`')
  })

  test('executes tool with only optional parameters when invoked without arguments', async () => {
    const toolWithOptionalParams: ToolDefinition[] = [
      {
        name: 'sessions',
        description: 'List recent sessions',
        endpoint: '/api/sessions',
        method: 'GET',
        parameters: [
          {
            name: 'limit',
            type: 'number',
            required: false,
            description: 'Max results',
          },
        ],
      },
    ]
    const commandDependencies = createCommandDependencies(['sessions'])
    const context = commandDependencies.context as ReturnType<
      typeof createContextEmulator
    >

    const requests: Array<{ url: string; method: string }> = []
    const mockFetch = async (input: URL | RequestInfo, init?: RequestInit) => {
      requests.push({
        url: String(input),
        method: String(init?.method ?? 'GET'),
      })

      if (String(input).endsWith('/tools')) {
        return new Response(JSON.stringify({ tools: toolWithOptionalParams }), {
          status: 200,
        })
      }

      return new Response(
        JSON.stringify({
          success: true,
          output: 'Session list here',
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
    expect(context.stdoutLines.join('\n')).toContain('Session list here')

    // Should have executed the tool, not shown help
    const execRequest = requests.find(r => r.url.includes('/tools/sessions'))
    expect(execRequest).toBeDefined()
    expect(execRequest?.method).toBe('POST')
  })

  test('executes tool with no parameters when invoked without arguments', async () => {
    const toolWithNoParams: ToolDefinition[] = [
      {
        name: 'ping',
        description: 'Check connectivity',
        endpoint: '/api/ping',
        method: 'GET',
        parameters: [],
      },
    ]
    const commandDependencies = createCommandDependencies(['ping'])
    const context = commandDependencies.context as ReturnType<
      typeof createContextEmulator
    >

    const requests: Array<{ url: string; method: string }> = []
    const mockFetch = async (input: URL | RequestInfo, init?: RequestInit) => {
      requests.push({
        url: String(input),
        method: String(init?.method ?? 'GET'),
      })

      if (String(input).endsWith('/tools')) {
        return new Response(JSON.stringify({ tools: toolWithNoParams }), {
          status: 200,
        })
      }

      return new Response(
        JSON.stringify({
          success: true,
          output: 'pong',
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
    expect(context.stdoutLines.join('\n')).toContain('pong')

    // Should have executed the tool, not shown help
    const execRequest = requests.find(r => r.url.includes('/tools/ping'))
    expect(execRequest).toBeDefined()
    expect(execRequest?.method).toBe('POST')
  })

  test('executes tool with required parameters when arguments are provided', async () => {
    const toolWithRequiredParam: ToolDefinition[] = [
      {
        name: 'asset-upload',
        description: 'Upload a file',
        endpoint: '/api/assets',
        method: 'POST',
        parameters: [
          {
            name: 'file',
            type: 'file',
            required: true,
            description: 'The file to upload',
          },
        ],
      },
    ]
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
        method: String(init?.method ?? 'GET'),
        body: String(init?.body ?? ''),
      })

      if (String(input).endsWith('/tools')) {
        return new Response(JSON.stringify({ tools: toolWithRequiredParam }), {
          status: 200,
        })
      }

      return new Response(
        JSON.stringify({
          success: true,
          output: 'https://example.com/uploaded.png',
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
    expect(context.stdoutLines.join('\n')).toContain(
      'https://example.com/uploaded.png'
    )

    // Should have executed the tool with arguments
    const execRequest = requests.find(r =>
      r.url.includes('/tools/asset-upload')
    )
    expect(execRequest).toBeDefined()
    expect(execRequest?.method).toBe('POST')
    expect(execRequest?.body).toContain('"/tmp/file.png"')
  })
})
