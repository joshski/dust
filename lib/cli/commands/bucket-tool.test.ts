import { describe, expect, test } from 'vitest'
import type { AuthDependencies } from '../../bucket/auth'
import type { ToolDefinition } from '../../bucket/server-messages'
import type { ToolExecutorDependencies } from '../../bucket/tool-executor'
import {
  createContextEmulator,
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
    parameters: [
      {
        name: 'file',
        type: 'file',
        required: true,
        description: 'File to upload',
      },
    ],
  },
]

function createMockAuthDependencies(
  overrides: Partial<AuthDependencies> = {}
): AuthDependencies {
  return {
    createServer: () => ({ port: 9999, stop: () => {} }),
    openBrowser: () => {},
    getHomeDir: () => '/home',
    fileSystem: createFileSystemEmulator(),
    exchangeCode: async () => 'browser-tok',
    ...overrides,
  }
}

function createMockExecutorDependencies(
  overrides: Partial<ToolExecutorDependencies> = {}
): ToolExecutorDependencies {
  const mockFetch = async () =>
    new Response(JSON.stringify({ url: 'https://result.com/uploaded' }))
  return {
    readFileBytes: async () => new Uint8Array([1, 2, 3]),
    fileExists: async () => true,
    fetch: mockFetch as unknown as typeof fetch,
    ...overrides,
  }
}

function createCommandDependencies(
  commandArguments: string[],
  toolsJson?: string
): CommandDependencies {
  const context = createContextEmulator()
  // Important: The tools are loaded from dependencies.fileSystem with path based on getHomeDir()
  // So we put tools.json in home/.dust/tools.json
  const fileSystem = createFileSystemEmulator(
    toolsJson ? { home: { '.dust': { 'tools.json': toolsJson } } } : undefined
  )
  return {
    arguments: commandArguments,
    context,
    fileSystem,
    globScanner: fileSystem,
    settings: { dustCommand: 'dust' },
  }
}

function createToolDependencies(
  overrides: Partial<BucketToolDependencies> = {}
): BucketToolDependencies {
  return {
    auth: createMockAuthDependencies(),
    executor: createMockExecutorDependencies(),
    ...overrides,
  }
}

function createEnv(overrides: Record<string, string> = {}): NodeJS.ProcessEnv {
  return {
    DUST_REPOSITORY_ID: 'test-repo-id',
    DUST_BUCKET_TOKEN: 'test-token',
    ...overrides,
  }
}

describe('bucketTool', () => {
  test('shows usage when no tool name provided', async () => {
    const commandDependencies = createCommandDependencies([])
    const context = commandDependencies.context as ReturnType<
      typeof createContextEmulator
    >
    const toolDependencies = createToolDependencies()
    const env = createEnv()

    const result = await bucketTool(commandDependencies, toolDependencies, env)

    expect(result.exitCode).toBe(1)
    expect(context.stderrLines.join('\n')).toContain('Usage:')
    expect(context.stderrLines.join('\n')).toContain('dust bucket tool <name>')
  })

  test('returns error when DUST_REPOSITORY_ID is not set', async () => {
    const commandDependencies = createCommandDependencies(
      ['asset-upload', '/path/to/file.png'],
      JSON.stringify({ tools: sampleTools })
    )
    const context = commandDependencies.context as ReturnType<
      typeof createContextEmulator
    >
    const toolDependencies = createToolDependencies()
    const env = {} // No DUST_REPOSITORY_ID

    const result = await bucketTool(commandDependencies, toolDependencies, env)

    expect(result.exitCode).toBe(1)
    expect(context.stderrLines.join('\n')).toContain('DUST_REPOSITORY_ID')
    expect(context.stderrLines.join('\n')).toContain('repository context')
  })

  test('returns error when tool not found', async () => {
    const commandDependencies = createCommandDependencies(
      ['unknown-tool', 'arg1'],
      JSON.stringify({ tools: sampleTools })
    )
    const context = commandDependencies.context as ReturnType<
      typeof createContextEmulator
    >
    const toolDependencies = createToolDependencies()
    const env = createEnv()

    const result = await bucketTool(commandDependencies, toolDependencies, env)

    expect(result.exitCode).toBe(1)
    expect(context.stderrLines.join('\n')).toContain('Unknown tool')
    expect(context.stderrLines.join('\n')).toContain('unknown-tool')
    expect(context.stderrLines.join('\n')).toContain('asset-upload')
  })

  test('shows message when no tools available', async () => {
    const commandDependencies = createCommandDependencies(
      ['some-tool'],
      JSON.stringify({ tools: [] })
    )
    const context = commandDependencies.context as ReturnType<
      typeof createContextEmulator
    >
    const toolDependencies = createToolDependencies()
    const env = createEnv()

    const result = await bucketTool(commandDependencies, toolDependencies, env)

    expect(result.exitCode).toBe(1)
    expect(context.stderrLines.join('\n')).toContain('No tools available')
    expect(context.stderrLines.join('\n')).toContain('dust bucket')
  })

  test('executes tool and outputs result', async () => {
    const mockFetch = async () =>
      new Response(JSON.stringify({ url: 'https://result.com/uploaded123' }))
    const commandDependencies = createCommandDependencies(
      ['asset-upload', '/path/to/file.png'],
      JSON.stringify({ tools: sampleTools })
    )
    const context = commandDependencies.context as ReturnType<
      typeof createContextEmulator
    >
    const toolDependencies = createToolDependencies({
      executor: createMockExecutorDependencies({
        fetch: mockFetch as unknown as typeof fetch,
      }),
    })
    const env = createEnv()

    const result = await bucketTool(commandDependencies, toolDependencies, env)

    expect(result.exitCode).toBe(0)
    expect(context.stdoutLines).toContain('https://result.com/uploaded123')
  })

  test('returns error when tool execution fails', async () => {
    const commandDependencies = createCommandDependencies(
      ['asset-upload', '/path/to/file.png'],
      JSON.stringify({ tools: sampleTools })
    )
    const context = commandDependencies.context as ReturnType<
      typeof createContextEmulator
    >
    const toolDependencies = createToolDependencies({
      executor: createMockExecutorDependencies({
        fileExists: async () => false,
      }),
    })
    const env = createEnv()

    const result = await bucketTool(commandDependencies, toolDependencies, env)

    expect(result.exitCode).toBe(1)
    expect(context.stderrLines.join('\n')).toContain('File not found')
  })

  test('uses stored credential when no env token', async () => {
    const fileSystem = createFileSystemEmulator({
      home: {
        '.dust': {
          'tools.json': JSON.stringify({ tools: sampleTools }),
          'credentials.json': '{"token":"stored-token"}',
        },
      },
    })
    let capturedHeaders: Record<string, string> | undefined

    const mockFetch = async (_url: URL | RequestInfo, init?: RequestInit) => {
      capturedHeaders = init?.headers as Record<string, string>
      return new Response(JSON.stringify({ url: 'https://result.com/ok' }))
    }
    const commandDependencies = {
      arguments: ['asset-upload', '/path/to/file.png'],
      context: createContextEmulator(),
      fileSystem,
      globScanner: fileSystem,
      settings: { dustCommand: 'dust' },
    }
    const toolDependencies = createToolDependencies({
      auth: createMockAuthDependencies({ fileSystem }),
      executor: createMockExecutorDependencies({
        fetch: mockFetch as unknown as typeof fetch,
      }),
    })
    const env = { DUST_REPOSITORY_ID: 'repo-id' } // No DUST_BUCKET_TOKEN

    await bucketTool(commandDependencies, toolDependencies, env)

    expect(capturedHeaders?.Authorization).toBe('Bearer stored-token')
  })

  test('uses env token when available', async () => {
    let capturedHeaders: Record<string, string> | undefined

    const mockFetch = async (_url: URL | RequestInfo, init?: RequestInit) => {
      capturedHeaders = init?.headers as Record<string, string>
      return new Response(JSON.stringify({ url: 'https://result.com/ok' }))
    }
    const commandDependencies = createCommandDependencies(
      ['asset-upload', '/path/to/file.png'],
      JSON.stringify({ tools: sampleTools })
    )
    const toolDependencies = createToolDependencies({
      executor: createMockExecutorDependencies({
        fetch: mockFetch as unknown as typeof fetch,
      }),
    })
    const env = createEnv({ DUST_BUCKET_TOKEN: 'env-token' })

    await bucketTool(commandDependencies, toolDependencies, env)

    expect(capturedHeaders?.Authorization).toBe('Bearer env-token')
  })

  test('triggers browser auth when no token available and stores result', async () => {
    const fileSystem = createFileSystemEmulator({
      home: {
        '.dust': {
          'tools.json': JSON.stringify({ tools: sampleTools }),
        },
      },
    })
    let capturedHeaders: Record<string, string> | undefined

    const mockFetch = async (_url: URL | RequestInfo, init?: RequestInit) => {
      capturedHeaders = init?.headers as Record<string, string>
      return new Response(JSON.stringify({ url: 'https://result.com/ok' }))
    }
    const commandDependencies = {
      arguments: ['asset-upload', '/path/to/file.png'],
      context: createContextEmulator(),
      fileSystem,
      globScanner: fileSystem,
      settings: { dustCommand: 'dust' },
    }
    const toolDependencies = createToolDependencies({
      auth: {
        ...createMockAuthDependencies({ fileSystem }),
        createServer: handler => {
          setTimeout(() => {
            handler(
              new Request('http://localhost:9999/callback?code=test-code')
            )
          }, 0)
          return { port: 9999, stop: () => {} }
        },
      },
      executor: createMockExecutorDependencies({
        fetch: mockFetch as unknown as typeof fetch,
      }),
    })
    const env = { DUST_REPOSITORY_ID: 'repo-id' } // No DUST_BUCKET_TOKEN

    await bucketTool(commandDependencies, toolDependencies, env)

    expect(capturedHeaders?.Authorization).toBe('Bearer browser-tok')
  })

  test('returns error when authentication fails', async () => {
    const fileSystem = createFileSystemEmulator({
      home: {
        '.dust': {
          'tools.json': JSON.stringify({ tools: sampleTools }),
        },
      },
    })
    const commandDependencies = {
      arguments: ['asset-upload', '/path/to/file.png'],
      context: createContextEmulator(),
      fileSystem,
      globScanner: fileSystem,
      settings: { dustCommand: 'dust' },
    }
    const context = commandDependencies.context as ReturnType<
      typeof createContextEmulator
    >
    const toolDependencies = createToolDependencies({
      auth: {
        ...createMockAuthDependencies({ fileSystem }),
        createServer: () => {
          throw new Error('Cannot start auth server')
        },
      },
    })
    const env = { DUST_REPOSITORY_ID: 'repo-id' } // No DUST_BUCKET_TOKEN

    const result = await bucketTool(commandDependencies, toolDependencies, env)

    expect(result.exitCode).toBe(1)
    expect(context.stderrLines.join('\n')).toContain('Authentication failed')
  })

  test('handles tool result with empty string output', async () => {
    const mockFetch = async () => new Response('')
    const commandDependencies = createCommandDependencies(
      ['asset-upload', '/path/to/file.png'],
      JSON.stringify({ tools: sampleTools })
    )
    const context = commandDependencies.context as ReturnType<
      typeof createContextEmulator
    >
    const toolDependencies = createToolDependencies({
      executor: createMockExecutorDependencies({
        fetch: mockFetch as unknown as typeof fetch,
      }),
    })
    const env = createEnv()

    const result = await bucketTool(commandDependencies, toolDependencies, env)

    expect(result.exitCode).toBe(0)
    // Empty string response means no output
    expect(context.stdoutLines).toHaveLength(0)
  })

  test('shows generic error when tool result has no error message', async () => {
    const mockFetch = async () =>
      new Response('Server error', { status: 500, statusText: 'Server Error' })
    const commandDependencies = createCommandDependencies(
      ['asset-upload', '/path/to/file.png'],
      JSON.stringify({ tools: sampleTools })
    )
    const context = commandDependencies.context as ReturnType<
      typeof createContextEmulator
    >
    const toolDependencies = createToolDependencies({
      executor: createMockExecutorDependencies({
        fetch: mockFetch as unknown as typeof fetch,
      }),
    })
    const env = createEnv()

    const result = await bucketTool(commandDependencies, toolDependencies, env)

    expect(result.exitCode).toBe(1)
    expect(context.stderrLines.join('\n')).toContain('500')
  })
})
