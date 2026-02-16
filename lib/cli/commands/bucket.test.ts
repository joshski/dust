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
  createContextEmulator,
  createFileSystemEmulator,
  createTestAgentSessionStartedEvent,
  restoreEnv,
  stubEnv,
} from '../../test/test-utilities'
import type { CommandDependencies } from '../types'
import {
  type BucketDependencies,
  bucket,
  connectWebSocket,
  createDefaultBucketDependencies,
  createInitialState,
  createKeypressHandler,
  createTUIContext,
  getWebSocketUrl,
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
    spawn: (() => {
      const proc = new EventEmitter()
      return proc
    }) as unknown as BucketDependencies['spawn'],
    createWebSocket: () => createAutoConnectWebSocket(),
    setupKeypress: () => () => {},
    setupSignals: () => () => {},
    setupResize: () => () => {},
    getTerminalSize: () => ({ width: 80, height: 24 }),
    writeStdout: () => {},
    isTTY: false,
    sleep: () => Promise.resolve(),
    getTempDir: () => '/tmp',
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
    expect(typeof bucketDependencies.getTempDir).toBe('function')
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
    expect(context.stdoutLines.join('\n')).toContain('Connected to dustbucket')
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

    expect(context.stdoutLines.join('\n')).toContain('reason: none')

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

    expect(context.stdoutLines.join('\n')).toContain('Disconnected')
    expect(context.stdoutLines.join('\n')).toContain('Reconnecting in 1 second')
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
        repositories: ['repo1', 'repo2', 'repo3'],
      }),
    })

    expect(context.stdoutLines.join('\n')).toContain(
      'Received repository list (3 repositories)'
    )
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
        repositories: ['repo1', 'repo2'],
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
        repositories: ['repo1', 'repo2'],
      }),
    })

    expect(state.ui.repositories).toContain('repo1')
    expect(state.ui.repositories).toContain('repo2')

    // Updated list with only repo2
    ws.onmessage?.({
      data: JSON.stringify({
        type: 'repository-list',
        repositories: ['repo2'],
      }),
    })

    expect(state.ui.repositories).not.toContain('repo1')
    expect(state.ui.repositories).toContain('repo2')
    // system should always remain
    expect(state.ui.repositories).toContain('system')
  })

  test('handles repository-list messages with no repositories array', () => {
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

    expect(context.stdoutLines.join('\n')).toContain(
      'Received repository list (0 repositories)'
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

  test('logs error when handleRepositoryList rejects', async () => {
    const dependencies = createDependencies()
    const context = dependencies.context as ReturnType<
      typeof createContextEmulator
    >
    const state = createInitialState()

    const ws = createMockWebSocket()
    const bucketDependencies = createBucketDependencies({
      createWebSocket: () => ws,
      spawn: (() => {
        throw new Error('spawn exploded')
      }) as unknown as BucketDependencies['spawn'],
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
        repositories: ['repo1'],
      }),
    })

    // Wait for the async catch handler to fire
    await new Promise(resolve => setTimeout(resolve, 50))

    expect(context.stderrLines.join('\n')).toContain(
      'Failed to handle repository list'
    )
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
      repository: { name: 'repo', gitUrl: 'repo' },
      path: '/tmp/dust-bucket-repo',
      loopPromise: Promise.resolve(),
      stopRequested: false,
      logBuffer: createLogBuffer(),
      agentStatus: 'idle',
    }
    state.repositories.set('repo', repoState)

    const rmProcesses: EventEmitter[] = []
    const bucketDependencies = createBucketDependencies({
      spawn: ((_command: string, _spawnArguments: string[]) => {
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
      }) as BucketDependencies['spawn'],
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

describe('bucket', () => {
  afterEach(() => {
    restoreEnv()
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

    await bucket(dependencies, bucketDependencies)

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

    await bucket(dependencies, bucketDependencies)

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

    await bucket(dependencies, bucketDependencies)

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

    const result = await bucket(dependencies, bucketDependencies)

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

    await bucket(dependencies, bucketDependencies)

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

    await bucket(dependencies, bucketDependencies)

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

    await bucket(dependencies, bucketDependencies)

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

    const result = await bucket(dependencies, bucketDependencies)

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

    const result = await bucket(dependencies, bucketDependencies)

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

    const result = await bucket(dependencies, bucketDependencies)

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

    const result = await bucket(dependencies, bucketDependencies)

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

    const result = await bucket(dependencies, bucketDependencies)

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

    const result = await bucket(dependencies, bucketDependencies)

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

    await bucket(dependencies, bucketDependencies)

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

    const result = await bucket(dependencies, bucketDependencies)

    expect(result.exitCode).toBe(0)
    // Verify alternate screen was entered and exited
    expect(written.some(s => s.includes('\x1b[?1049h'))).toBe(true)
    expect(written.some(s => s.includes('\x1b[?1049l'))).toBe(true)
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

    const result = await bucket(dependencies, bucketDependencies)

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
      { name: 'repo1', gitUrl: 'https://github.com/user/repo1.git' },
      { name: 'repo2', gitUrl: 'https://github.com/user/repo2.git' },
    ])

    expect(state.ui.repositories).toContain('repo1')
    expect(state.ui.repositories).toContain('repo2')
    expect(state.logBuffers.has('repo1')).toBe(true)
    expect(state.logBuffers.has('repo2')).toBe(true)
  })

  test('removes repos no longer in the list', () => {
    const state = createInitialState()

    syncUIWithRepoList(state, [
      { name: 'repo1', gitUrl: 'url1' },
      { name: 'repo2', gitUrl: 'url2' },
    ])
    syncUIWithRepoList(state, [{ name: 'repo2', gitUrl: 'url2' }])

    expect(state.ui.repositories).not.toContain('repo1')
    expect(state.ui.repositories).toContain('repo2')
    expect(state.ui.repositories).toContain('system')
  })

  test('skips invalid repository entries', () => {
    const state = createInitialState()

    syncUIWithRepoList(state, [
      null,
      undefined,
      123,
      { name: 'valid', gitUrl: 'url' },
    ])

    expect(state.ui.repositories).toContain('valid')
    expect(state.ui.repositories.length).toBe(2) // valid + system
  })

  test('reuses existing log buffers when buffer is pre-populated', () => {
    const state = createInitialState()
    const existingBuffer = createLogBuffer()
    state.logBuffers.set('repo1', existingBuffer)

    syncUIWithRepoList(state, [{ name: 'repo1', gitUrl: 'url1' }])

    expect(state.logBuffers.get('repo1')).toBe(existingBuffer)
    expect(state.ui.repositories).toContain('repo1')
  })
})

describe('syncAgentStatuses', () => {
  test('copies agent statuses from RepositoryState to UI', () => {
    const state = createInitialState()
    state.repositories.set('repo1', {
      repository: { name: 'repo1', gitUrl: 'url1' },
      path: '/tmp/repo1',
      loopPromise: null,
      stopRequested: false,
      logBuffer: createLogBuffer(),
      agentStatus: 'busy',
    })
    state.repositories.set('repo2', {
      repository: { name: 'repo2', gitUrl: 'url2' },
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
      repository: { name: 'repo1', gitUrl: 'url1' },
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
      repository: { name: 'repo1', gitUrl: 'url1' },
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
      repository: { name: 'repo1', gitUrl: 'url1' },
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
    syncUIWithRepoList(state, [{ name: 'stale-repo', gitUrl: 'url' }])
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
