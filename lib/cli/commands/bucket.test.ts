import { EventEmitter } from 'node:events'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import type { AuthDependencies } from '../../bucket/auth'
import type { WebSocketLike } from '../../bucket/events'
import { WS_CLOSED, WS_OPEN } from '../../bucket/events'
import {
  createLogBuffer,
  getLogLines,
  type LogBuffer,
} from '../../bucket/log-buffer'
import type { RepositoryState } from '../../bucket/repository'
import {
  asTestType,
  createContextEmulator,
  createFileSystemEmulator,
  createTestAgentSessionStartedEvent,
  restoreEnv,
  stubEnv,
} from '../../test/test-utilities'
import type { CommandDependencies } from '../types'
import {
  type AuthFileSystemDependencies,
  type BucketDependencies,
  bucketWorker,
  connectWebSocket,
  createAuthFileSystem,
  createDefaultBucketDependencies,
  createInitialState,
  createKeypressHandler,
  createTUIContext,
  getWebSocketUrl,
  handleRepositoryListError,
  handleRepositoryListSuccess,
  logMessage,
  setupTUI,
  shutdown,
  syncAgentStatuses,
  syncTUI,
  syncUIWithRepoList,
  waitForConnection,
} from './bucket'

function createMockAuthDeps(
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

function createDependencies(): CommandDependencies {
  const context = createContextEmulator()
  const fileSystem = createFileSystemEmulator()
  return {
    arguments: [],
    context,
    fileSystem,
    globScanner: fileSystem,
    settings: { dustCommand: 'dust' },
  }
}

function createMockWebSocket(): WebSocketLike & EventEmitter {
  const ws = new EventEmitter() as WebSocketLike & EventEmitter
  ws.readyState = WS_CLOSED
  ws.onopen = null
  ws.onclose = null
  ws.onerror = null
  ws.onmessage = null
  ws.close = () => {
    ws.readyState = WS_CLOSED
  }
  ws.send = () => {}
  return ws
}

/** Create a mock ws that auto-fires onopen so waitForConnection resolves. */
function createAutoConnectWebSocket(): WebSocketLike & EventEmitter {
  const ws = createMockWebSocket()
  setTimeout(() => ws.onopen?.(), 0)
  return ws
}

function createBucketDependencies(
  overrides: Partial<BucketDependencies> = {}
): BucketDependencies {
  return {
    spawn: asTestType<BucketDependencies['spawn']>(() => {
      const proc = new EventEmitter()
      return proc
    }),
    createWebSocket: () => createAutoConnectWebSocket(),
    discoverAgentCapabilities: async () => ({
      type: 'agent-capabilities',
      agents: [],
    }),
    setupKeypress: () => () => {},
    setupSignals: () => () => {},
    setupResize: () => () => {},
    getTerminalSize: () => ({ width: 80, height: 24 }),
    writeStdout: () => {},
    isTTY: false,
    sleep: () => new Promise(() => {}),
    getReposDir: () => '/tmp',
    auth: createMockAuthDeps(),
    ...overrides,
  }
}

describe('createDefaultBucketDependencies', () => {
  test('returns object with all required dependency functions', () => {
    const bucketDependencies = createDefaultBucketDependencies()
    expect(typeof bucketDependencies.spawn).toBe('function')
    expect(typeof bucketDependencies.createWebSocket).toBe('function')
    expect(typeof bucketDependencies.setupKeypress).toBe('function')
    expect(typeof bucketDependencies.setupSignals).toBe('function')
    expect(typeof bucketDependencies.setupResize).toBe('function')
    expect(typeof bucketDependencies.getTerminalSize).toBe('function')
    expect(typeof bucketDependencies.writeStdout).toBe('function')
    expect(typeof bucketDependencies.isTTY).toBe('boolean')
    expect(typeof bucketDependencies.sleep).toBe('function')
    expect(typeof bucketDependencies.getReposDir).toBe('function')
  })
})

function createMockAuthFileSystemDeps(
  overrides: Partial<AuthFileSystemDependencies> = {}
): AuthFileSystemDependencies {
  return {
    accessSync: () => {},
    statSync: () => ({ isDirectory: () => false, birthtimeMs: 1000 }),
    readFile: async () => '',
    writeFile: async () => {},
    mkdir: async () => undefined,
    readdir: async () => [],
    chmod: async () => {},
    rename: async () => {},
    ...overrides,
  }
}

describe('createAuthFileSystem', () => {
  describe('exists', () => {
    test('returns true when accessSync succeeds', () => {
      const authFs = createAuthFileSystem(createMockAuthFileSystemDeps())
      expect(authFs.exists('/some/path')).toBe(true)
    })

    test('returns false when accessSync throws', () => {
      const authFs = createAuthFileSystem(
        createMockAuthFileSystemDeps({
          accessSync: () => {
            throw new Error('ENOENT')
          },
        })
      )
      expect(authFs.exists('/some/path')).toBe(false)
    })
  })

  describe('isDirectory', () => {
    test('returns true when statSync indicates directory', () => {
      const authFs = createAuthFileSystem(
        createMockAuthFileSystemDeps({
          statSync: () => ({ isDirectory: () => true, birthtimeMs: 1000 }),
        })
      )
      expect(authFs.isDirectory('/some/path')).toBe(true)
    })

    test('returns false when statSync indicates file', () => {
      const authFs = createAuthFileSystem(
        createMockAuthFileSystemDeps({
          statSync: () => ({ isDirectory: () => false, birthtimeMs: 1000 }),
        })
      )
      expect(authFs.isDirectory('/some/path')).toBe(false)
    })

    test('returns false when statSync throws', () => {
      const authFs = createAuthFileSystem(
        createMockAuthFileSystemDeps({
          statSync: () => {
            throw new Error('ENOENT')
          },
        })
      )
      expect(authFs.isDirectory('/some/path')).toBe(false)
    })
  })

  describe('getFileCreationTime', () => {
    test('returns birthtimeMs from statSync', () => {
      const authFs = createAuthFileSystem(
        createMockAuthFileSystemDeps({
          statSync: () => ({
            isDirectory: () => false,
            birthtimeMs: 1234567890,
          }),
        })
      )
      expect(authFs.getFileCreationTime('/some/path')).toBe(1234567890)
    })
  })

  describe('thin wrapper methods', () => {
    test('readFile delegates to dependency', async () => {
      let capturedPath: string | undefined
      const authFs = createAuthFileSystem(
        createMockAuthFileSystemDeps({
          readFile: async (path: string) => {
            capturedPath = path
            return 'file contents'
          },
        })
      )
      const result = await authFs.readFile('/test/file')
      expect(capturedPath).toBe('/test/file')
      expect(result).toBe('file contents')
    })

    test('writeFile delegates to dependency', async () => {
      let capturedPath: string | undefined
      let capturedContent: string | undefined
      const authFs = createAuthFileSystem(
        createMockAuthFileSystemDeps({
          writeFile: async (path: string, content: string) => {
            capturedPath = path
            capturedContent = content
          },
        })
      )
      await authFs.writeFile('/test/file', 'content')
      expect(capturedPath).toBe('/test/file')
      expect(capturedContent).toBe('content')
    })

    test('mkdir delegates to dependency', async () => {
      let capturedPath: string | undefined
      let capturedOptions: { recursive?: boolean } | undefined
      const authFs = createAuthFileSystem(
        createMockAuthFileSystemDeps({
          mkdir: async (path: string, options?: { recursive?: boolean }) => {
            capturedPath = path
            capturedOptions = options
            return undefined
          },
        })
      )
      await authFs.mkdir('/test/dir', { recursive: true })
      expect(capturedPath).toBe('/test/dir')
      expect(capturedOptions).toEqual({ recursive: true })
    })

    test('readdir delegates to dependency', async () => {
      let capturedPath: string | undefined
      const authFs = createAuthFileSystem(
        createMockAuthFileSystemDeps({
          readdir: async (path: string) => {
            capturedPath = path
            return ['file1', 'file2']
          },
        })
      )
      const result = await authFs.readdir('/test/dir')
      expect(capturedPath).toBe('/test/dir')
      expect(result).toEqual(['file1', 'file2'])
    })

    test('chmod delegates to dependency', async () => {
      let capturedPath: string | undefined
      let capturedMode: number | undefined
      const authFs = createAuthFileSystem(
        createMockAuthFileSystemDeps({
          chmod: async (path: string, mode: number) => {
            capturedPath = path
            capturedMode = mode
          },
        })
      )
      await authFs.chmod('/test/file', 0o755)
      expect(capturedPath).toBe('/test/file')
      expect(capturedMode).toBe(0o755)
    })

    test('rename delegates to dependency', async () => {
      let capturedOldPath: string | undefined
      let capturedNewPath: string | undefined
      const authFs = createAuthFileSystem(
        createMockAuthFileSystemDeps({
          rename: async (oldPath: string, newPath: string) => {
            capturedOldPath = oldPath
            capturedNewPath = newPath
          },
        })
      )
      await authFs.rename('/old/path', '/new/path')
      expect(capturedOldPath).toBe('/old/path')
      expect(capturedNewPath).toBe('/new/path')
    })
  })
})

describe('createInitialState', () => {
  test('returns initial state with system buffer and session', () => {
    const state = createInitialState()
    expect(state.ws).toBeNull()
    expect(state.repositories).toBeInstanceOf(Map)
    expect(state.repositories.size).toBe(0)
    expect(state.reconnectDelay).toBe(1000)
    expect(state.reconnectTimer).toBeNull()
    expect(state.shuttingDown).toBe(false)
    expect(state.sessionId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    )
    expect(typeof state.emit).toBe('function')
    expect(state.ui).toBeDefined()
    expect(state.logBuffers).toBeInstanceOf(Map)
    expect(state.logBuffers.has('system')).toBe(true)
    expect(state.ui.repositories).toContain('system')
  })

  test('sendEvent function uses state.ws', () => {
    const state = createInitialState()
    const sentMessages: string[] = []

    // No ws set - sendEvent should not send
    state.sendEvent({
      sequence: 1,
      timestamp: new Date().toISOString(),
      sessionId: state.sessionId,
      repository: 'test',
      event: createTestAgentSessionStartedEvent(),
    })
    expect(sentMessages).toHaveLength(0)

    const ws = createMockWebSocket()
    ws.readyState = WS_OPEN
    ws.send = (data: string) => sentMessages.push(data)
    state.ws = ws

    state.sendEvent({
      sequence: 2,
      timestamp: new Date().toISOString(),
      sessionId: state.sessionId,
      repository: 'test',
      event: createTestAgentSessionStartedEvent(),
    })
    expect(sentMessages).toHaveLength(1)
  })
})

describe('getWebSocketUrl', () => {
  const savedUrl = process.env.DUST_BUCKET_AGENT_CONNECT_URL

  beforeEach(() => {
    delete process.env.DUST_BUCKET_AGENT_CONNECT_URL
  })

  afterEach(() => {
    if (savedUrl !== undefined) {
      process.env.DUST_BUCKET_AGENT_CONNECT_URL = savedUrl
    }
    restoreEnv()
  })

  test('returns default URL when env var is not set', () => {
    expect(getWebSocketUrl()).toBe('wss://dustbucket.com/agent/connect')
  })

  test('returns env var URL when DUST_BUCKET_AGENT_CONNECT_URL is set', () => {
    stubEnv('DUST_BUCKET_AGENT_CONNECT_URL', 'ws://localhost:3000/ws')
    expect(getWebSocketUrl()).toBe('ws://localhost:3000/ws')
  })
})

describe('logMessage', () => {
  test('writes to context.stdout in non-TUI mode', () => {
    const dependencies = createDependencies()
    const context = dependencies.context as ReturnType<
      typeof createContextEmulator
    >
    const state = createInitialState()

    logMessage(state, dependencies.context, false, 'hello')

    expect(context.stdoutLines).toContain('hello')
  })

  test('writes to context.stderr in non-TUI mode for stderr stream', () => {
    const dependencies = createDependencies()
    const context = dependencies.context as ReturnType<
      typeof createContextEmulator
    >
    const state = createInitialState()

    logMessage(state, dependencies.context, false, 'error msg', 'stderr')

    expect(context.stderrLines).toContain('error msg')
  })

  test('writes to system log buffer in TUI mode', () => {
    const dependencies = createDependencies()
    const state = createInitialState()

    logMessage(state, dependencies.context, true, 'tui message')

    const systemBuffer = state.logBuffers.get('system')
    expect(systemBuffer).toBeDefined()
    const lines = getLogLines(systemBuffer as LogBuffer)
    expect(lines.length).toBe(1)
    expect(lines[0].text).toBe('tui message')
    expect(lines[0].stream).toBe('stdout')
  })

  test('writes stderr to system log buffer in TUI mode', () => {
    const dependencies = createDependencies()
    const state = createInitialState()

    logMessage(state, dependencies.context, true, 'tui error', 'stderr')

    const systemBuffer = state.logBuffers.get('system')
    expect(systemBuffer).toBeDefined()
    const lines = getLogLines(systemBuffer as LogBuffer)
    expect(lines.length).toBe(1)
    expect(lines[0].text).toBe('tui error')
    expect(lines[0].stream).toBe('stderr')
  })

  test('does nothing in TUI mode when system buffer is missing', () => {
    const dependencies = createDependencies()
    const state = createInitialState()
    state.logBuffers.delete('system')

    logMessage(state, dependencies.context, true, 'should be dropped')

    expect(state.logBuffers.has('system')).toBe(false)
  })
})

describe('createTUIContext', () => {
  test('returns original context when not in TUI mode', () => {
    const dependencies = createDependencies()
    const state = createInitialState()

    const wrapped = createTUIContext(state, dependencies.context, false)

    expect(wrapped).toBe(dependencies.context)
  })

  test('routes stdout to system log buffer in TUI mode', () => {
    const dependencies = createDependencies()
    const state = createInitialState()

    const wrapped = createTUIContext(state, dependencies.context, true)
    wrapped.stdout('hello from repo')

    const systemBuffer = state.logBuffers.get('system')
    expect(systemBuffer).toBeDefined()
    const lines = getLogLines(systemBuffer as LogBuffer)
    const match = lines.find(l => l.text === 'hello from repo')
    expect(match).toBeDefined()
    expect(match?.stream).toBe('stdout')
  })

  test('routes stderr to system log buffer in TUI mode', () => {
    const dependencies = createDependencies()
    const state = createInitialState()

    const wrapped = createTUIContext(state, dependencies.context, true)
    wrapped.stderr('clone error details')

    const systemBuffer = state.logBuffers.get('system')
    expect(systemBuffer).toBeDefined()
    const lines = getLogLines(systemBuffer as LogBuffer)
    const match = lines.find(l => l.text === 'clone error details')
    expect(match).toBeDefined()
    expect(match?.stream).toBe('stderr')
  })
})

describe('waitForConnection', () => {
  test('resolves with WebSocket on successful open', async () => {
    const bucketDependencies = createBucketDependencies()

    const ws = await waitForConnection('my-token', bucketDependencies)

    expect(ws).toBeDefined()
    expect(ws.send).toBeDefined()
  })

  test('rejects on WebSocket error', async () => {
    const ws = createMockWebSocket()
    const bucketDependencies = createBucketDependencies({
      createWebSocket: () => {
        setTimeout(() => ws.onerror?.(new Error('Connection refused')), 0)
        return ws
      },
    })

    await expect(
      waitForConnection('my-token', bucketDependencies)
    ).rejects.toThrow('Connection refused')
  })

  test('rejects on WebSocket close before open', async () => {
    const ws = createMockWebSocket()
    const bucketDependencies = createBucketDependencies({
      createWebSocket: () => {
        setTimeout(() => ws.onclose?.({ code: 1006, reason: '' }), 0)
        return ws
      },
    })

    await expect(
      waitForConnection('my-token', bucketDependencies)
    ).rejects.toThrow('Connection closed (code 1006)')
  })

  test('passes token to createWebSocket', async () => {
    let capturedToken: string | undefined
    const bucketDependencies = createBucketDependencies({
      createWebSocket: (_url, token) => {
        capturedToken = token
        return createAutoConnectWebSocket()
      },
    })

    await waitForConnection('secret-token', bucketDependencies)

    expect(capturedToken).toBe('secret-token')
  })
})

describe('connectWebSocket', () => {
  const savedUrl = process.env.DUST_BUCKET_AGENT_CONNECT_URL

  beforeEach(() => {
    delete process.env.DUST_BUCKET_AGENT_CONNECT_URL
  })

  afterEach(() => {
    if (savedUrl !== undefined) {
      process.env.DUST_BUCKET_AGENT_CONNECT_URL = savedUrl
    }
  })

  test('creates WebSocket with token', () => {
    const dependencies = createDependencies()
    const state = createInitialState()
    let capturedUrl: string | undefined
    let capturedToken: string | undefined

    const bucketDependencies = createBucketDependencies({
      createWebSocket: (url, token) => {
        capturedUrl = url
        capturedToken = token
        return createMockWebSocket()
      },
    })

    connectWebSocket(
      'my-token',
      state,
      bucketDependencies,
      dependencies.context,
      dependencies.fileSystem,
      false
    )

    expect(capturedUrl).toBe('wss://dustbucket.com/agent/connect')
    expect(capturedToken).toBe('my-token')
  })

  test('emits connected event and resets reconnect delay on open', () => {
    const dependencies = createDependencies()
    const context = dependencies.context as ReturnType<
      typeof createContextEmulator
    >
    const state = createInitialState()
    state.reconnectDelay = 16000

    const ws = createMockWebSocket()

    const bucketDependencies = createBucketDependencies({
      createWebSocket: () => ws,
    })

    connectWebSocket(
      'token',
      state,
      bucketDependencies,
      dependencies.context,
      dependencies.fileSystem,
      false
    )

    ws.readyState = WS_OPEN
    ws.onopen?.()

    expect(state.reconnectDelay).toBe(1000)
    expect(context.stdoutLines.join('\n')).toContain('bucket.connected')
  })

  test('sends one agent-capabilities message before processing server traffic', async () => {
    const dependencies = createDependencies()
    const context = dependencies.context as ReturnType<
      typeof createContextEmulator
    >
    const state = createInitialState()

    const ws = createMockWebSocket()
    const sentMessages: string[] = []
    ws.send = (data: string) => {
      sentMessages.push(data)
    }

    let resolveDiscovery:
      | ((value: { type: 'agent-capabilities'; agents: [] }) => void)
      | undefined
    const discoveryPromise = new Promise<{
      type: 'agent-capabilities'
      agents: []
    }>(resolve => {
      resolveDiscovery = resolve
    })

    const bucketDependencies = createBucketDependencies({
      createWebSocket: () => ws,
      discoverAgentCapabilities: () => discoveryPromise,
    })

    connectWebSocket(
      'token',
      state,
      bucketDependencies,
      dependencies.context,
      dependencies.fileSystem,
      false
    )

    ws.readyState = WS_OPEN
    ws.onopen?.()
    ws.onmessage?.({
      data: JSON.stringify({
        type: 'repository-list',
        repositories: [],
      }),
    })

    expect(context.stdoutLines.join('\n')).not.toContain(
      'Received repository list'
    )
    expect(sentMessages).toHaveLength(0)

    resolveDiscovery?.({ type: 'agent-capabilities', agents: [] })
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(sentMessages).toHaveLength(1)
    expect(JSON.parse(sentMessages[0])).toEqual({
      type: 'agent-capabilities',
      agents: [],
    })
    expect(context.stdoutLines.join('\n')).toContain(
      'Received repository list (0 repositories):'
    )
  })

  test('uses pre-connected WebSocket when connectedWs is provided', () => {
    const dependencies = createDependencies()
    const context = dependencies.context as ReturnType<
      typeof createContextEmulator
    >
    const state = createInitialState()
    state.reconnectDelay = 16000

    const ws = createMockWebSocket()
    ws.readyState = WS_OPEN

    let wsCreated = false
    const bucketDependencies = createBucketDependencies({
      createWebSocket: () => {
        wsCreated = true
        return createMockWebSocket()
      },
    })

    connectWebSocket(
      'token',
      state,
      bucketDependencies,
      dependencies.context,
      dependencies.fileSystem,
      false,
      ws
    )

    expect(wsCreated).toBe(false)
    expect(state.ws).toBe(ws)
    expect(state.reconnectDelay).toBe(1000)
    expect(context.stdoutLines.join('\n')).toContain('Connected to dustbucket')
  })

  test('sends no-capability agent-capabilities handshake on connect', async () => {
    const dependencies = createDependencies()
    const state = createInitialState()

    const ws = createMockWebSocket()
    const sentMessages: string[] = []
    ws.send = (data: string) => {
      sentMessages.push(data)
    }

    const bucketDependencies = createBucketDependencies({
      createWebSocket: () => ws,
      discoverAgentCapabilities: async () => ({
        type: 'agent-capabilities',
        agents: [],
      }),
    })

    connectWebSocket(
      'token',
      state,
      bucketDependencies,
      dependencies.context,
      dependencies.fileSystem,
      false
    )

    ws.readyState = WS_OPEN
    ws.onopen?.()
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(JSON.parse(sentMessages[0])).toEqual({
      type: 'agent-capabilities',
      agents: [],
    })
  })

  test('sends partial-capability agent-capabilities handshake on connect', async () => {
    const dependencies = createDependencies()
    const state = createInitialState()

    const ws = createMockWebSocket()
    const sentMessages: string[] = []
    ws.send = (data: string) => {
      sentMessages.push(data)
    }

    const bucketDependencies = createBucketDependencies({
      createWebSocket: () => ws,
      discoverAgentCapabilities: async () => ({
        type: 'agent-capabilities',
        agents: [{ agentType: 'codex', models: [] }],
      }),
    })

    connectWebSocket(
      'token',
      state,
      bucketDependencies,
      dependencies.context,
      dependencies.fileSystem,
      false
    )

    ws.readyState = WS_OPEN
    ws.onopen?.()
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(JSON.parse(sentMessages[0])).toEqual({
      type: 'agent-capabilities',
      agents: [{ agentType: 'codex', models: [] }],
    })
  })

  test('uses "none" as reason when close event has empty reason', () => {
    const dependencies = createDependencies()
    const context = dependencies.context as ReturnType<
      typeof createContextEmulator
    >
    const state = createInitialState()

    const ws = createMockWebSocket()
    const bucketDependencies = createBucketDependencies({
      createWebSocket: () => ws,
    })

    connectWebSocket(
      'my-token',
      state,
      bucketDependencies,
      dependencies.context,
      dependencies.fileSystem,
      false
    )

    ws.onclose?.({ code: 1000, reason: '' })

    expect(context.stdoutLines.join('\n')).toContain('reason=none')

    if (state.reconnectTimer) clearTimeout(state.reconnectTimer)
  })

  test('schedules reconnection on close with exponential backoff', () => {
    const dependencies = createDependencies()
    const context = dependencies.context as ReturnType<
      typeof createContextEmulator
    >
    const state = createInitialState()

    const ws = createMockWebSocket()
    const bucketDependencies = createBucketDependencies({
      createWebSocket: () => ws,
    })

    connectWebSocket(
      'my-token',
      state,
      bucketDependencies,
      dependencies.context,
      dependencies.fileSystem,
      false
    )

    ws.onclose?.({ code: 1006, reason: 'Connection lost' })

    expect(context.stdoutLines.join('\n')).toContain('bucket.disconnected')
    expect(context.stdoutLines.join('\n')).toContain(
      'Reconnecting in 1 seconds'
    )
    expect(state.reconnectTimer).not.toBeNull()
    expect(state.reconnectDelay).toBe(2000)

    if (state.reconnectTimer) clearTimeout(state.reconnectTimer)
  })

  test('reconnection callback attempts to reconnect', async () => {
    const dependencies = createDependencies()
    const context = dependencies.context as ReturnType<
      typeof createContextEmulator
    >
    const state = createInitialState()
    state.reconnectDelay = 1

    let connectionAttempts = 0
    const ws = createMockWebSocket()
    const bucketDependencies = createBucketDependencies({
      createWebSocket: () => {
        connectionAttempts++
        return ws
      },
    })

    connectWebSocket(
      'my-token',
      state,
      bucketDependencies,
      dependencies.context,
      dependencies.fileSystem,
      false
    )

    expect(connectionAttempts).toBe(1)

    ws.onclose?.({ code: 1006, reason: 'Connection lost' })

    await new Promise(resolve => setTimeout(resolve, 10))

    expect(connectionAttempts).toBe(2)
    expect(
      context.stdoutLines.filter(line => line.includes('Connecting')).length
    ).toBe(2)

    if (state.reconnectTimer) clearTimeout(state.reconnectTimer)
  })

  test('does not reconnect when shutting down during close', () => {
    const dependencies = createDependencies()
    const context = dependencies.context as ReturnType<
      typeof createContextEmulator
    >
    const state = createInitialState()

    const ws = createMockWebSocket()
    const bucketDependencies = createBucketDependencies({
      createWebSocket: () => ws,
    })

    connectWebSocket(
      'my-token',
      state,
      bucketDependencies,
      dependencies.context,
      dependencies.fileSystem,
      false
    )

    state.shuttingDown = true

    ws.onclose?.({ code: 1000, reason: 'Normal closure' })

    expect(state.reconnectTimer).toBeNull()
    expect(context.stdoutLines.join('\n')).not.toContain('Reconnecting')
  })

  test('does not reconnect when closed with code 4000 (replaced by newer connection)', () => {
    const dependencies = createDependencies()
    const context = dependencies.context as ReturnType<
      typeof createContextEmulator
    >
    const state = createInitialState()

    const ws = createMockWebSocket()
    const bucketDependencies = createBucketDependencies({
      createWebSocket: () => ws,
    })

    connectWebSocket(
      'my-token',
      state,
      bucketDependencies,
      dependencies.context,
      dependencies.fileSystem,
      false
    )

    ws.onclose?.({ code: 4000, reason: 'Replaced by newer connection' })

    // Should NOT schedule reconnection for code 4000
    expect(state.reconnectTimer).toBeNull()
    expect(context.stdoutLines.join('\n')).toContain(
      'Another connection replaced this one'
    )
    expect(context.stdoutLines.join('\n')).not.toContain('Reconnecting')
  })

  test('does not connect when already shutting down', () => {
    const dependencies = createDependencies()
    const state = createInitialState()
    state.shuttingDown = true

    let wsCreated = false
    const bucketDependencies = createBucketDependencies({
      createWebSocket: () => {
        wsCreated = true
        return createMockWebSocket()
      },
    })

    connectWebSocket(
      'my-token',
      state,
      bucketDependencies,
      dependencies.context,
      dependencies.fileSystem,
      false
    )

    expect(wsCreated).toBe(false)
  })

  test('logs WebSocket errors', () => {
    const dependencies = createDependencies()
    const context = dependencies.context as ReturnType<
      typeof createContextEmulator
    >
    const state = createInitialState()

    const ws = createMockWebSocket()
    const bucketDependencies = createBucketDependencies({
      createWebSocket: () => ws,
    })

    connectWebSocket(
      'my-token',
      state,
      bucketDependencies,
      dependencies.context,
      dependencies.fileSystem,
      false
    )

    ws.onerror?.(new Error('Connection refused'))

    expect(context.stderrLines.join('\n')).toContain('WebSocket error')
    expect(context.stderrLines.join('\n')).toContain('Connection refused')
  })

  test('handles repository-list messages', () => {
    const dependencies = createDependencies()
    const context = dependencies.context as ReturnType<
      typeof createContextEmulator
    >
    const state = createInitialState()

    const ws = createMockWebSocket()
    const bucketDependencies = createBucketDependencies({
      createWebSocket: () => ws,
    })

    connectWebSocket(
      'my-token',
      state,
      bucketDependencies,
      dependencies.context,
      dependencies.fileSystem,
      false
    )

    ws.onmessage?.({
      data: JSON.stringify({
        type: 'repository-list',
        repositories: [
          {
            name: 'repo-a',
            id: 123,
            gitUrl: 'git@example.com:repo-a.git',
            url: 'https://example.com/repo-a',
            hasTask: true,
          },
          {
            name: 'repo-b',
            id: 456,
            gitUrl: 'git@example.com:repo-b.git',
            url: 'https://example.com/repo-b',
            hasTask: false,
          },
          {
            name: 'repo-c',
            id: 789,
            gitUrl: 'git@example.com:repo-c.git',
            url: 'https://example.com/repo-c',
            hasTask: false,
          },
        ],
      }),
    })

    const output = context.stdoutLines.join('\n')
    expect(output).toContain('Received repository list (3 repositories):')
    expect(output).toContain('name=repo-a')
    expect(output).toContain('gitUrl=git@example.com:repo-a.git')
    expect(output).toContain('name=repo-b')
    expect(output).toContain('gitUrl=git@example.com:repo-b.git')
    expect(output).toContain('name=repo-c')
    expect(output).toContain('gitUrl=git@example.com:repo-c.git')
  })

  test('eagerly adds repository tabs to UI on repository-list message', () => {
    const dependencies = createDependencies()
    const state = createInitialState()

    const ws = createMockWebSocket()
    const bucketDependencies = createBucketDependencies({
      createWebSocket: () => ws,
    })

    connectWebSocket(
      'my-token',
      state,
      bucketDependencies,
      dependencies.context,
      dependencies.fileSystem,
      false
    )

    ws.onmessage?.({
      data: JSON.stringify({
        type: 'repository-list',
        repositories: [
          {
            name: 'repo1',
            id: 1,
            gitUrl: 'git@example.com:user/repo1.git',
            url: 'https://example.com/repo1',
            hasTask: false,
          },
          {
            name: 'repo2',
            id: 2,
            gitUrl: 'git@example.com:user/repo2.git',
            url: 'https://example.com/repo2',
            hasTask: false,
          },
        ],
      }),
    })

    // Tabs should appear immediately (before cloning finishes)
    expect(state.ui.repositories).toContain('repo1')
    expect(state.ui.repositories).toContain('repo2')
    expect(state.logBuffers.has('repo1')).toBe(true)
    expect(state.logBuffers.has('repo2')).toBe(true)
  })

  test('removes stale repos from UI when receiving updated repository-list', () => {
    const dependencies = createDependencies()
    const state = createInitialState()

    const ws = createMockWebSocket()
    const bucketDependencies = createBucketDependencies({
      createWebSocket: () => ws,
    })

    connectWebSocket(
      'my-token',
      state,
      bucketDependencies,
      dependencies.context,
      dependencies.fileSystem,
      false
    )

    // First list with repo1 and repo2
    ws.onmessage?.({
      data: JSON.stringify({
        type: 'repository-list',
        repositories: [
          {
            name: 'repo1',
            id: 1,
            gitUrl: 'git@example.com:user/repo1.git',
            url: 'https://example.com/repo1',
            hasTask: false,
          },
          {
            name: 'repo2',
            id: 2,
            gitUrl: 'git@example.com:user/repo2.git',
            url: 'https://example.com/repo2',
            hasTask: false,
          },
        ],
      }),
    })

    expect(state.ui.repositories).toContain('repo1')
    expect(state.ui.repositories).toContain('repo2')

    // Updated list with only repo2
    ws.onmessage?.({
      data: JSON.stringify({
        type: 'repository-list',
        repositories: [
          {
            name: 'repo2',
            id: 2,
            gitUrl: 'git@example.com:user/repo2.git',
            url: 'https://example.com/repo2',
            hasTask: false,
          },
        ],
      }),
    })

    expect(state.ui.repositories).not.toContain('repo1')
    expect(state.ui.repositories).toContain('repo2')
    // system should always remain
    expect(state.ui.repositories).toContain('system')
  })

  test('handles repository-list messages with no repositories array as invalid', () => {
    const dependencies = createDependencies()
    const context = dependencies.context as ReturnType<
      typeof createContextEmulator
    >
    const state = createInitialState()

    const ws = createMockWebSocket()
    const bucketDependencies = createBucketDependencies({
      createWebSocket: () => ws,
    })

    connectWebSocket(
      'my-token',
      state,
      bucketDependencies,
      dependencies.context,
      dependencies.fileSystem,
      false
    )

    ws.onmessage?.({
      data: JSON.stringify({
        type: 'repository-list',
      }),
    })

    expect(context.stderrLines.join('\n')).toContain(
      'Invalid WebSocket message format'
    )
  })

  test('logs WebSocket errors to system buffer in TUI mode', () => {
    const dependencies = createDependencies()
    const state = createInitialState()

    const ws = createMockWebSocket()
    const bucketDependencies = createBucketDependencies({
      createWebSocket: () => ws,
    })

    connectWebSocket(
      'my-token',
      state,
      bucketDependencies,
      dependencies.context,
      dependencies.fileSystem,
      true
    )

    ws.onerror?.(new Error('Connection refused'))

    const systemBuffer = state.logBuffers.get('system')
    expect(systemBuffer).toBeDefined()
    const lines = getLogLines(systemBuffer as LogBuffer)
    const errorLines = lines.filter(l => l.stream === 'stderr')
    expect(errorLines.some(l => l.text.includes('Connection refused'))).toBe(
      true
    )
  })

  test('logs error for invalid JSON messages', () => {
    const dependencies = createDependencies()
    const context = dependencies.context as ReturnType<
      typeof createContextEmulator
    >
    const state = createInitialState()

    const ws = createMockWebSocket()
    const bucketDependencies = createBucketDependencies({
      createWebSocket: () => ws,
    })

    connectWebSocket(
      'my-token',
      state,
      bucketDependencies,
      dependencies.context,
      dependencies.fileSystem,
      false
    )

    ws.onmessage?.({ data: 'not valid json' })

    expect(context.stderrLines.join('\n')).toContain(
      'Failed to parse WebSocket message'
    )
  })

  test('routes tool-execution-result messages to callback', () => {
    const dependencies = createDependencies()
    const state = createInitialState()
    const ws = createMockWebSocket()
    const bucketDependencies = createBucketDependencies({
      createWebSocket: () => ws,
    })
    const captured: Array<
      import('../../bucket/tool-execution-protocol').ToolExecutionResultMessage
    > = []

    connectWebSocket(
      'my-token',
      state,
      bucketDependencies,
      dependencies.context,
      dependencies.fileSystem,
      false,
      undefined,
      message => {
        captured.push(message)
      }
    )

    ws.onmessage?.({
      data: JSON.stringify({
        type: 'tool-execution-result',
        requestId: 'req-1',
        result: {
          type: 'success',
          data: { url: 'https://example.com/result.png' },
        },
      }),
    })

    expect(captured).toEqual([
      {
        type: 'tool-execution-result',
        requestId: 'req-1',
        result: {
          type: 'success',
          data: { url: 'https://example.com/result.png' },
        },
      },
    ])
  })

  test('logs error when handleRepositoryList rejects', async () => {
    const dependencies = createDependencies()
    const context = dependencies.context as ReturnType<
      typeof createContextEmulator
    >
    const state = createInitialState()

    const ws = createMockWebSocket()
    const bucketDependencies = createBucketDependencies({
      createWebSocket: () => ws,
      spawn: asTestType<BucketDependencies['spawn']>(() => {
        throw new Error('spawn exploded')
      }),
    })

    connectWebSocket(
      'my-token',
      state,
      bucketDependencies,
      dependencies.context,
      dependencies.fileSystem,
      false
    )

    ws.onmessage?.({
      data: JSON.stringify({
        type: 'repository-list',
        repositories: [
          {
            name: 'repo1',
            id: 1,
            gitUrl: 'git@example.com:user/repo1.git',
            url: 'https://example.com/repo1',
            hasTask: false,
          },
        ],
      }),
    })

    // Wait for the async catch handler to fire
    await new Promise(resolve => setTimeout(resolve, 50))

    expect(context.stderrLines.join('\n')).toContain(
      'Failed to handle repository list'
    )
  })

  test('handles task-available message by calling wakeUp on matching repo', () => {
    const dependencies = createDependencies()
    const state = createInitialState()

    const ws = createMockWebSocket()
    const bucketDependencies = createBucketDependencies({
      createWebSocket: () => ws,
    })

    connectWebSocket(
      'my-token',
      state,
      bucketDependencies,
      dependencies.context,
      dependencies.fileSystem,
      false
    )

    // Add a fake repository to state
    let wokenUp = false
    const repoState: RepositoryState = {
      repository: {
        name: 'owner/repo',
        gitUrl: 'url',
        url: 'https://example.com/owner/repo',
        id: 1,
      },
      path: '/tmp/owner/repo',
      loopPromise: null,
      stopRequested: false,
      logBuffer: createLogBuffer(),
      agentStatus: 'idle',
      wakeUp: () => {
        wokenUp = true
      },
    }
    state.repositories.set('owner/repo', repoState)

    ws.onmessage?.({
      data: JSON.stringify({
        type: 'task-available',
        repository: 'owner/repo',
      }),
    })

    expect(wokenUp).toBe(true)
  })

  test('task-available restarts repository loop when it is not running', async () => {
    const dependencies = createDependencies()
    const context = dependencies.context as ReturnType<
      typeof createContextEmulator
    >
    const state = createInitialState()

    const ws = createMockWebSocket()
    const bucketDependencies = createBucketDependencies({
      createWebSocket: () => ws,
      spawn: asTestType<BucketDependencies['spawn']>(() => {
        const proc = new EventEmitter() as EventEmitter & {
          stdout: EventEmitter | null
          stderr: EventEmitter | null
        }
        proc.stdout = new EventEmitter()
        proc.stderr = new EventEmitter()
        process.nextTick(() => proc.emit('close', 0))
        return proc
      }),
      sleep: () => new Promise(() => {}),
    })

    connectWebSocket(
      'my-token',
      state,
      bucketDependencies,
      dependencies.context,
      dependencies.fileSystem,
      false
    )

    const repoState: RepositoryState = {
      repository: {
        name: 'owner/repo',
        gitUrl: 'url',
        url: 'https://example.com/owner/repo',
        id: 1,
      },
      path: '/tmp/owner/repo',
      loopPromise: null,
      stopRequested: false,
      logBuffer: createLogBuffer(),
      agentStatus: 'idle',
    }
    state.repositories.set('owner/repo', repoState)

    ws.onmessage?.({
      data: JSON.stringify({
        type: 'task-available',
        repository: 'owner/repo',
      }),
    })

    await new Promise(resolve => setTimeout(resolve, 30))

    expect(repoState.loopPromise).not.toBeNull()
    expect(context.stdoutLines.join('\n')).toContain(
      'Repository loop not running for owner/repo; restarting'
    )
  })

  test('task-available for unknown repo does not throw', () => {
    const dependencies = createDependencies()
    const state = createInitialState()

    const ws = createMockWebSocket()
    const bucketDependencies = createBucketDependencies({
      createWebSocket: () => ws,
    })

    connectWebSocket(
      'my-token',
      state,
      bucketDependencies,
      dependencies.context,
      dependencies.fileSystem,
      false
    )

    // Should not throw
    ws.onmessage?.({
      data: JSON.stringify({
        type: 'task-available',
        repository: 'unknown/repo',
      }),
    })
  })

  test('hasTask in repository-list wakes repos after clone', async () => {
    const dependencies = createDependencies()
    const state = createInitialState()

    const ws = createMockWebSocket()
    const bucketDependencies = createBucketDependencies({
      createWebSocket: () => ws,
    })

    connectWebSocket(
      'my-token',
      state,
      bucketDependencies,
      dependencies.context,
      dependencies.fileSystem,
      false
    )

    // Pre-populate a repository in state (simulating it already being cloned)
    let wokenUp = false
    const repoState: RepositoryState = {
      repository: {
        name: 'owner/repo',
        gitUrl: 'url',
        url: 'https://example.com/owner/repo',
        id: 1,
      },
      path: '/tmp/owner/repo',
      loopPromise: null,
      stopRequested: false,
      logBuffer: createLogBuffer(),
      agentStatus: 'idle',
      wakeUp: () => {
        wokenUp = true
      },
    }
    state.repositories.set('owner/repo', repoState)

    ws.onmessage?.({
      data: JSON.stringify({
        type: 'repository-list',
        repositories: [
          {
            name: 'owner/repo',
            id: 1,
            gitUrl: 'https://github.com/owner/repo.git',
            url: 'https://example.com/owner/repo',
            hasTask: true,
          },
        ],
      }),
    })

    // Wait for the async handleRepositoryList to complete
    await new Promise(resolve => setTimeout(resolve, 50))

    expect(wokenUp).toBe(true)
  })
})

describe('shutdown', () => {
  test('clears reconnect timer', async () => {
    const dependencies = createDependencies()
    const state = createInitialState()
    state.reconnectTimer = setTimeout(() => {}, 10000)

    const bucketDependencies = createBucketDependencies()

    await shutdown(state, bucketDependencies, dependencies.context)

    expect(state.reconnectTimer).toBeNull()
    expect(state.shuttingDown).toBe(true)
  })

  test('closes WebSocket if open', async () => {
    const dependencies = createDependencies()
    const state = createInitialState()
    let wsClosed = false

    const ws = createMockWebSocket()
    ws.readyState = WS_OPEN
    ws.close = () => {
      wsClosed = true
    }
    state.ws = ws

    const bucketDependencies = createBucketDependencies()

    await shutdown(state, bucketDependencies, dependencies.context)

    expect(wsClosed).toBe(true)
    expect(state.ws).toBeNull()
  })

  test('stops all repository loops and cleans up', async () => {
    const dependencies = createDependencies()
    const state = createInitialState()

    const repoState: RepositoryState = {
      repository: {
        name: 'repo',
        gitUrl: 'repo',
        url: 'https://example.com/repo',
        id: 1,
      },
      path: '/tmp/dust-bucket-repo',
      loopPromise: Promise.resolve(),
      stopRequested: false,
      logBuffer: createLogBuffer(),
      agentStatus: 'idle',
    }
    state.repositories.set('repo', repoState)

    const rmProcesses: EventEmitter[] = []
    const bucketDependencies = createBucketDependencies({
      spawn: asTestType<BucketDependencies['spawn']>(
        (_command: string, _spawnArguments: string[]) => {
          const proc = new EventEmitter() as EventEmitter & {
            stdout: EventEmitter | null
            stderr: EventEmitter | null
          }
          proc.stdout = new EventEmitter()
          proc.stderr = new EventEmitter()
          rmProcesses.push(proc)
          // Auto-resolve rm -rf
          setTimeout(() => proc.emit('close', 0), 0)
          return proc
        }
      ),
    })

    await shutdown(state, bucketDependencies, dependencies.context)

    expect(repoState.stopRequested).toBe(true)
    expect(state.repositories.size).toBe(0)
  })

  test('is idempotent', async () => {
    const dependencies = createDependencies()
    const context = dependencies.context as ReturnType<
      typeof createContextEmulator
    >
    const state = createInitialState()

    const bucketDependencies = createBucketDependencies()

    await shutdown(state, bucketDependencies, dependencies.context)
    const outputAfterFirst = context.stdoutLines.length

    await shutdown(state, bucketDependencies, dependencies.context)
    const outputAfterSecond = context.stdoutLines.length

    expect(outputAfterSecond).toBe(outputAfterFirst)
  })
})

describe('bucketWorker', () => {
  beforeEach(() => {
    stubEnv('DUST_UNATTENDED', undefined)
  })

  afterEach(() => {
    restoreEnv()
  })

  test('refuses to run when DUST_UNATTENDED is set', async () => {
    stubEnv('DUST_UNATTENDED', '1')
    const dependencies = createDependencies()
    const context = dependencies.context as ReturnType<
      typeof createContextEmulator
    >

    const result = await bucketWorker(dependencies)

    expect(result.exitCode).toBe(1)
    expect(context.stderrLines.join('')).toContain(
      'cannot run inside an unattended session'
    )
  })

  test('uses stored credential when available', async () => {
    const dependencies = createDependencies()
    let capturedToken: string | undefined

    const authFs = createFileSystemEmulator({
      home: { '.dust': { 'credentials.json': '{"token":"stored-tok"}' } },
    })

    const bucketDependencies = createBucketDependencies({
      auth: createMockAuthDeps({ fileSystem: authFs }),
      createWebSocket: (_url, token) => {
        capturedToken = token
        return createAutoConnectWebSocket()
      },
      setupKeypress: onKey => {
        setTimeout(() => onKey('q'), 10)
        return () => {}
      },
    })

    await bucketWorker(dependencies, bucketDependencies)

    expect(capturedToken).toBe('stored-tok')
  })

  test('runs browser auth when no token and no stored credential', async () => {
    const dependencies = createDependencies()
    const context = dependencies.context as ReturnType<
      typeof createContextEmulator
    >
    let capturedToken: string | undefined

    const bucketDependencies = createBucketDependencies({
      auth: createMockAuthDeps({
        createServer: handler => {
          setTimeout(() => {
            handler(
              new Request('http://localhost:9999/callback?code=test-code')
            )
          }, 0)
          return { port: 9999, stop: () => {} }
        },
      }),
      createWebSocket: (_url, token) => {
        capturedToken = token
        return createAutoConnectWebSocket()
      },
      setupKeypress: onKey => {
        setTimeout(() => onKey('q'), 10)
        return () => {}
      },
    })

    await bucketWorker(dependencies, bucketDependencies)

    expect(capturedToken).toBe('browser-tok')
    expect(context.stdoutLines.join('\n')).toContain('Opening browser')
    expect(context.stdoutLines.join('\n')).toContain(
      'Authenticated successfully'
    )
  })

  test('stores token after browser auth', async () => {
    const dependencies = createDependencies()
    const authFs = createFileSystemEmulator()

    const bucketDependencies = createBucketDependencies({
      auth: createMockAuthDeps({
        fileSystem: authFs,
        createServer: handler => {
          setTimeout(() => {
            handler(
              new Request('http://localhost:9999/callback?code=test-code')
            )
          }, 0)
          return { port: 9999, stop: () => {} }
        },
      }),
      setupKeypress: onKey => {
        setTimeout(() => onKey('q'), 10)
        return () => {}
      },
    })

    await bucketWorker(dependencies, bucketDependencies)

    expect(authFs.writtenFiles.get('/home/.dust/credentials.json')).toBe(
      '{"token":"browser-tok"}'
    )
  })

  test('returns error when browser auth fails', async () => {
    const dependencies = createDependencies()
    const context = dependencies.context as ReturnType<
      typeof createContextEmulator
    >

    const bucketDependencies = createBucketDependencies({
      auth: createMockAuthDeps({
        createServer: () => {
          throw new Error('Cannot start server')
        },
      }),
    })

    const result = await bucketWorker(dependencies, bucketDependencies)

    expect(result.exitCode).toBe(1)
    expect(context.stderrLines.join('\n')).toContain('Authentication failed')
  })

  test('uses DUST_BUCKET_TOKEN environment variable when set', async () => {
    const dependencies = createDependencies()
    let capturedToken: string | undefined

    stubEnv('DUST_BUCKET_TOKEN', 'env-var-token')

    const bucketDependencies = createBucketDependencies({
      createWebSocket: (_url, token) => {
        capturedToken = token
        return createAutoConnectWebSocket()
      },
      setupKeypress: onKey => {
        setTimeout(() => onKey('q'), 10)
        return () => {}
      },
    })

    await bucketWorker(dependencies, bucketDependencies)

    expect(capturedToken).toBe('env-var-token')
  })

  test('DUST_BUCKET_TOKEN takes precedence over stored credential', async () => {
    const dependencies = createDependencies()
    let capturedToken: string | undefined

    stubEnv('DUST_BUCKET_TOKEN', 'env-var-token')

    const authFs = createFileSystemEmulator({
      home: { '.dust': { 'credentials.json': '{"token":"stored-tok"}' } },
    })

    const bucketDependencies = createBucketDependencies({
      auth: createMockAuthDeps({ fileSystem: authFs }),
      createWebSocket: (_url, token) => {
        capturedToken = token
        return createAutoConnectWebSocket()
      },
      setupKeypress: onKey => {
        setTimeout(() => onKey('q'), 10)
        return () => {}
      },
    })

    await bucketWorker(dependencies, bucketDependencies)

    expect(capturedToken).toBe('env-var-token')
  })

  test('empty DUST_BUCKET_TOKEN falls through to stored credential', async () => {
    const dependencies = createDependencies()
    let capturedToken: string | undefined

    stubEnv('DUST_BUCKET_TOKEN', '')

    const authFs = createFileSystemEmulator({
      home: { '.dust': { 'credentials.json': '{"token":"stored-tok"}' } },
    })

    const bucketDependencies = createBucketDependencies({
      auth: createMockAuthDeps({ fileSystem: authFs }),
      createWebSocket: (_url, token) => {
        capturedToken = token
        return createAutoConnectWebSocket()
      },
      setupKeypress: onKey => {
        setTimeout(() => onKey('q'), 10)
        return () => {}
      },
    })

    await bucketWorker(dependencies, bucketDependencies)

    expect(capturedToken).toBe('stored-tok')
  })

  test('exits with error when initial connection fails', async () => {
    const dependencies = createDependencies()
    const context = dependencies.context as ReturnType<
      typeof createContextEmulator
    >
    stubEnv('DUST_BUCKET_TOKEN', 'token')

    const ws = createMockWebSocket()
    const bucketDependencies = createBucketDependencies({
      createWebSocket: () => {
        setTimeout(() => ws.onerror?.(new Error('Connection refused')), 0)
        return ws
      },
    })

    const result = await bucketWorker(dependencies, bucketDependencies)

    expect(result.exitCode).toBe(1)
    expect(context.stderrLines.join('\n')).toContain('Failed to connect')
    expect(context.stderrLines.join('\n')).toContain('Connection refused')
  })

  test('clears stored credential on 401-like close code', async () => {
    const dependencies = createDependencies()
    const context = dependencies.context as ReturnType<
      typeof createContextEmulator
    >
    const authFs = createFileSystemEmulator({
      home: { '.dust': { 'credentials.json': '{"token":"bad-tok"}' } },
    })

    const ws = createMockWebSocket()
    const bucketDependencies = createBucketDependencies({
      auth: createMockAuthDeps({ fileSystem: authFs }),
      createWebSocket: () => {
        setTimeout(() => ws.onclose?.({ code: 1008, reason: '' }), 0)
        return ws
      },
    })

    const result = await bucketWorker(dependencies, bucketDependencies)

    expect(result.exitCode).toBe(1)
    expect(context.stderrLines.join('\n')).toContain('Token rejected')
    expect(authFs.writtenFiles.get('/home/.dust/credentials.json')).toBe('{}')
  })

  test('exits on q keypress', async () => {
    const dependencies = createDependencies()
    const context = dependencies.context as ReturnType<
      typeof createContextEmulator
    >
    stubEnv('DUST_BUCKET_TOKEN', 'token')

    const bucketDependencies = createBucketDependencies({
      setupKeypress: onKey => {
        setTimeout(() => onKey('q'), 10)
        return () => {}
      },
    })

    const result = await bucketWorker(dependencies, bucketDependencies)

    expect(result.exitCode).toBe(0)
    expect(context.stdoutLines.join('\n')).toContain('Shutting down')
    expect(context.stdoutLines.join('\n')).toContain('Goodbye')
  })

  test('exits on Ctrl+C keypress', async () => {
    const dependencies = createDependencies()
    stubEnv('DUST_BUCKET_TOKEN', 'token')

    const bucketDependencies = createBucketDependencies({
      setupKeypress: onKey => {
        setTimeout(() => onKey('\u0003'), 10)
        return () => {}
      },
    })

    const result = await bucketWorker(dependencies, bucketDependencies)

    expect(result.exitCode).toBe(0)
  })

  test('exits on SIGINT/SIGTERM', async () => {
    const dependencies = createDependencies()
    stubEnv('DUST_BUCKET_TOKEN', 'token')

    const bucketDependencies = createBucketDependencies({
      setupSignals: onSignal => {
        setTimeout(() => onSignal(), 10)
        return () => {}
      },
    })

    const result = await bucketWorker(dependencies, bucketDependencies)

    expect(result.exitCode).toBe(0)
  })

  test('ignores non-quit keypresses', async () => {
    const dependencies = createDependencies()
    const context = dependencies.context as ReturnType<
      typeof createContextEmulator
    >
    stubEnv('DUST_BUCKET_TOKEN', 'token')
    let keyCallCount = 0

    const bucketDependencies = createBucketDependencies({
      setupKeypress: onKey => {
        setTimeout(() => {
          keyCallCount++
          onKey('x')
        }, 5)
        setTimeout(() => {
          keyCallCount++
          onKey('q')
        }, 10)
        return () => {}
      },
    })

    const result = await bucketWorker(dependencies, bucketDependencies)

    expect(result.exitCode).toBe(0)
    expect(keyCallCount).toBe(2)
    expect(
      context.stdoutLines.filter(line => line.includes('Shutting down')).length
    ).toBe(1)
  })

  test('cleans up keypress and signal handlers on exit', async () => {
    const dependencies = createDependencies()
    stubEnv('DUST_BUCKET_TOKEN', 'token')
    let keypressCleanedUp = false
    let signalsCleanedUp = false

    const bucketDependencies = createBucketDependencies({
      setupKeypress: onKey => {
        setTimeout(() => onKey('q'), 10)
        return () => {
          keypressCleanedUp = true
        }
      },
      setupSignals: () => {
        return () => {
          signalsCleanedUp = true
        }
      },
    })

    await bucketWorker(dependencies, bucketDependencies)

    expect(keypressCleanedUp).toBe(true)
    expect(signalsCleanedUp).toBe(true)
  })

  test('uses setupTUI in TUI mode and cleans up on exit', async () => {
    const dependencies = createDependencies()
    stubEnv('DUST_BUCKET_TOKEN', 'token')
    const written: string[] = []

    const bucketDependencies = createBucketDependencies({
      isTTY: true,
      writeStdout: (data: string) => written.push(data),
      getTerminalSize: () => ({ width: 100, height: 30 }),
      setupResize: () => () => {},
      setupKeypress: onKey => {
        setTimeout(() => onKey('q'), 10)
        return () => {}
      },
    })

    const result = await bucketWorker(dependencies, bucketDependencies)

    expect(result.exitCode).toBe(0)
    // Verify alternate screen was entered and exited
    expect(written.some(s => s.includes('\x1b[?1049h'))).toBe(true)
    expect(written.some(s => s.includes('\x1b[?1049l'))).toBe(true)
  })

  test('does not set DUST_PROXY_PORT globally (per-iteration proxies handle it)', async () => {
    const dependencies = createDependencies()
    stubEnv('DUST_BUCKET_TOKEN', 'token')
    stubEnv('DUST_PROXY_PORT', '9999')
    let proxyPortDuringRun: string | undefined

    const bucketDependencies = createBucketDependencies({
      setupKeypress: onKey => {
        setTimeout(() => {
          proxyPortDuringRun = process.env.DUST_PROXY_PORT
          onKey('q')
        }, 10)
        return () => {}
      },
    })

    const result = await bucketWorker(dependencies, bucketDependencies)

    expect(result.exitCode).toBe(0)
    // DUST_PROXY_PORT should remain unchanged — per-iteration proxies
    // pass the port via subprocess env, not process.env
    expect(proxyPortDuringRun).toBe('9999')
    expect(process.env.DUST_PROXY_PORT).toBe('9999')
  })

  test('falls back to raw URL when wsUrl is not parseable', async () => {
    const dependencies = createDependencies()
    stubEnv('DUST_BUCKET_TOKEN', 'token')
    stubEnv('DUST_BUCKET_AGENT_CONNECT_URL', 'not-a-valid-url')

    const bucketDependencies = createBucketDependencies({
      setupKeypress: onKey => {
        setTimeout(() => onKey('q'), 10)
        return () => {}
      },
    })

    const result = await bucketWorker(dependencies, bucketDependencies)

    expect(result.exitCode).toBe(0)
  })
})

describe('setupTUI', () => {
  test('enters alternate screen and writes initial frame', () => {
    const state = createInitialState()
    const written: string[] = []

    const bucketDependencies = createBucketDependencies({
      getTerminalSize: () => ({ width: 120, height: 40 }),
      writeStdout: (data: string) => written.push(data),
      setupResize: () => () => {},
    })

    const handle = setupTUI(state, bucketDependencies)

    expect(state.ui.width).toBe(120)
    expect(state.ui.height).toBe(40)
    expect(written.some(s => s.includes('\x1b[?1049h'))).toBe(true)

    handle.cleanup()
  })

  test('cleanup exits alternate screen and clears render interval', async () => {
    const state = createInitialState()
    const written: string[] = []
    let resizeCleanedUp = false

    const bucketDependencies = createBucketDependencies({
      writeStdout: (data: string) => written.push(data),
      setupResize: () => () => {
        resizeCleanedUp = true
      },
    })

    const handle = setupTUI(state, bucketDependencies)

    // Wait for at least one render tick
    await new Promise(resolve => setTimeout(resolve, 150))

    const framesBefore = written.filter(s => s.includes('dust bucket')).length
    expect(framesBefore).toBeGreaterThan(0)

    handle.cleanup()

    expect(written.some(s => s.includes('\x1b[?1049l'))).toBe(true)
    expect(resizeCleanedUp).toBe(true)

    // Verify render loop stopped
    const framesAfter = written.filter(s => s.includes('dust bucket')).length
    await new Promise(resolve => setTimeout(resolve, 150))
    const framesLater = written.filter(s => s.includes('dust bucket')).length
    expect(framesLater).toBe(framesAfter)
  })

  test('render loop skips frames when shutting down', async () => {
    const state = createInitialState()
    state.shuttingDown = true
    const written: string[] = []

    const bucketDependencies = createBucketDependencies({
      writeStdout: (data: string) => written.push(data),
      setupResize: () => () => {},
    })

    const handle = setupTUI(state, bucketDependencies)

    await new Promise(resolve => setTimeout(resolve, 150))

    // Only the enterAlternateScreen write should be present, no renderFrame
    const frames = written.filter(s => s.includes('dust bucket'))
    expect(frames.length).toBe(0)

    handle.cleanup()
  })

  test('resize handler updates UI dimensions', () => {
    const state = createInitialState()
    let resizeCallback: ((w: number, h: number) => void) | undefined

    const bucketDependencies = createBucketDependencies({
      writeStdout: () => {},
      setupResize: onResize => {
        resizeCallback = onResize
        return () => {}
      },
    })

    const handle = setupTUI(state, bucketDependencies)

    expect(resizeCallback).toBeDefined()
    resizeCallback?.(200, 60)
    expect(state.ui.width).toBe(200)
    expect(state.ui.height).toBe(60)

    handle.cleanup()
  })
})

describe('createKeypressHandler', () => {
  test('TUI mode routes keys through handleKeyInput', () => {
    const state = createInitialState()
    let quitCalled = false

    const handler = createKeypressHandler(true, state, () => {
      quitCalled = true
    })

    handler('\x1b[C') // right arrow
    expect(state.ui.selectedIndex).toBe(0) // system is the only repo

    handler('q')
    expect(quitCalled).toBe(true)
  })

  test('non-TUI mode only responds to q and Ctrl+C', () => {
    const state = createInitialState()
    let quitCalled = false

    const handler = createKeypressHandler(false, state, () => {
      quitCalled = true
    })

    handler('x')
    expect(quitCalled).toBe(false)

    handler('\x1b[C') // right arrow
    expect(quitCalled).toBe(false)

    handler('q')
    expect(quitCalled).toBe(true)
  })

  test('non-TUI mode responds to Ctrl+C', () => {
    const state = createInitialState()
    let quitCalled = false

    const handler = createKeypressHandler(false, state, () => {
      quitCalled = true
    })

    handler('\u0003')
    expect(quitCalled).toBe(true)
  })
})

describe('syncUIWithRepoList', () => {
  test('adds new repos to UI tabs', () => {
    const state = createInitialState()

    syncUIWithRepoList(state, [
      {
        name: 'repo1',
        id: 1,
        gitUrl: 'https://github.com/user/repo1.git',
        url: 'https://example.com/repo1',
        hasTask: false,
      },
      {
        name: 'repo2',
        id: 2,
        gitUrl: 'https://github.com/user/repo2.git',
        url: 'https://example.com/repo2',
        hasTask: false,
      },
    ])

    expect(state.ui.repositories).toContain('repo1')
    expect(state.ui.repositories).toContain('repo2')
    expect(state.logBuffers.has('repo1')).toBe(true)
    expect(state.logBuffers.has('repo2')).toBe(true)
  })

  test('removes repos no longer in the list', () => {
    const state = createInitialState()

    syncUIWithRepoList(state, [
      {
        name: 'repo1',
        id: 1,
        gitUrl: 'url1',
        url: 'https://example.com/repo1',
        hasTask: false,
      },
      {
        name: 'repo2',
        id: 2,
        gitUrl: 'url2',
        url: 'https://example.com/repo2',
        hasTask: false,
      },
    ])
    syncUIWithRepoList(state, [
      {
        name: 'repo2',
        id: 2,
        gitUrl: 'url2',
        url: 'https://example.com/repo2',
        hasTask: false,
      },
    ])

    expect(state.ui.repositories).not.toContain('repo1')
    expect(state.ui.repositories).toContain('repo2')
    expect(state.ui.repositories).toContain('system')
  })

  test('handles repository with all fields', () => {
    const state = createInitialState()

    syncUIWithRepoList(state, [
      {
        name: 'full-repo',
        gitUrl: 'git@github.com:user/repo.git',
        url: 'https://github.com/user/repo',
        id: 123,
        hasTask: true,
      },
    ])

    expect(state.ui.repositories).toContain('full-repo')
    expect(state.ui.repositoryUrls.get('full-repo')).toBe(
      'https://github.com/user/repo'
    )
    expect(state.ui.repositories.length).toBe(2) // full-repo + system
  })

  test('reuses existing log buffers when buffer is pre-populated', () => {
    const state = createInitialState()
    const existingBuffer = createLogBuffer()
    state.logBuffers.set('repo1', existingBuffer)

    syncUIWithRepoList(state, [
      {
        name: 'repo1',
        id: 1,
        gitUrl: 'url1',
        url: 'https://example.com/repo1',
        hasTask: false,
      },
    ])

    expect(state.logBuffers.get('repo1')).toBe(existingBuffer)
    expect(state.ui.repositories).toContain('repo1')
  })

  test('updates URL when repo already exists but URL changed', () => {
    const state = createInitialState()

    syncUIWithRepoList(state, [
      {
        name: 'repo1',
        id: 1,
        gitUrl: 'url1',
        url: 'https://example.com/repo1',
        hasTask: false,
      },
    ])
    expect(state.ui.repositoryUrls.get('repo1')).toBe(
      'https://example.com/repo1'
    )

    // Second call with different URL should update it
    syncUIWithRepoList(state, [
      {
        name: 'repo1',
        id: 1,
        gitUrl: 'url1',
        url: 'https://github.com/user/repo1',
        hasTask: false,
      },
    ])
    expect(state.ui.repositoryUrls.get('repo1')).toBe(
      'https://github.com/user/repo1'
    )
  })
})

describe('syncAgentStatuses', () => {
  test('copies agent statuses from RepositoryState to UI', () => {
    const state = createInitialState()
    state.repositories.set('repo1', {
      repository: {
        name: 'repo1',
        gitUrl: 'url1',
        url: 'https://example.com/repo1',
        id: 1,
      },
      path: '/tmp/repo1',
      loopPromise: null,
      stopRequested: false,
      logBuffer: createLogBuffer(),
      agentStatus: 'busy',
    })
    state.repositories.set('repo2', {
      repository: {
        name: 'repo2',
        gitUrl: 'url2',
        url: 'https://example.com/repo2',
        id: 2,
      },
      path: '/tmp/repo2',
      loopPromise: null,
      stopRequested: false,
      logBuffer: createLogBuffer(),
      agentStatus: 'idle',
    })

    syncAgentStatuses(state)

    expect(state.ui.agentStatuses.get('repo1')).toBe('busy')
    expect(state.ui.agentStatuses.get('repo2')).toBe('idle')
  })

  test('updates existing status when agent status changes', () => {
    const state = createInitialState()
    const repoState: RepositoryState = {
      repository: {
        name: 'repo1',
        gitUrl: 'url1',
        url: 'https://example.com/repo1',
        id: 1,
      },
      path: '/tmp/repo1',
      loopPromise: null,
      stopRequested: false,
      logBuffer: createLogBuffer(),
      agentStatus: 'idle',
    }
    state.repositories.set('repo1', repoState)
    state.ui.agentStatuses.set('repo1', 'idle')

    // Simulate agent becoming busy
    repoState.agentStatus = 'busy'
    syncAgentStatuses(state)

    expect(state.ui.agentStatuses.get('repo1')).toBe('busy')
  })
})

describe('syncTUI', () => {
  test('syncs buffer references from RepositoryState to UI', () => {
    const state = createInitialState()
    const repoBuffer = createLogBuffer()
    state.repositories.set('repo1', {
      repository: {
        name: 'repo1',
        gitUrl: 'url1',
        url: 'https://example.com/repo1',
        id: 1,
      },
      path: '/tmp/repo1',
      loopPromise: null,
      stopRequested: false,
      logBuffer: repoBuffer,
      agentStatus: 'idle',
    })

    syncTUI(state)

    expect(state.ui.repositories).toContain('repo1')
    expect(state.logBuffers.get('repo1')).toBe(repoBuffer)
  })

  test('syncs agent statuses from RepositoryState to UI', () => {
    const state = createInitialState()
    state.repositories.set('repo1', {
      repository: {
        name: 'repo1',
        gitUrl: 'url1',
        url: 'https://example.com/repo1',
        id: 1,
      },
      path: '/tmp/repo1',
      loopPromise: null,
      stopRequested: false,
      logBuffer: createLogBuffer(),
      agentStatus: 'busy',
    })

    syncTUI(state)

    expect(state.ui.agentStatuses.get('repo1')).toBe('busy')
  })

  test('removes UI repos that are no longer tracked', () => {
    const state = createInitialState()

    // Add a repo to UI directly (simulating eager add)
    syncUIWithRepoList(state, [
      {
        name: 'stale-repo',
        id: 1,
        gitUrl: 'url',
        url: 'https://example.com/stale-repo',
        hasTask: false,
      },
    ])
    expect(state.ui.repositories).toContain('stale-repo')

    // syncTUI should remove it since it's not in state.repositories
    syncTUI(state)

    expect(state.ui.repositories).not.toContain('stale-repo')
    expect(state.logBuffers.has('stale-repo')).toBe(false)
  })

  test('preserves system tab', () => {
    const state = createInitialState()

    syncTUI(state)

    expect(state.ui.repositories).toContain('system')
  })
})

describe('handleRepositoryListSuccess', () => {
  test('calls syncTUI', () => {
    const state = createInitialState()
    const dependencies = createDependencies()
    const repos = [
      {
        name: 'repo1',
        id: 1,
        gitUrl: 'git@example.com:user/repo1.git',
        url: 'https://example.com/repo1',
        hasTask: false,
      },
    ]
    const repoState: RepositoryState = {
      repository: repos[0],
      path: '/tmp/repo1',
      loopPromise: null,
      stopRequested: false,
      logBuffer: createLogBuffer(),
      agentStatus: 'idle',
    }
    state.repositories.set('repo1', repoState)

    const repoDeps = {
      spawn: asTestType<BucketDependencies['spawn']>(() => {}),
      run: async () => {},
      fileSystem: dependencies.fileSystem,
      sleep: async () => {},
      getReposDir: () => '/tmp',
    }

    handleRepositoryListSuccess(
      state,
      repos,
      repoDeps,
      dependencies.context,
      false
    )

    expect(state.ui.repositories).toContain('repo1')
    expect(state.logBuffers.get('repo1')).toBe(repoState.logBuffer)
  })

  test('wakes repos that have tasks waiting', () => {
    const state = createInitialState()
    const dependencies = createDependencies()
    let wokenUp = false
    const repos = [
      {
        name: 'repo1',
        id: 1,
        gitUrl: 'git@example.com:user/repo1.git',
        url: 'https://example.com/repo1',
        hasTask: true,
      },
    ]
    const repoState: RepositoryState = {
      repository: repos[0],
      path: '/tmp/repo1',
      loopPromise: null,
      stopRequested: false,
      logBuffer: createLogBuffer(),
      agentStatus: 'idle',
      wakeUp: () => {
        wokenUp = true
      },
    }
    state.repositories.set('repo1', repoState)

    const repoDeps = {
      spawn: asTestType<BucketDependencies['spawn']>(() => {}),
      run: async () => {},
      fileSystem: dependencies.fileSystem,
      sleep: async () => {},
      getReposDir: () => '/tmp',
    }

    handleRepositoryListSuccess(
      state,
      repos,
      repoDeps,
      dependencies.context,
      false
    )

    expect(wokenUp).toBe(true)
  })

  test('does not wake repos without tasks', () => {
    const state = createInitialState()
    const dependencies = createDependencies()
    let wokenUp = false
    const repos = [
      {
        name: 'repo1',
        id: 1,
        gitUrl: 'git@example.com:user/repo1.git',
        url: 'https://example.com/repo1',
        hasTask: false,
      },
    ]
    const repoState: RepositoryState = {
      repository: repos[0],
      path: '/tmp/repo1',
      loopPromise: null,
      stopRequested: false,
      logBuffer: createLogBuffer(),
      agentStatus: 'idle',
      wakeUp: () => {
        wokenUp = true
      },
    }
    state.repositories.set('repo1', repoState)

    const repoDeps = {
      spawn: asTestType<BucketDependencies['spawn']>(() => {}),
      run: async () => {},
      fileSystem: dependencies.fileSystem,
      sleep: async () => {},
      getReposDir: () => '/tmp',
    }

    handleRepositoryListSuccess(
      state,
      repos,
      repoDeps,
      dependencies.context,
      false
    )

    expect(wokenUp).toBe(false)
  })
})

describe('handleRepositoryListError', () => {
  test('logs error message to stderr', () => {
    const state = createInitialState()
    const dependencies = createDependencies()
    const context = dependencies.context as ReturnType<
      typeof createContextEmulator
    >

    handleRepositoryListError(
      state,
      dependencies.context,
      false,
      new Error('Clone failed')
    )

    expect(context.stderrLines.join('\n')).toContain(
      'Failed to handle repository list: Clone failed'
    )
  })

  test('logs error to system buffer in TUI mode', () => {
    const state = createInitialState()
    const dependencies = createDependencies()

    handleRepositoryListError(
      state,
      dependencies.context,
      true,
      new Error('Clone failed')
    )

    const systemBuffer = state.logBuffers.get('system')
    expect(systemBuffer).toBeDefined()
    const lines = getLogLines(systemBuffer as LogBuffer)
    const errorLine = lines.find(l => l.stream === 'stderr')
    expect(errorLine?.text).toContain('Failed to handle repository list')
    expect(errorLine?.text).toContain('Clone failed')
  })
})
