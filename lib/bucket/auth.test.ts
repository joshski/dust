import { afterEach, describe, expect, test } from 'vitest'
import {
  createFetchStub,
  createFileSystemEmulator,
  restoreEnv,
  stubEnv,
} from '../test/test-utilities'
import {
  type AuthDependencies,
  authenticate,
  clearToken,
  defaultExchangeCode,
  loadStoredToken,
  storeToken,
} from './auth'

describe('loadStoredToken', () => {
  test('returns token from credentials file', async () => {
    const fileSystem = createFileSystemEmulator({
      home: { '.dust': { 'credentials.json': '{"token":"abc123"}' } },
    })
    const token = await loadStoredToken(fileSystem, '/home')
    expect(token).toBe('abc123')
  })

  test('returns null when file does not exist', async () => {
    const fileSystem = createFileSystemEmulator()
    const token = await loadStoredToken(fileSystem, '/home')
    expect(token).toBeNull()
  })

  test('throws when file contains invalid JSON', async () => {
    const fileSystem = createFileSystemEmulator({
      home: { '.dust': { 'credentials.json': 'not json' } },
    })
    await expect(loadStoredToken(fileSystem, '/home')).rejects.toThrow(
      SyntaxError
    )
  })

  test('returns null when token field is not a string', async () => {
    const fileSystem = createFileSystemEmulator({
      home: { '.dust': { 'credentials.json': '{"token":42}' } },
    })
    const token = await loadStoredToken(fileSystem, '/home')
    expect(token).toBeNull()
  })

  test('returns null when file is empty object', async () => {
    const fileSystem = createFileSystemEmulator({
      home: { '.dust': { 'credentials.json': '{}' } },
    })
    const token = await loadStoredToken(fileSystem, '/home')
    expect(token).toBeNull()
  })

  test('re-throws unexpected filesystem errors', async () => {
    const permissionError = new Error('EACCES: permission denied')
    ;(permissionError as NodeJS.ErrnoException).code = 'EACCES'
    const fileSystem = createFileSystemEmulator()
    fileSystem.readFile = async () => {
      throw permissionError
    }
    await expect(loadStoredToken(fileSystem, '/home')).rejects.toThrow(
      'EACCES: permission denied'
    )
  })
})

describe('storeToken', () => {
  test('writes token to credentials file', async () => {
    const fileSystem = createFileSystemEmulator()
    await storeToken(fileSystem, '/home', 'my-token')
    expect(fileSystem.writtenFiles.get('/home/.dust/credentials.json')).toBe(
      '{"token":"my-token"}'
    )
  })

  test('creates .dust directory', async () => {
    const fileSystem = createFileSystemEmulator()
    await storeToken(fileSystem, '/home', 'tok')
    expect(fileSystem.createdDirs).toContain('/home/.dust')
  })
})

describe('clearToken', () => {
  test('overwrites credentials file with empty object', async () => {
    const fileSystem = createFileSystemEmulator({
      home: { '.dust': { 'credentials.json': '{"token":"abc"}' } },
    })
    await clearToken(fileSystem, '/home')
    expect(fileSystem.writtenFiles.get('/home/.dust/credentials.json')).toBe(
      '{}'
    )
  })

  test('does not throw when file does not exist', async () => {
    const fileSystem = createFileSystemEmulator()
    await expect(clearToken(fileSystem, '/home')).resolves.toBeUndefined()
  })

  test('does not throw when writeFile throws ENOENT', async () => {
    const enoentError = new Error('ENOENT: no such file')
    ;(enoentError as NodeJS.ErrnoException).code = 'ENOENT'
    const fileSystem = createFileSystemEmulator()
    fileSystem.writeFile = async () => {
      throw enoentError
    }
    await expect(clearToken(fileSystem, '/home')).resolves.toBeUndefined()
  })

  test('re-throws unexpected filesystem errors', async () => {
    const permissionError = new Error('EACCES: permission denied')
    ;(permissionError as NodeJS.ErrnoException).code = 'EACCES'
    const fileSystem = createFileSystemEmulator()
    fileSystem.writeFile = async () => {
      throw permissionError
    }
    await expect(clearToken(fileSystem, '/home')).rejects.toThrow(
      'EACCES: permission denied'
    )
  })
})

describe('defaultExchangeCode', () => {
  afterEach(() => {
    restoreEnv()
  })

  test('exchanges code for token', async () => {
    stubEnv('DUST_BUCKET_HOST', 'http://localhost:9999')
    const stubFetch = createFetchStub(
      async () =>
        new Response(JSON.stringify({ token: 'exchanged-token' }), {
          status: 200,
        })
    )

    const token = await defaultExchangeCode('my-code', stubFetch)
    expect(token).toBe('exchanged-token')
  })

  test('throws when response is not ok', async () => {
    stubEnv('DUST_BUCKET_HOST', 'http://localhost:9999')
    const stubFetch = createFetchStub(
      async () => new Response('error', { status: 401 })
    )

    await expect(defaultExchangeCode('bad-code', stubFetch)).rejects.toThrow(
      'Token exchange failed: 401'
    )
  })

  test('throws when response has no token string', async () => {
    stubEnv('DUST_BUCKET_HOST', 'http://localhost:9999')
    const stubFetch = createFetchStub(
      async () =>
        new Response(JSON.stringify({ token: 42 }), {
          status: 200,
        })
    )

    await expect(defaultExchangeCode('my-code', stubFetch)).rejects.toThrow(
      'Invalid token exchange response'
    )
  })
})

describe('authenticate', () => {
  afterEach(() => {
    restoreEnv()
  })

  function createMockDependencies(
    overrides: Partial<AuthDependencies> = {}
  ): AuthDependencies {
    return {
      createServer: handler => {
        setTimeout(() => {
          handler(new Request('http://localhost:9999/callback?code=test-code'))
        }, 0)
        return { port: 9999, stop: () => {} }
      },
      openBrowser: () => {},
      getHomeDir: () => '/home',
      fileSystem: createFileSystemEmulator(),
      exchangeCode: async () => 'test-token',
      ...overrides,
    }
  }

  test('opens browser with auth URL containing port', async () => {
    stubEnv('DUST_BUCKET_HOST', undefined)
    let openedUrl: string | undefined
    const authDependencies = createMockDependencies({
      openBrowser: url => {
        openedUrl = url
      },
    })

    await authenticate(authDependencies)

    expect(openedUrl).toBe('https://dustbucket.com/auth/cli?port=9999')
  })

  test('returns token from callback', async () => {
    const authDependencies = createMockDependencies()
    const token = await authenticate(authDependencies)
    expect(token).toBe('test-token')
  })

  test('uses DUST_BUCKET_HOST env var when set', async () => {
    stubEnv('DUST_BUCKET_HOST', 'http://localhost:3000')
    let openedUrl: string | undefined
    const authDependencies = createMockDependencies({
      openBrowser: url => {
        openedUrl = url
      },
    })

    await authenticate(authDependencies)

    expect(openedUrl).toBe('http://localhost:3000/auth/cli?port=9999')
  })

  test('stops server after receiving token', async () => {
    let stopped = false
    const authDependencies = createMockDependencies({
      createServer: handler => {
        setTimeout(() => {
          handler(new Request('http://localhost:9999/callback?code=test-code'))
        }, 0)
        return {
          port: 9999,
          stop: () => {
            stopped = true
          },
        }
      },
    })

    await authenticate(authDependencies)

    expect(stopped).toBe(true)
  })

  test('handler returns 400 for callback without code', async () => {
    let capturedHandler: ((request: Request) => Response) | undefined
    const authDependencies = createMockDependencies({
      createServer: handler => {
        capturedHandler = handler
        setTimeout(() => {
          handler(new Request('http://localhost:9999/callback?code=test-code'))
        }, 0)
        return { port: 9999, stop: () => {} }
      },
    })

    await authenticate(authDependencies)

    const response = capturedHandler?.(
      new Request('http://localhost:9999/callback')
    )
    expect(response?.status).toBe(400)
  })

  test('handler returns 404 for unknown paths', async () => {
    let capturedHandler: ((request: Request) => Response) | undefined
    const authDependencies = createMockDependencies({
      createServer: handler => {
        capturedHandler = handler
        setTimeout(() => {
          handler(new Request('http://localhost:9999/callback?code=test-code'))
        }, 0)
        return { port: 9999, stop: () => {} }
      },
    })

    await authenticate(authDependencies)

    const response = capturedHandler?.(
      new Request('http://localhost:9999/other')
    )
    expect(response?.status).toBe(404)
  })

  test('rejects when createServer throws', async () => {
    const authDependencies = createMockDependencies({
      createServer: () => {
        throw new Error('port in use')
      },
    })

    await expect(authenticate(authDependencies)).rejects.toThrow('port in use')
  })

  test('rejects on timeout', async () => {
    let stopped = false
    const authDependencies = createMockDependencies({
      createServer: () => ({
        port: 9999,
        stop: () => {
          stopped = true
        },
      }),
      authTimeoutMs: 10,
    })

    await expect(authenticate(authDependencies)).rejects.toThrow(
      'Authentication timed out'
    )
    expect(stopped).toBe(true)
  })

  test('uses defaultExchangeCode when exchangeCode not provided', async () => {
    stubEnv('DUST_BUCKET_HOST', 'http://localhost:9999')
    const stubFetch = createFetchStub(
      async () =>
        new Response(JSON.stringify({ token: 'default-exchange-token' }), {
          status: 200,
        })
    )

    const authDependencies: AuthDependencies = {
      createServer: handler => {
        setTimeout(() => {
          handler(new Request('http://localhost:9999/callback?code=test-code'))
        }, 0)
        return { port: 9999, stop: () => {} }
      },
      openBrowser: () => {},
      getHomeDir: () => '/home',
      fileSystem: createFileSystemEmulator(),
      fetch: stubFetch,
      // Note: exchangeCode is intentionally not provided to test the fallback
    }

    const token = await authenticate(authDependencies)
    expect(token).toBe('default-exchange-token')
  })
})
