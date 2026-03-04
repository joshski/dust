import { describe, expect, test } from 'vitest'
import { restoreEnv, stubEnv } from '../test/test-utilities'
import {
  type ClaudeApiProxyDependencies,
  isTokenExpired,
  readOAuthToken,
} from './claude-api-proxy'

function createMockFetch(): typeof fetch {
  return (() => {
    throw new Error('fetch not implemented in test')
  }) as unknown as typeof fetch
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
