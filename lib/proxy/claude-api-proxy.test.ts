import { describe, expect, test } from 'vitest'
import { createFetchStub, restoreEnv, stubEnv } from '../test/test-utilities'
import {
  buildInvalidHelperTokenResponse,
  buildNoTokenResponse,
  buildProxyRequest,
  buildTokenResponse,
  buildUpstreamErrorResponse,
  type ClaudeApiProxyDependencies,
  extractHelperToken,
  filterResponseHeaders,
  getOrRefreshHelperToken,
  handleProxyRequest,
  isTokenExpired,
  mergeAnthropicBetaHeader,
  type ProxyRequest,
  readOAuthToken,
  validateHelperToken,
} from './claude-api-proxy'
import {
  createHelperTokenState,
  HELPER_TOKEN_TTL_MS,
  rotateHelperToken,
} from './helper-token'

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

  test('includes authorization header with bearer token', () => {
    const result = buildProxyRequest('/v1/messages', '', 'my-token', {})
    expect(result.headers['authorization']).toBe('Bearer my-token')
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
    expect(result.headers['anthropic-beta']).toBe(
      'messages-2023-12-15,oauth-2025-04-20'
    )
    expect(result.headers['accept']).toBe('application/json')
    expect(result.headers['accept-encoding']).toBe('gzip')
  })

  test('does not forward non-allowed headers', () => {
    const result = buildProxyRequest('/v1/messages', '', 'token', {
      authorization: 'Bearer other-token',
      'x-api-key': 'other-key',
      'x-custom-header': 'custom-value',
    })
    expect(result.headers['x-api-key']).toBeUndefined()
    expect(result.headers['x-custom-header']).toBeUndefined()
    // Authorization should use injected token, not incoming header
    expect(result.headers['authorization']).toBe('Bearer token')
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

describe('mergeAnthropicBetaHeader', () => {
  test('returns oauth beta when incoming header is missing', () => {
    expect(mergeAnthropicBetaHeader(undefined)).toBe('oauth-2025-04-20')
  })

  test('appends oauth beta when incoming header is present', () => {
    expect(mergeAnthropicBetaHeader('messages-2023-12-15')).toBe(
      'messages-2023-12-15,oauth-2025-04-20'
    )
  })

  test('does not duplicate oauth beta when already present', () => {
    expect(
      mergeAnthropicBetaHeader('messages-2023-12-15,oauth-2025-04-20')
    ).toBe('messages-2023-12-15,oauth-2025-04-20')
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

  test('filters out content-encoding and content-length headers', () => {
    const headers = new Headers({
      'content-type': 'application/json',
      'content-encoding': 'gzip',
      'content-length': '123',
    })
    const result = filterResponseHeaders(headers)
    expect(result['content-type']).toBe('application/json')
    expect(result['content-encoding']).toBeUndefined()
    expect(result['content-length']).toBeUndefined()
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

function createTestRequest(
  overrides: Partial<ProxyRequest> = {}
): ProxyRequest {
  return {
    method: 'POST',
    pathname: '/v1/messages',
    search: '',
    headers: {
      'content-type': 'application/json',
    },
    body: new TextEncoder().encode('{"model":"claude-3"}'),
    ...overrides,
  }
}

function createDependenciesWithToken(
  token: string,
  fetchImpl: typeof fetch
): ClaudeApiProxyDependencies {
  return {
    homedir: () => '/home/user',
    readFileSync: () =>
      JSON.stringify({
        claudeAiOauth: { accessToken: token },
      }),
    fetch: fetchImpl,
  }
}

function createDependenciesWithoutToken(
  fetchImpl: typeof fetch
): ClaudeApiProxyDependencies {
  return {
    homedir: () => '/home/user',
    readFileSync: () => {
      throw new Error('ENOENT')
    },
    fetch: fetchImpl,
  }
}

describe('handleProxyRequest', () => {
  test('returns 401 error response when no token is available', async () => {
    stubEnv('CLAUDE_CODE_OAUTH_TOKEN', undefined)
    const fetchStub = createFetchStub(async () => {
      throw new Error('should not be called')
    })
    const dependencies = createDependenciesWithoutToken(fetchStub)
    const request = createTestRequest()

    const response = await handleProxyRequest(request, dependencies)

    expect(response.kind).toBe('error')
    if (response.kind === 'error') {
      expect(response.status).toBe(401)
      expect(response.contentType).toBe('text/plain')
      expect(response.body).toBe('Could not obtain OAuth token')
    }
    restoreEnv()
  })

  test('forwards request to upstream and returns success response', async () => {
    stubEnv('CLAUDE_CODE_OAUTH_TOKEN', undefined)
    const fetchStub = createFetchStub(async (url, options) => {
      expect(url).toBe('https://api.anthropic.com/v1/messages')
      expect(options?.method).toBe('POST')
      expect(options?.headers).toMatchObject({
        authorization: 'Bearer test-token',
        'content-type': 'application/json',
      })
      return new Response('{"content":"hello"}', {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    })
    const dependencies = createDependenciesWithToken('test-token', fetchStub)
    const request = createTestRequest()

    const response = await handleProxyRequest(request, dependencies)

    expect(response.kind).toBe('success')
    if (response.kind === 'success') {
      expect(response.status).toBe(200)
      expect(response.headers['content-type']).toBe('application/json')
    }
    restoreEnv()
  })

  test('returns 502 error response when upstream fetch fails', async () => {
    stubEnv('CLAUDE_CODE_OAUTH_TOKEN', undefined)
    const fetchStub = createFetchStub(async () => {
      throw new Error('Connection refused')
    })
    const dependencies = createDependenciesWithToken('test-token', fetchStub)
    const request = createTestRequest()

    const response = await handleProxyRequest(request, dependencies)

    expect(response.kind).toBe('error')
    if (response.kind === 'error') {
      expect(response.status).toBe(502)
      expect(response.contentType).toBe('text/plain')
      expect(response.body).toBe('Upstream request failed: Connection refused')
    }
    restoreEnv()
  })

  test('returns 502 error response with generic message for non-Error throws', async () => {
    stubEnv('CLAUDE_CODE_OAUTH_TOKEN', undefined)
    const fetchStub = createFetchStub(async () => {
      // eslint-disable-next-line @typescript-eslint/only-throw-error
      throw 'string error'
    })
    const dependencies = createDependenciesWithToken('test-token', fetchStub)
    const request = createTestRequest()

    const response = await handleProxyRequest(request, dependencies)

    expect(response.kind).toBe('error')
    if (response.kind === 'error') {
      expect(response.status).toBe(502)
      expect(response.body).toBe('Upstream request failed: Unknown error')
    }
    restoreEnv()
  })

  test('filters response headers from upstream', async () => {
    stubEnv('CLAUDE_CODE_OAUTH_TOKEN', undefined)
    const fetchStub = createFetchStub(async () => {
      return new Response('ok', {
        status: 200,
        headers: {
          'content-type': 'text/plain',
          'x-request-id': 'abc123',
          'transfer-encoding': 'chunked',
        },
      })
    })
    const dependencies = createDependenciesWithToken('test-token', fetchStub)
    const request = createTestRequest()

    const response = await handleProxyRequest(request, dependencies)

    expect(response.kind).toBe('success')
    if (response.kind === 'success') {
      expect(response.headers['content-type']).toBe('text/plain')
      expect(response.headers['x-request-id']).toBe('abc123')
      expect(response.headers['transfer-encoding']).toBeUndefined()
    }
    restoreEnv()
  })

  test('includes query string in upstream URL', async () => {
    stubEnv('CLAUDE_CODE_OAUTH_TOKEN', undefined)
    let capturedUrl: string | undefined
    const fetchStub = createFetchStub(async url => {
      capturedUrl = url as string
      return new Response('ok', { status: 200 })
    })
    const dependencies = createDependenciesWithToken('test-token', fetchStub)
    const request = createTestRequest({ search: '?stream=true' })

    await handleProxyRequest(request, dependencies)

    expect(capturedUrl).toBe(
      'https://api.anthropic.com/v1/messages?stream=true'
    )
    restoreEnv()
  })
})

describe('buildInvalidHelperTokenResponse', () => {
  test('returns 401 status code', () => {
    const result = buildInvalidHelperTokenResponse()
    expect(result.statusCode).toBe(401)
  })

  test('returns text/plain content type', () => {
    const result = buildInvalidHelperTokenResponse()
    expect(result.contentType).toBe('text/plain')
  })

  test('returns appropriate error message', () => {
    const result = buildInvalidHelperTokenResponse()
    expect(result.body).toBe('Invalid or expired helper token')
  })
})

describe('extractHelperToken', () => {
  test('extracts token from Bearer authorization header', () => {
    const headers = { authorization: 'Bearer sk-ant-api03-abc123' }
    expect(extractHelperToken(headers)).toBe('sk-ant-api03-abc123')
  })

  test('extracts token from x-api-key header', () => {
    const headers = { 'x-api-key': 'sk-ant-api03-xyz789' }
    expect(extractHelperToken(headers)).toBe('sk-ant-api03-xyz789')
  })

  test('prefers authorization header over x-api-key', () => {
    const headers = {
      authorization: 'Bearer auth-token',
      'x-api-key': 'api-key-token',
    }
    expect(extractHelperToken(headers)).toBe('auth-token')
  })

  test('returns null when no token headers present', () => {
    const headers = { 'content-type': 'application/json' }
    expect(extractHelperToken(headers)).toBeNull()
  })

  test('returns null for array authorization header', () => {
    const headers = { authorization: ['Bearer token1', 'Bearer token2'] }
    expect(extractHelperToken(headers)).toBeNull()
  })

  test('returns null for non-Bearer authorization header', () => {
    const headers = { authorization: 'Basic abc123' }
    expect(extractHelperToken(headers)).toBeNull()
  })

  test('handles case-insensitive Bearer prefix', () => {
    const headers = { authorization: 'bearer sk-ant-api03-abc123' }
    expect(extractHelperToken(headers)).toBe('sk-ant-api03-abc123')
  })
})

describe('validateHelperToken', () => {
  test('returns true for valid token within TTL', () => {
    const now = Date.now()
    const state = rotateHelperToken(createHelperTokenState(), now)
    expect(validateHelperToken(state.current!.token, state, now)).toBe(true)
  })

  test('returns false for mismatched token', () => {
    const now = Date.now()
    const state = rotateHelperToken(createHelperTokenState(), now)
    expect(validateHelperToken('wrong-token', state, now)).toBe(false)
  })

  test('returns false for null incoming token', () => {
    const now = Date.now()
    const state = rotateHelperToken(createHelperTokenState(), now)
    expect(validateHelperToken(null, state, now)).toBe(false)
  })

  test('returns false when state has no current token', () => {
    const state = createHelperTokenState()
    expect(validateHelperToken('any-token', state)).toBe(false)
  })

  test('returns false for expired token', () => {
    const issuedAt = Date.now()
    const state = rotateHelperToken(createHelperTokenState(), issuedAt)
    const expiredTime = issuedAt + HELPER_TOKEN_TTL_MS + 1
    expect(validateHelperToken(state.current!.token, state, expiredTime)).toBe(
      false
    )
  })
})

describe('getOrRefreshHelperToken', () => {
  test('generates new token when state has no current token', () => {
    const state = createHelperTokenState()
    const result = getOrRefreshHelperToken(state)
    expect(result.token).toMatch(/^sk-ant-api03-/)
    expect(result.state.current).not.toBeNull()
  })

  test('returns existing token when still valid', () => {
    const now = Date.now()
    const initialState = rotateHelperToken(createHelperTokenState(), now)
    const initialToken = initialState.current!.token

    const result = getOrRefreshHelperToken(initialState, now + 1000)
    expect(result.token).toBe(initialToken)
  })

  test('rotates token when expired', () => {
    const issuedAt = Date.now()
    const initialState = rotateHelperToken(createHelperTokenState(), issuedAt)
    const initialToken = initialState.current!.token

    const expiredTime = issuedAt + HELPER_TOKEN_TTL_MS + 1
    const result = getOrRefreshHelperToken(initialState, expiredTime)

    expect(result.token).not.toBe(initialToken)
    expect(result.token).toMatch(/^sk-ant-api03-/)
  })
})

describe('buildTokenResponse', () => {
  test('returns 200 status', () => {
    const response = buildTokenResponse('test-token')
    expect(response.status).toBe(200)
  })

  test('returns text/plain content type', () => {
    const response = buildTokenResponse('test-token')
    if (response.kind === 'error') {
      expect(response.contentType).toBe('text/plain')
    }
  })

  test('returns token in body', () => {
    const response = buildTokenResponse('sk-ant-api03-abc123')
    if (response.kind === 'error') {
      expect(response.body).toBe('sk-ant-api03-abc123')
    }
  })
})

describe('handleProxyRequest with helper token validation', () => {
  test('accepts request with valid helper token', async () => {
    stubEnv('CLAUDE_CODE_OAUTH_TOKEN', undefined)
    const now = Date.now()
    const state = rotateHelperToken(createHelperTokenState(), now)
    const fetchStub = createFetchStub(async () => {
      return new Response('{"ok":true}', { status: 200 })
    })
    const dependencies = createDependenciesWithToken('oauth-token', fetchStub)
    const request = createTestRequest({
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${state.current!.token}`,
      },
    })

    const response = await handleProxyRequest(request, dependencies, state, now)

    expect(response.kind).toBe('success')
    if (response.kind === 'success') {
      expect(response.status).toBe(200)
    }
    restoreEnv()
  })

  test('accepts request with valid helper token in x-api-key', async () => {
    stubEnv('CLAUDE_CODE_OAUTH_TOKEN', undefined)
    const now = Date.now()
    const state = rotateHelperToken(createHelperTokenState(), now)
    const fetchStub = createFetchStub(async () => {
      return new Response('{"ok":true}', { status: 200 })
    })
    const dependencies = createDependenciesWithToken('oauth-token', fetchStub)
    const request = createTestRequest({
      headers: {
        'content-type': 'application/json',
        'x-api-key': state.current!.token,
      },
    })

    const response = await handleProxyRequest(request, dependencies, state, now)

    expect(response.kind).toBe('success')
    restoreEnv()
  })

  test('rejects request with invalid helper token', async () => {
    stubEnv('CLAUDE_CODE_OAUTH_TOKEN', undefined)
    const now = Date.now()
    const state = rotateHelperToken(createHelperTokenState(), now)
    const fetchStub = createFetchStub(async () => {
      throw new Error('should not be called')
    })
    const dependencies = createDependenciesWithToken('oauth-token', fetchStub)
    const request = createTestRequest({
      headers: {
        'content-type': 'application/json',
        authorization: 'Bearer invalid-token',
      },
    })

    const response = await handleProxyRequest(request, dependencies, state, now)

    expect(response.kind).toBe('error')
    if (response.kind === 'error') {
      expect(response.status).toBe(401)
      expect(response.body).toBe('Invalid or expired helper token')
    }
    restoreEnv()
  })

  test('rejects request with expired helper token', async () => {
    stubEnv('CLAUDE_CODE_OAUTH_TOKEN', undefined)
    const issuedAt = Date.now()
    const state = rotateHelperToken(createHelperTokenState(), issuedAt)
    const expiredTime = issuedAt + HELPER_TOKEN_TTL_MS + 1
    const fetchStub = createFetchStub(async () => {
      throw new Error('should not be called')
    })
    const dependencies = createDependenciesWithToken('oauth-token', fetchStub)
    const request = createTestRequest({
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${state.current!.token}`,
      },
    })

    const response = await handleProxyRequest(
      request,
      dependencies,
      state,
      expiredTime
    )

    expect(response.kind).toBe('error')
    if (response.kind === 'error') {
      expect(response.status).toBe(401)
      expect(response.body).toBe('Invalid or expired helper token')
    }
    restoreEnv()
  })

  test('rejects request with no helper token when validation enabled', async () => {
    stubEnv('CLAUDE_CODE_OAUTH_TOKEN', undefined)
    const now = Date.now()
    const state = rotateHelperToken(createHelperTokenState(), now)
    const fetchStub = createFetchStub(async () => {
      throw new Error('should not be called')
    })
    const dependencies = createDependenciesWithToken('oauth-token', fetchStub)
    const request = createTestRequest({
      headers: {
        'content-type': 'application/json',
      },
    })

    const response = await handleProxyRequest(request, dependencies, state, now)

    expect(response.kind).toBe('error')
    if (response.kind === 'error') {
      expect(response.status).toBe(401)
      expect(response.body).toBe('Invalid or expired helper token')
    }
    restoreEnv()
  })

  test('skips validation when no helper token state provided', async () => {
    stubEnv('CLAUDE_CODE_OAUTH_TOKEN', undefined)
    const fetchStub = createFetchStub(async () => {
      return new Response('{"ok":true}', { status: 200 })
    })
    const dependencies = createDependenciesWithToken('oauth-token', fetchStub)
    const request = createTestRequest()

    const response = await handleProxyRequest(request, dependencies)

    expect(response.kind).toBe('success')
    restoreEnv()
  })
})
