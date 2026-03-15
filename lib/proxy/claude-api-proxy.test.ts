import { describe, expect, test } from 'vitest'
import { createFetchStub, restoreEnv, stubEnv } from '../test/test-utilities'
import {
  buildNoTokenResponse,
  buildProxyRequest,
  buildUpstreamErrorResponse,
  type ClaudeApiProxyDependencies,
  filterResponseHeaders,
  isTokenExpired,
  readOAuthToken,
} from './claude-api-proxy'

function createMockFetch(): typeof fetch {
  return createFetchStub(async () => {
    throw new Error('fetch not implemented in test')
  })
}

function createMockDependencies(
  credentialsContent?: string
): ClaudeApiProxyDependencies {
  return {
    homedir: () => '/home/user',
    readFileSync: (path: string) => {
      if (
        path === '/home/user/.claude/.credentials.json' &&
        credentialsContent
      ) {
        return credentialsContent
      }
      throw new Error('ENOENT: no such file or directory')
    },
    fetch: createMockFetch(),
  }
}

describe('readOAuthToken', () => {
  test('returns token from CLAUDE_CODE_OAUTH_TOKEN environment variable', () => {
    stubEnv('CLAUDE_CODE_OAUTH_TOKEN', 'env-token-123')
    const dependencies = createMockDependencies()
    const token = readOAuthToken(dependencies)
    expect(token).toBe('env-token-123')
    restoreEnv()
  })

  test('returns token from credentials file when env var not set', () => {
    stubEnv('CLAUDE_CODE_OAUTH_TOKEN', undefined)
    const credentials = JSON.stringify({
      claudeAiOauth: {
        accessToken: 'file-token-456',
        refreshToken: 'refresh-token',
        expiresAt: '2099-01-01T00:00:00Z',
      },
    })
    const dependencies = createMockDependencies(credentials)
    const token = readOAuthToken(dependencies)
    expect(token).toBe('file-token-456')
    restoreEnv()
  })

  test('returns null when credentials file does not exist', () => {
    stubEnv('CLAUDE_CODE_OAUTH_TOKEN', undefined)
    const dependencies = createMockDependencies()
    const token = readOAuthToken(dependencies)
    expect(token).toBeNull()
    restoreEnv()
  })

  test('returns null when credentials file has no accessToken', () => {
    stubEnv('CLAUDE_CODE_OAUTH_TOKEN', undefined)
    const credentials = JSON.stringify({
      claudeAiOauth: {
        refreshToken: 'refresh-token',
      },
    })
    const dependencies = createMockDependencies(credentials)
    const token = readOAuthToken(dependencies)
    expect(token).toBeNull()
    restoreEnv()
  })

  test('returns null when credentials file has invalid JSON', () => {
    stubEnv('CLAUDE_CODE_OAUTH_TOKEN', undefined)
    const dependencies: ClaudeApiProxyDependencies = {
      homedir: () => '/home/user',
      readFileSync: () => 'not valid json',
      fetch: createMockFetch(),
    }
    const token = readOAuthToken(dependencies)
    expect(token).toBeNull()
    restoreEnv()
  })

  test('returns null and handles non-Error thrown values', () => {
    stubEnv('CLAUDE_CODE_OAUTH_TOKEN', undefined)
    const dependencies: ClaudeApiProxyDependencies = {
      homedir: () => '/home/user',
      readFileSync: () => {
        // eslint-disable-next-line @typescript-eslint/only-throw-error
        throw 'string error' // Test non-Error thrown value
      },
      fetch: createMockFetch(),
    }
    const token = readOAuthToken(dependencies)
    expect(token).toBeNull()
    restoreEnv()
  })

  test('prefers environment variable over credentials file', () => {
    stubEnv('CLAUDE_CODE_OAUTH_TOKEN', 'env-token')
    const credentials = JSON.stringify({
      claudeAiOauth: {
        accessToken: 'file-token',
      },
    })
    const dependencies = createMockDependencies(credentials)
    const token = readOAuthToken(dependencies)
    expect(token).toBe('env-token')
    restoreEnv()
  })
})

describe('isTokenExpired', () => {
  test('returns false when no expiry info available', () => {
    const credentials = JSON.stringify({
      claudeAiOauth: {
        accessToken: 'token',
      },
    })
    const dependencies = createMockDependencies(credentials)
    expect(isTokenExpired(dependencies)).toBe(false)
  })

  test('returns false when token expires in more than 5 minutes', () => {
    const futureDate = new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes from now
    const credentials = JSON.stringify({
      claudeAiOauth: {
        accessToken: 'token',
        expiresAt: futureDate,
      },
    })
    const dependencies = createMockDependencies(credentials)
    expect(isTokenExpired(dependencies)).toBe(false)
  })

  test('returns true when token expires in less than 5 minutes', () => {
    const nearFutureDate = new Date(Date.now() + 2 * 60 * 1000).toISOString() // 2 minutes from now
    const credentials = JSON.stringify({
      claudeAiOauth: {
        accessToken: 'token',
        expiresAt: nearFutureDate,
      },
    })
    const dependencies = createMockDependencies(credentials)
    expect(isTokenExpired(dependencies)).toBe(true)
  })

  test('returns true when token is already expired', () => {
    const pastDate = new Date(Date.now() - 60 * 1000).toISOString() // 1 minute ago
    const credentials = JSON.stringify({
      claudeAiOauth: {
        accessToken: 'token',
        expiresAt: pastDate,
      },
    })
    const dependencies = createMockDependencies(credentials)
    expect(isTokenExpired(dependencies)).toBe(true)
  })

  test('returns false when credentials file cannot be read', () => {
    const dependencies = createMockDependencies()
    expect(isTokenExpired(dependencies)).toBe(false)
  })
})

describe('buildProxyRequest', () => {
  test('builds upstream URL with pathname and search', () => {
    const result = buildProxyRequest(
      '/v1/messages',
      '?stream=true',
      'token',
      {}
    )
    expect(result.url).toBe('https://api.anthropic.com/v1/messages?stream=true')
  })

  test('includes x-api-key header with token', () => {
    const result = buildProxyRequest('/v1/messages', '', 'my-token', {})
    expect(result.headers['x-api-key']).toBe('my-token')
  })

  test('forwards allowed headers from incoming request', () => {
    const result = buildProxyRequest('/v1/messages', '', 'token', {
      'content-type': 'application/json',
      'anthropic-version': '2023-06-01',
      'anthropic-beta': 'messages-2023-12-15',
      accept: 'application/json',
      'accept-encoding': 'gzip',
    })
    expect(result.headers['content-type']).toBe('application/json')
    expect(result.headers['anthropic-version']).toBe('2023-06-01')
    expect(result.headers['anthropic-beta']).toBe('messages-2023-12-15')
    expect(result.headers['accept']).toBe('application/json')
    expect(result.headers['accept-encoding']).toBe('gzip')
  })

  test('does not forward non-allowed headers', () => {
    const result = buildProxyRequest('/v1/messages', '', 'token', {
      authorization: 'Bearer other-token',
      'x-api-key': 'other-key',
      'x-custom-header': 'custom-value',
    })
    expect(result.headers['authorization']).toBeUndefined()
    expect(result.headers['x-custom-header']).toBeUndefined()
    // x-api-key should be the injected token, not the incoming one
    expect(result.headers['x-api-key']).toBe('token')
  })

  test('ignores array header values', () => {
    const result = buildProxyRequest('/v1/messages', '', 'token', {
      'content-type': ['application/json', 'text/plain'],
    })
    expect(result.headers['content-type']).toBeUndefined()
  })

  test('ignores undefined header values', () => {
    const result = buildProxyRequest('/v1/messages', '', 'token', {
      'content-type': undefined,
    })
    expect(result.headers['content-type']).toBeUndefined()
  })
})

describe('filterResponseHeaders', () => {
  test('copies all headers from upstream response', () => {
    const headers = new Headers({
      'content-type': 'application/json',
      'x-request-id': 'abc123',
    })
    const result = filterResponseHeaders(headers)
    expect(result['content-type']).toBe('application/json')
    expect(result['x-request-id']).toBe('abc123')
  })

  test('filters out transfer-encoding header', () => {
    const headers = new Headers({
      'content-type': 'application/json',
      'transfer-encoding': 'chunked',
    })
    const result = filterResponseHeaders(headers)
    expect(result['content-type']).toBe('application/json')
    expect(result['transfer-encoding']).toBeUndefined()
  })

  test('handles Transfer-Encoding with different case', () => {
    const headers = new Headers()
    headers.set('Content-Type', 'application/json')
    headers.set('Transfer-Encoding', 'chunked')
    const result = filterResponseHeaders(headers)
    expect(result['transfer-encoding']).toBeUndefined()
  })
})

describe('buildNoTokenResponse', () => {
  test('returns 401 status code', () => {
    const result = buildNoTokenResponse()
    expect(result.statusCode).toBe(401)
  })

  test('returns text/plain content type', () => {
    const result = buildNoTokenResponse()
    expect(result.contentType).toBe('text/plain')
  })

  test('returns appropriate error message', () => {
    const result = buildNoTokenResponse()
    expect(result.body).toBe('Could not obtain OAuth token')
  })
})

describe('buildUpstreamErrorResponse', () => {
  test('returns 502 status code', () => {
    const result = buildUpstreamErrorResponse(new Error('Connection failed'))
    expect(result.statusCode).toBe(502)
  })

  test('returns text/plain content type', () => {
    const result = buildUpstreamErrorResponse(new Error('Connection failed'))
    expect(result.contentType).toBe('text/plain')
  })

  test('includes error message from Error object', () => {
    const result = buildUpstreamErrorResponse(new Error('Connection failed'))
    expect(result.body).toBe('Upstream request failed: Connection failed')
  })

  test('handles non-Error values', () => {
    const result = buildUpstreamErrorResponse('string error')
    expect(result.body).toBe('Upstream request failed: Unknown error')
  })

  test('handles null error', () => {
    const result = buildUpstreamErrorResponse(null)
    expect(result.body).toBe('Upstream request failed: Unknown error')
  })
})
