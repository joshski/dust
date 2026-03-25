import { describe, expect, test } from 'vitest'
import {
  createFetchStub,
  createTestBucketConfig,
} from '../test-support/test-utilities'
import type { ToolDefinition } from './server-messages'
import {
  buildToolUrl,
  executeTool,
  getContentType,
  mapArgumentsToParameters,
  type ToolExecutorDependencies,
  validateRequiredParameters,
} from './tool-executor'

const defaultMockFetch = async () =>
  new Response(JSON.stringify({ url: 'https://example.com/result' }))

const errorResponseMockFetch = async () =>
  new Response('File too large', {
    status: 413,
    statusText: 'Payload Too Large',
  })

const throwingMockFetch = async (): Promise<Response> => {
  throw new Error('Network timeout')
}

const noUrlMockFetch = async () =>
  new Response(JSON.stringify({ status: 'ok', count: 5 }))

const plainTextMockFetch = async () => new Response('Plain text response')

const emptyBodyErrorMockFetch = async () =>
  new Response('', { status: 502, statusText: 'Bad Gateway' })

const successMockFetch = async () =>
  new Response(JSON.stringify({ status: 'ok' }))

function createMockDependencies(
  overrides: Partial<ToolExecutorDependencies> = {}
): ToolExecutorDependencies {
  return {
    readFileBytes: async () => new Uint8Array([1, 2, 3]),
    fileExists: async () => true,
    fetch: createFetchStub(defaultMockFetch),
    bucketConfig: createTestBucketConfig(),
    ...overrides,
  }
}

const assetUploadTool: ToolDefinition = {
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
}

const multiParamTool: ToolDefinition = {
  name: 'multi-param',
  description: 'Tool with multiple parameters',
  endpoint: '/api/multi',
  method: 'POST',
  parameters: [
    { name: 'name', type: 'string', required: true, description: 'Name' },
    { name: 'count', type: 'number', required: false, description: 'Count' },
    {
      name: 'enabled',
      type: 'boolean',
      required: false,
      description: 'Enabled',
    },
  ],
}

describe('getContentType', () => {
  test('returns correct MIME type for images', () => {
    expect(getContentType('/path/to/image.png')).toBe('image/png')
    expect(getContentType('/path/to/image.jpg')).toBe('image/jpeg')
    expect(getContentType('/path/to/image.gif')).toBe('image/gif')
  })

  test('returns correct MIME type for documents', () => {
    expect(getContentType('/path/to/doc.pdf')).toBe('application/pdf')
    expect(getContentType('/path/to/doc.json')).toBe('application/json')
    expect(getContentType('/path/to/doc.md')).toBe('text/markdown')
  })

  test('returns octet-stream for unknown extensions', () => {
    expect(getContentType('/path/to/file.xyz')).toBe('application/octet-stream')
    expect(getContentType('/path/to/file')).toBe('application/octet-stream')
  })

  test('handles uppercase extensions', () => {
    expect(getContentType('/path/to/image.PNG')).toBe('image/png')
    expect(getContentType('/path/to/doc.PDF')).toBe('application/pdf')
  })
})

describe('buildToolUrl', () => {
  test('builds URL with repository ID', () => {
    const bucketConfig = createTestBucketConfig()
    const url = buildToolUrl('/api/assets', 'repo-123', bucketConfig)
    expect(url).toBe('https://dustbucket.com/api/assets?repositoryId=repo-123')
  })

  test('URL-encodes special characters in repository ID', () => {
    const bucketConfig = createTestBucketConfig()
    const url = buildToolUrl(
      '/api/assets',
      'repo/with spaces&special',
      bucketConfig
    )
    expect(url).toBe(
      'https://dustbucket.com/api/assets?repositoryId=repo%2Fwith+spaces%26special'
    )
  })
})

describe('mapArgumentsToParameters', () => {
  test('maps positional arguments to parameters', () => {
    const values = mapArgumentsToParameters(assetUploadTool, [
      '/path/to/file.png',
    ])
    expect(values.get('file')).toBe('/path/to/file.png')
  })

  test('maps multiple arguments', () => {
    const values = mapArgumentsToParameters(multiParamTool, [
      'test',
      '42',
      'true',
    ])
    expect(values.get('name')).toBe('test')
    expect(values.get('count')).toBe('42')
    expect(values.get('enabled')).toBe('true')
  })

  test('ignores extra arguments', () => {
    const values = mapArgumentsToParameters(assetUploadTool, [
      '/path/file.png',
      'extra',
    ])
    expect(values.size).toBe(1)
  })

  test('handles fewer arguments than parameters', () => {
    const values = mapArgumentsToParameters(multiParamTool, ['test'])
    expect(values.get('name')).toBe('test')
    expect(values.has('count')).toBe(false)
  })
})

describe('validateRequiredParameters', () => {
  test('returns valid when all required parameters present', () => {
    const values = new Map([['file', '/path/to/file.png']])
    const result = validateRequiredParameters(assetUploadTool, values)
    expect(result).toEqual({ valid: true })
  })

  test('returns missing parameters when required params absent', () => {
    const values = new Map<string, string>()
    const result = validateRequiredParameters(assetUploadTool, values)
    expect(result).toEqual({ valid: false, missing: ['file'] })
  })

  test('ignores optional parameters', () => {
    const values = new Map([['name', 'test']])
    const result = validateRequiredParameters(multiParamTool, values)
    expect(result).toEqual({ valid: true })
  })
})

describe('executeTool', () => {
  test('returns error when required parameters missing', async () => {
    const dependencies = createMockDependencies()
    const result = await executeTool(
      assetUploadTool,
      [],
      'token',
      'repo-id',
      dependencies
    )
    expect(result.success).toBe(false)
    expect(result.error).toContain('Missing required parameter')
    expect(result.error).toContain('file')
  })

  test('returns error when file does not exist', async () => {
    const dependencies = createMockDependencies({
      fileExists: async () => false,
    })
    const result = await executeTool(
      assetUploadTool,
      ['/path/to/missing.png'],
      'token',
      'repo-id',
      dependencies
    )
    expect(result.success).toBe(false)
    expect(result.error).toContain('File not found')
    expect(result.error).toContain('/path/to/missing.png')
  })

  test('executes tool and returns URL output', async () => {
    let capturedUrl: string | undefined
    let capturedHeaders: Record<string, string> | undefined

    const mockFetch = async (url: URL | RequestInfo, init?: RequestInit) => {
      capturedUrl = url.toString()
      capturedHeaders = init?.headers as Record<string, string>
      return new Response(JSON.stringify({ url: 'https://result.com/asset' }))
    }
    const dependencies = createMockDependencies({
      fetch: createFetchStub(mockFetch),
    })

    const result = await executeTool(
      assetUploadTool,
      ['/path/to/file.png'],
      'test-token',
      'repo-123',
      dependencies
    )

    expect(result.success).toBe(true)
    expect(result.output).toBe('https://result.com/asset')
    expect(capturedUrl).toBe(
      'https://dustbucket.com/api/assets?repositoryId=repo-123'
    )
    expect(capturedHeaders?.Authorization).toBe('Bearer test-token')
  })

  test('handles HTTP error responses', async () => {
    const dependencies = createMockDependencies({
      fetch: createFetchStub(errorResponseMockFetch),
    })

    const result = await executeTool(
      assetUploadTool,
      ['/path/to/file.png'],
      'token',
      'repo-id',
      dependencies
    )

    expect(result.success).toBe(false)
    expect(result.error).toContain('413')
    expect(result.error).toContain('File too large')
  })

  test('handles network errors', async () => {
    const dependencies = createMockDependencies({
      fetch: createFetchStub(throwingMockFetch),
    })

    const result = await executeTool(
      assetUploadTool,
      ['/path/to/file.png'],
      'token',
      'repo-id',
      dependencies
    )

    expect(result.success).toBe(false)
    expect(result.error).toContain('Network timeout')
  })

  test('returns full JSON when no url field', async () => {
    const dependencies = createMockDependencies({
      fetch: createFetchStub(noUrlMockFetch),
    })

    const result = await executeTool(
      multiParamTool,
      ['test'],
      'token',
      'repo-id',
      dependencies
    )

    expect(result.success).toBe(true)
    expect(result.output).toContain('"status": "ok"')
    expect(result.output).toContain('"count": 5')
  })

  test('handles non-JSON responses', async () => {
    const dependencies = createMockDependencies({
      fetch: createFetchStub(plainTextMockFetch),
    })

    const result = await executeTool(
      multiParamTool,
      ['test'],
      'token',
      'repo-id',
      dependencies
    )

    expect(result.success).toBe(true)
    expect(result.output).toBe('Plain text response')
  })

  test('handles GET tools', async () => {
    const getTool: ToolDefinition = {
      name: 'get-status',
      description: 'Get status',
      endpoint: '/api/status',
      method: 'GET',
      parameters: [],
    }
    let capturedMethod: string | undefined
    const mockFetch = async (_url: URL | RequestInfo, init?: RequestInit) => {
      capturedMethod = init?.method
      return new Response(JSON.stringify({ status: 'ok' }))
    }
    const dependencies = createMockDependencies({
      fetch: createFetchStub(mockFetch),
    })

    const result = await executeTool(
      getTool,
      [],
      'token',
      'repo-id',
      dependencies
    )

    expect(result.success).toBe(true)
    expect(capturedMethod).toBe('GET')
  })

  test('handles non-file parameters in mixed tools', async () => {
    const mixedTool: ToolDefinition = {
      name: 'upload-with-meta',
      description: 'Upload with metadata',
      endpoint: '/api/upload',
      method: 'POST',
      parameters: [
        {
          name: 'file',
          type: 'file',
          required: true,
          description: 'File to upload',
        },
        {
          name: 'description',
          type: 'string',
          required: false,
          description: 'Description',
        },
      ],
    }
    let capturedBody: FormData | undefined
    const mockFetch = async (_url: URL | RequestInfo, init?: RequestInit) => {
      capturedBody = init?.body as FormData
      return new Response(JSON.stringify({ url: 'https://result.com/ok' }))
    }
    const dependencies = createMockDependencies({
      fetch: createFetchStub(mockFetch),
    })

    await executeTool(
      mixedTool,
      ['/path/to/file.png', 'my description'],
      'token',
      'repo-id',
      dependencies
    )

    expect(capturedBody).toBeDefined()
  })

  test('handles number and boolean parameters', async () => {
    let capturedBody: string | undefined
    const mockFetch = async (_url: URL | RequestInfo, init?: RequestInit) => {
      capturedBody = init?.body as string
      return new Response(JSON.stringify({ status: 'ok' }))
    }
    const dependencies = createMockDependencies({
      fetch: createFetchStub(mockFetch),
    })

    await executeTool(
      multiParamTool,
      ['test-name', '42', 'true'],
      'token',
      'repo-id',
      dependencies
    )

    expect(capturedBody).toBeDefined()
    const parsed = JSON.parse(capturedBody || '{}')
    expect(parsed.name).toBe('test-name')
    expect(parsed.count).toBe(42)
    expect(parsed.enabled).toBe(true)
  })

  test('handles multiple missing required parameters', async () => {
    const multiRequiredTool: ToolDefinition = {
      name: 'multi-required',
      description: 'Tool with multiple required parameters',
      endpoint: '/api/multi',
      method: 'POST',
      parameters: [
        { name: 'name', type: 'string', required: true, description: 'Name' },
        { name: 'email', type: 'string', required: true, description: 'Email' },
      ],
    }
    const dependencies = createMockDependencies()
    const result = await executeTool(
      multiRequiredTool,
      [],
      'token',
      'repo-id',
      dependencies
    )
    expect(result.success).toBe(false)
    expect(result.error).toContain('Missing required parameters')
    expect(result.error).toContain('name')
    expect(result.error).toContain('email')
  })

  test('handles HTTP error with empty body', async () => {
    const dependencies = createMockDependencies({
      fetch: createFetchStub(emptyBodyErrorMockFetch),
    })

    const result = await executeTool(
      assetUploadTool,
      ['/path/to/file.png'],
      'token',
      'repo-id',
      dependencies
    )

    expect(result.success).toBe(false)
    expect(result.error).toContain('502')
    expect(result.error).toContain('Bad Gateway')
  })

  test('skips undefined optional file parameters in form data', async () => {
    // Tool with name (required) first, then optional file second
    const optionalFileTool: ToolDefinition = {
      name: 'optional-file',
      description: 'Tool with optional file parameter',
      endpoint: '/api/upload',
      method: 'POST',
      parameters: [
        {
          name: 'name',
          type: 'string',
          required: true,
          description: 'Name',
        },
        {
          name: 'file',
          type: 'file',
          required: false,
          description: 'Optional file',
        },
      ],
    }
    let capturedBody: FormData | undefined
    const mockFetch = async (_url: URL | RequestInfo, init?: RequestInit) => {
      capturedBody = init?.body as FormData
      return new Response(JSON.stringify({ status: 'ok' }))
    }
    const dependencies = createMockDependencies({
      fetch: createFetchStub(mockFetch),
    })

    const result = await executeTool(
      optionalFileTool,
      ['my-name'], // Only provide name, not file (positional)
      'token',
      'repo-id',
      dependencies
    )

    expect(result.success).toBe(true)
    expect(capturedBody).toBeDefined()
    // File parameter should not be in form data since it was not provided
    expect(capturedBody?.has('file')).toBe(false)
    expect(capturedBody?.get('name')).toBe('my-name')
  })

  test('skips file validation for optional file not provided', async () => {
    // Tool with name (required) first, then optional file second
    const optionalFileTool: ToolDefinition = {
      name: 'optional-file',
      description: 'Tool with optional file parameter',
      endpoint: '/api/upload',
      method: 'POST',
      parameters: [
        {
          name: 'name',
          type: 'string',
          required: true,
          description: 'Name',
        },
        {
          name: 'file',
          type: 'file',
          required: false,
          description: 'Optional file',
        },
      ],
    }
    const dependencies = createMockDependencies({
      fetch: createFetchStub(successMockFetch),
      fileExists: async () => false, // File doesn't exist, but shouldn't be checked
    })

    const result = await executeTool(
      optionalFileTool,
      ['my-name'], // Only provide name, not file (positional)
      'token',
      'repo-id',
      dependencies
    )

    // Should succeed because file is optional and not provided
    expect(result.success).toBe(true)
  })
})
