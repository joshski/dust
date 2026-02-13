import type { ChildProcess } from 'node:child_process'
import { EventEmitter } from 'node:events'
import { describe, expect, test } from 'vitest'
import {
  createContextEmulator,
  createFileSystemEmulator,
} from '../../test/test-utilities'
import type { CommandDependencies } from '../types'
import {
  type BucketDependencies,
  bucket,
  connectWebSocket,
  createDefaultBucketDependencies,
  createInitialState,
  handleContainerOutput,
  handleRepositoryList,
  parseContainerOutput,
  shutdown,
  spawnContainer,
  type WebSocketLike,
  WS_CLOSED,
  WS_OPEN,
} from './bucket'

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

function createMockChildProcess(): ChildProcess & EventEmitter {
  const proc = new EventEmitter() as ChildProcess & EventEmitter
  proc.kill = () => true
  return proc
}

function createBucketDependencies(
  overrides: Partial<BucketDependencies> = {}
): BucketDependencies {
  return {
    spawn: (() => createMockChildProcess()) as BucketDependencies['spawn'],
    createWebSocket: () => createMockWebSocket(),
    setupKeypress: () => () => {},
    setupSignals: () => () => {},
    setupResize: () => () => {},
    getTerminalSize: () => ({ width: 80, height: 24 }),
    writeStdout: () => {},
    isTTY: false, // Default to non-TUI mode for existing tests
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
  })
})

describe('createInitialState', () => {
  test('returns initial state with null values and default reconnect delay', () => {
    const state = createInitialState()
    expect(state.ws).toBeNull()
    expect(state.containerProcess).toBeNull()
    expect(state.reconnectDelay).toBe(1000)
    expect(state.reconnectTimer).toBeNull()
    expect(state.shuttingDown).toBe(false)
    expect(state.ui).toBeDefined()
    expect(state.logBuffers).toBeInstanceOf(Map)
  })
})

describe('spawnContainer', () => {
  test('spawns container process with token in environment', () => {
    let capturedEnv: NodeJS.ProcessEnv | undefined
    let capturedArguments: string[] | undefined
    let capturedCommand: string | undefined

    const spawn = ((
      command: string,
      spawnArguments: string[],
      options: { env?: NodeJS.ProcessEnv }
    ) => {
      capturedCommand = command
      capturedArguments = spawnArguments
      capturedEnv = options.env
      return createMockChildProcess()
    }) as BucketDependencies['spawn']

    spawnContainer('test-token', '/project', 'dust', spawn, false)

    expect(capturedCommand).toBe('dust')
    expect(capturedArguments).toEqual(['bucket', 'container'])
    expect(capturedEnv?.DUST_API_TOKEN).toBe('test-token')
  })

  test('handles multi-word dust command', () => {
    let capturedCommand: string | undefined
    let capturedArguments: string[] | undefined

    const spawn = ((command: string, spawnArguments: string[]) => {
      capturedCommand = command
      capturedArguments = spawnArguments
      return createMockChildProcess()
    }) as BucketDependencies['spawn']

    spawnContainer('test-token', '/project', 'bun run dust', spawn, false)

    expect(capturedCommand).toBe('bun')
    expect(capturedArguments).toEqual(['run', 'dust', 'bucket', 'container'])
  })
})

describe('parseContainerOutput', () => {
  test('extracts repository from "Added repository" message', () => {
    const result = parseContainerOutput('📦 Added repository: my-repo')
    expect(result.repository).toBe('my-repo')
    expect(result.text).toBe('📦 Added repository: my-repo')
  })

  test('extracts repository from "Starting iteration for" message', () => {
    const result = parseContainerOutput('🚀 Starting iteration for test-repo')
    expect(result.repository).toBe('test-repo')
  })

  test('extracts repository from "Completed iteration for" message', () => {
    const result = parseContainerOutput('✅ Completed iteration for test-repo')
    expect(result.repository).toBe('test-repo')
  })

  test('extracts repository from bracket format', () => {
    const result = parseContainerOutput('[my-repo] some log message')
    expect(result.repository).toBe('my-repo')
    expect(result.text).toBe('some log message')
  })

  test('returns null repository for untagged messages', () => {
    const result = parseContainerOutput('Just a plain log line')
    expect(result.repository).toBeNull()
    expect(result.text).toBe('Just a plain log line')
  })
})

describe('handleContainerOutput', () => {
  test('creates log buffer for new repository', () => {
    const state = createInitialState()

    handleContainerOutput(state, '📦 Added repository: new-repo', 'stdout')

    expect(state.logBuffers.has('new-repo')).toBe(true)
    expect(state.ui.repositories).toContain('new-repo')
  })

  test('appends to existing log buffer', () => {
    const state = createInitialState()

    handleContainerOutput(state, '[repo1] first line', 'stdout')
    handleContainerOutput(state, '[repo1] second line', 'stdout')

    const buffer = state.logBuffers.get('repo1')
    expect(buffer?.lines.length).toBe(2)
  })

  test('uses system buffer for untagged output', () => {
    const state = createInitialState()

    handleContainerOutput(state, 'untagged message', 'stdout')

    expect(state.logBuffers.has('system')).toBe(true)
  })
})

describe('handleRepositoryList', () => {
  test('adds new repositories', () => {
    const state = createInitialState()

    handleRepositoryList(state, ['repo1', 'repo2'])

    expect(state.logBuffers.has('repo1')).toBe(true)
    expect(state.logBuffers.has('repo2')).toBe(true)
    expect(state.ui.repositories).toContain('repo1')
    expect(state.ui.repositories).toContain('repo2')
  })

  test('removes repositories not in list', () => {
    const state = createInitialState()
    handleRepositoryList(state, ['repo1', 'repo2'])

    handleRepositoryList(state, ['repo1'])

    expect(state.logBuffers.has('repo1')).toBe(true)
    expect(state.logBuffers.has('repo2')).toBe(false)
  })

  test('preserves system buffer', () => {
    const state = createInitialState()
    handleContainerOutput(state, 'system message', 'stdout')

    handleRepositoryList(state, ['repo1'])

    expect(state.logBuffers.has('system')).toBe(true)
  })
})

describe('connectWebSocket', () => {
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
      'dust',
      () => {},
      false
    )

    expect(capturedUrl).toBe('wss://dustbucket.com/ws')
    expect(capturedToken).toBe('my-token')
  })

  test('spawns container on WebSocket open', () => {
    const dependencies = createDependencies()
    const context = dependencies.context as ReturnType<
      typeof createContextEmulator
    >
    const state = createInitialState()
    let containerSpawned = false

    const ws = createMockWebSocket()
    const bucketDependencies = createBucketDependencies({
      createWebSocket: () => ws,
      spawn: (() => {
        containerSpawned = true
        return createMockChildProcess()
      }) as BucketDependencies['spawn'],
    })

    connectWebSocket(
      'my-token',
      state,
      bucketDependencies,
      dependencies.context,
      'dust',
      () => {},
      false
    )

    // Simulate WebSocket opening
    ws.readyState = WS_OPEN
    ws.onopen?.()

    expect(containerSpawned).toBe(true)
    expect(context.stdoutLines.join('\n')).toContain('Connected to dustbucket')
    expect(context.stdoutLines.join('\n')).toContain(
      'Spawning container process'
    )
  })

  test('resets reconnect delay on successful connection', () => {
    const dependencies = createDependencies()
    const state = createInitialState()
    state.reconnectDelay = 16000 // Simulating previous backoff

    const ws = createMockWebSocket()
    const bucketDependencies = createBucketDependencies({
      createWebSocket: () => ws,
    })

    connectWebSocket(
      'my-token',
      state,
      bucketDependencies,
      dependencies.context,
      'dust',
      () => {},
      false
    )

    ws.readyState = WS_OPEN
    ws.onopen?.()

    expect(state.reconnectDelay).toBe(1000)
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
      'dust',
      () => {},
      false
    )

    // Simulate WebSocket closing
    ws.onclose?.({ code: 1006, reason: 'Connection lost' })

    expect(context.stdoutLines.join('\n')).toContain('Disconnected')
    expect(context.stdoutLines.join('\n')).toContain('Reconnecting in 1 second')
    expect(state.reconnectTimer).not.toBeNull()
    expect(state.reconnectDelay).toBe(2000) // Doubled

    // Clean up timer
    if (state.reconnectTimer) clearTimeout(state.reconnectTimer)
  })

  test('reconnection callback attempts to reconnect', async () => {
    const dependencies = createDependencies()
    const context = dependencies.context as ReturnType<
      typeof createContextEmulator
    >
    const state = createInitialState()
    state.reconnectDelay = 1 // Use very short delay for testing

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
      'dust',
      () => {},
      false
    )

    expect(connectionAttempts).toBe(1)

    // Simulate WebSocket closing
    ws.onclose?.({ code: 1006, reason: 'Connection lost' })

    // Wait for the reconnection timer to fire
    await new Promise(resolve => setTimeout(resolve, 10))

    // Should have attempted a second connection
    expect(connectionAttempts).toBe(2)
    expect(
      context.stdoutLines.filter(line => line.includes('Connecting')).length
    ).toBe(2)

    // Clean up timer if any
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

    // Connect first (shuttingDown is false)
    connectWebSocket(
      'my-token',
      state,
      bucketDependencies,
      dependencies.context,
      'dust',
      () => {},
      false
    )

    // Then set shuttingDown before close event
    state.shuttingDown = true

    // Trigger close event
    ws.onclose?.({ code: 1000, reason: 'Normal closure' })

    // Should not have scheduled reconnection
    expect(state.reconnectTimer).toBeNull()
    // Should not have output reconnection message
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
      'dust',
      () => {},
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
      'dust',
      () => {},
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
      'dust',
      () => {},
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
      'dust',
      () => {},
      false
    )

    // Message with no repositories field
    ws.onmessage?.({
      data: JSON.stringify({
        type: 'repository-list',
      }),
    })

    expect(context.stdoutLines.join('\n')).toContain(
      'Received repository list (0 repositories)'
    )
  })

  test('does not spawn container if already exists', () => {
    const dependencies = createDependencies()
    const state = createInitialState()
    let spawnCount = 0

    const proc = createMockChildProcess()
    state.containerProcess = proc // Pre-set the container process

    const ws = createMockWebSocket()
    const bucketDependencies = createBucketDependencies({
      createWebSocket: () => ws,
      spawn: (() => {
        spawnCount++
        return createMockChildProcess()
      }) as BucketDependencies['spawn'],
    })

    connectWebSocket(
      'my-token',
      state,
      bucketDependencies,
      dependencies.context,
      'dust',
      () => {},
      false
    )

    // Open WebSocket
    ws.readyState = WS_OPEN
    ws.onopen?.()

    // Container should not have been spawned since it already exists
    expect(spawnCount).toBe(0)
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
      'dust',
      () => {},
      false
    )

    ws.onmessage?.({ data: 'not valid json' })

    expect(context.stderrLines.join('\n')).toContain(
      'Failed to parse WebSocket message'
    )
  })

  test('calls onShutdown when container exits unexpectedly', () => {
    const dependencies = createDependencies()
    const state = createInitialState()
    let shutdownCalled = false

    const proc = createMockChildProcess()
    const ws = createMockWebSocket()
    const bucketDependencies = createBucketDependencies({
      createWebSocket: () => ws,
      spawn: (() => proc) as BucketDependencies['spawn'],
    })

    connectWebSocket(
      'my-token',
      state,
      bucketDependencies,
      dependencies.context,
      'dust',
      () => {
        shutdownCalled = true
      },
      false
    )

    // Open WebSocket to spawn container
    ws.readyState = WS_OPEN
    ws.onopen?.()

    // Simulate container exit
    proc.emit('exit', 1, null)

    expect(shutdownCalled).toBe(true)
  })

  test('does not call onShutdown when container exits during shutdown', () => {
    const dependencies = createDependencies()
    const state = createInitialState()
    let shutdownCalled = false

    const proc = createMockChildProcess()
    const ws = createMockWebSocket()
    const bucketDependencies = createBucketDependencies({
      createWebSocket: () => ws,
      spawn: (() => proc) as BucketDependencies['spawn'],
    })

    connectWebSocket(
      'my-token',
      state,
      bucketDependencies,
      dependencies.context,
      'dust',
      () => {
        shutdownCalled = true
      },
      false
    )

    ws.readyState = WS_OPEN
    ws.onopen?.()

    // Mark as shutting down before container exits
    state.shuttingDown = true
    proc.emit('exit', 0, 'SIGTERM')

    expect(shutdownCalled).toBe(false)
  })
})

describe('shutdown', () => {
  test('clears reconnect timer', () => {
    const dependencies = createDependencies()
    const state = createInitialState()
    state.reconnectTimer = setTimeout(() => {}, 10000)

    shutdown(state, dependencies.context)

    // If timer was cleared, this should have no effect
    expect(state.reconnectTimer).toBeNull()
    expect(state.shuttingDown).toBe(true)
  })

  test('closes WebSocket if open', () => {
    const dependencies = createDependencies()
    const state = createInitialState()
    let wsClosed = false

    const ws = createMockWebSocket()
    ws.readyState = WS_OPEN
    ws.close = () => {
      wsClosed = true
    }
    state.ws = ws

    shutdown(state, dependencies.context)

    expect(wsClosed).toBe(true)
    expect(state.ws).toBeNull()
  })

  test('kills container process', () => {
    const dependencies = createDependencies()
    const state = createInitialState()
    let killSignal: NodeJS.Signals | number | undefined

    const proc = createMockChildProcess()
    proc.kill = (signal?: NodeJS.Signals | number) => {
      killSignal = signal
      return true
    }
    state.containerProcess = proc

    shutdown(state, dependencies.context)

    expect(killSignal).toBe('SIGTERM')
    expect(state.containerProcess).toBeNull()
  })

  test('is idempotent', () => {
    const dependencies = createDependencies()
    const context = dependencies.context as ReturnType<
      typeof createContextEmulator
    >
    const state = createInitialState()

    shutdown(state, dependencies.context)
    const outputAfterFirst = context.stdoutLines.length

    shutdown(state, dependencies.context)
    const outputAfterSecond = context.stdoutLines.length

    expect(outputAfterSecond).toBe(outputAfterFirst)
  })
})

describe('bucket', () => {
  test('returns error when token is missing', async () => {
    const dependencies = createDependencies()
    const context = dependencies.context as ReturnType<
      typeof createContextEmulator
    >

    const result = await bucket(dependencies, createBucketDependencies())

    expect(result.exitCode).toBe(1)
    expect(context.stderrLines.join('\n')).toContain('Missing required <token>')
  })

  test('connects to WebSocket with provided token', async () => {
    const dependencies = createDependencies()
    dependencies.arguments = ['my-secret-token']
    let capturedToken: string | undefined

    const ws = createMockWebSocket()
    const bucketDependencies = createBucketDependencies({
      createWebSocket: (_url, token) => {
        capturedToken = token
        // Immediately trigger shutdown after connection attempt
        setTimeout(() => {
          ws.onclose?.({ code: 1000, reason: '' })
        }, 0)
        return ws
      },
      setupKeypress: onKey => {
        // Trigger 'q' keypress to exit
        setTimeout(() => onKey('q'), 10)
        return () => {}
      },
    })

    await bucket(dependencies, bucketDependencies)

    expect(capturedToken).toBe('my-secret-token')
  })

  test('exits on q keypress', async () => {
    const dependencies = createDependencies()
    const context = dependencies.context as ReturnType<
      typeof createContextEmulator
    >
    dependencies.arguments = ['token']

    const ws = createMockWebSocket()
    const bucketDependencies = createBucketDependencies({
      createWebSocket: () => ws,
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
    dependencies.arguments = ['token']

    const ws = createMockWebSocket()
    const bucketDependencies = createBucketDependencies({
      createWebSocket: () => ws,
      setupKeypress: onKey => {
        setTimeout(() => onKey('\u0003'), 10) // Ctrl+C
        return () => {}
      },
    })

    const result = await bucket(dependencies, bucketDependencies)

    expect(result.exitCode).toBe(0)
  })

  test('exits on SIGINT/SIGTERM', async () => {
    const dependencies = createDependencies()
    dependencies.arguments = ['token']

    const ws = createMockWebSocket()
    const bucketDependencies = createBucketDependencies({
      createWebSocket: () => ws,
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
    dependencies.arguments = ['token']
    let keyCallCount = 0

    const ws = createMockWebSocket()
    const bucketDependencies = createBucketDependencies({
      createWebSocket: () => ws,
      setupKeypress: onKey => {
        // Send a non-quit key first, then 'q' to actually exit
        setTimeout(() => {
          keyCallCount++
          onKey('x') // Should be ignored
        }, 5)
        setTimeout(() => {
          keyCallCount++
          onKey('q') // Should trigger shutdown
        }, 10)
        return () => {}
      },
    })

    const result = await bucket(dependencies, bucketDependencies)

    expect(result.exitCode).toBe(0)
    expect(keyCallCount).toBe(2)
    // Only one shutdown should have occurred
    expect(
      context.stdoutLines.filter(line => line.includes('Shutting down')).length
    ).toBe(1)
  })

  test('cleans up keypress and signal handlers on exit', async () => {
    const dependencies = createDependencies()
    dependencies.arguments = ['token']
    let keypressCleanedUp = false
    let signalsCleanedUp = false

    const ws = createMockWebSocket()
    const bucketDependencies = createBucketDependencies({
      createWebSocket: () => ws,
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
})
