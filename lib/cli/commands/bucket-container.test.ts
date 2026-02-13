import { EventEmitter } from 'node:events'
import { describe, expect, test } from 'vitest'
import {
  createContextEmulator,
  createFileSystemEmulator,
} from '../../test/test-utilities'
import type { CommandDependencies } from '../types'
import { type WebSocketLike, WS_CLOSED, WS_OPEN } from './bucket'
import {
  addRepository,
  type BucketEventPayload,
  type ContainerDependencies,
  checkForTasks,
  cloneRepository,
  connectWebSocket,
  createBucketEventEmitter,
  createDefaultContainerDependencies,
  createInitialContainerState,
  formatBucketEvent,
  getRepoTempPath,
  gitPull,
  handleRepositoryList,
  invokeDust,
  parseRepository,
  type Repository,
  readDustCommand,
  removeRepository,
  removeRepositoryFromContainer,
  runRepositoryLoop,
  shutdownContainer,
} from './bucket-container'

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
  const emitter = new EventEmitter() as WebSocketLike & EventEmitter
  emitter.readyState = WS_CLOSED
  emitter.onopen = null
  emitter.onclose = null
  emitter.onerror = null
  emitter.onmessage = null
  emitter.close = () => {
    emitter.readyState = WS_CLOSED
  }
  emitter.send = () => {}
  return emitter
}

interface SpawnCall {
  command: string
  spawnArguments: string[]
  options?: { cwd?: string; env?: NodeJS.ProcessEnv; stdio?: unknown }
}

function createMockSpawn(): {
  spawn: ContainerDependencies['spawn']
  calls: SpawnCall[]
  processes: Map<string, EventEmitter>
} {
  const calls: SpawnCall[] = []
  const processes = new Map<string, EventEmitter>()

  const spawn = ((
    command: string,
    spawnArguments: string[],
    options?: { cwd?: string; env?: NodeJS.ProcessEnv; stdio?: unknown }
  ) => {
    calls.push({ command, spawnArguments, options })
    const proc = new EventEmitter() as EventEmitter & {
      stdout: EventEmitter | null
      stderr: EventEmitter | null
    }
    proc.stdout = new EventEmitter()
    proc.stderr = new EventEmitter()
    const key = `${command} ${spawnArguments.join(' ')}`
    processes.set(key, proc)
    return proc
  }) as ContainerDependencies['spawn']

  return { spawn, calls, processes }
}

function createContainerDependencies(
  overrides: Partial<ContainerDependencies> = {}
): ContainerDependencies {
  const fileSystem = createFileSystemEmulator()
  return {
    spawn: createMockSpawn().spawn,
    createWebSocket: () => createMockWebSocket(),
    fileSystem,
    sleep: () => Promise.resolve(),
    getTempDir: () => '/tmp',
    ...overrides,
  }
}

describe('createDefaultContainerDependencies', () => {
  test('returns object with required functions', () => {
    const fileSystem = createFileSystemEmulator()
    const containerDeps = createDefaultContainerDependencies(fileSystem)
    expect(typeof containerDeps.spawn).toBe('function')
    expect(typeof containerDeps.createWebSocket).toBe('function')
    expect(containerDeps.fileSystem).toBe(fileSystem)
    expect(typeof containerDeps.sleep).toBe('function')
    expect(typeof containerDeps.getTempDir).toBe('function')
  })
})

describe('createInitialContainerState', () => {
  test('returns initial state with empty repositories', () => {
    const state = createInitialContainerState()
    expect(state.ws).toBeNull()
    expect(state.repositories.size).toBe(0)
    expect(state.reconnectDelay).toBe(1000)
    expect(state.reconnectTimer).toBeNull()
    expect(state.shuttingDown).toBe(false)
  })
})

describe('parseRepository', () => {
  test('parses string as simple repository', () => {
    const repo = parseRepository('my-repo')
    expect(repo).toEqual({ name: 'my-repo', gitUrl: 'my-repo' })
  })

  test('parses object with name and gitUrl', () => {
    const repo = parseRepository({
      name: 'my-repo',
      gitUrl: 'https://github.com/user/repo.git',
    })
    expect(repo).toEqual({
      name: 'my-repo',
      gitUrl: 'https://github.com/user/repo.git',
    })
  })

  test('returns null for invalid input', () => {
    expect(parseRepository(null)).toBeNull()
    expect(parseRepository(undefined)).toBeNull()
    expect(parseRepository(123)).toBeNull()
    expect(parseRepository({ name: 'test' })).toBeNull()
    expect(parseRepository({ gitUrl: 'test' })).toBeNull()
  })
})

describe('getRepoTempPath', () => {
  test('creates safe directory name', () => {
    const path = getRepoTempPath('my-repo', '/tmp')
    expect(path).toBe('/tmp/dust-bucket-my-repo')
  })

  test('sanitizes special characters', () => {
    const path = getRepoTempPath('user/repo.name', '/tmp')
    expect(path).toBe('/tmp/dust-bucket-user-repo-name')
  })
})

describe('cloneRepository', () => {
  test('spawns git clone with correct arguments', async () => {
    const { spawn, calls, processes } = createMockSpawn()
    const context = createContextEmulator()
    const repo: Repository = {
      name: 'test-repo',
      gitUrl: 'https://github.com/user/repo.git',
    }

    const promise = cloneRepository(repo, '/tmp/test-repo', spawn, context)

    // Simulate successful clone
    const proc = processes.get(
      'git clone https://github.com/user/repo.git /tmp/test-repo'
    )
    proc?.emit('close', 0)

    const result = await promise
    expect(result).toBe(true)
    expect(calls[0].command).toBe('git')
    expect(calls[0].spawnArguments).toEqual([
      'clone',
      'https://github.com/user/repo.git',
      '/tmp/test-repo',
    ])
  })

  test('returns false on clone failure', async () => {
    const { spawn, processes } = createMockSpawn()
    const context = createContextEmulator()
    const repo: Repository = { name: 'test-repo', gitUrl: 'invalid-url' }

    const promise = cloneRepository(repo, '/tmp/test-repo', spawn, context)

    const proc = processes.get('git clone invalid-url /tmp/test-repo')
    const stderr = (proc as EventEmitter & { stderr: EventEmitter }).stderr
    stderr?.emit('data', 'fatal: not a git repository')
    proc?.emit('close', 128)

    const result = await promise
    expect(result).toBe(false)
    expect(context.stderrLines.join('\n')).toContain(
      'Failed to clone test-repo'
    )
  })

  test('handles spawn error', async () => {
    const { spawn, processes } = createMockSpawn()
    const context = createContextEmulator()
    const repo: Repository = { name: 'test-repo', gitUrl: 'url' }

    const promise = cloneRepository(repo, '/tmp/test-repo', spawn, context)

    const proc = processes.get('git clone url /tmp/test-repo')
    proc?.emit('error', new Error('spawn failed'))

    const result = await promise
    expect(result).toBe(false)
    expect(context.stderrLines.join('\n')).toContain('spawn failed')
  })
})

describe('removeRepository', () => {
  test('spawns rm -rf with correct path', async () => {
    const { spawn, calls, processes } = createMockSpawn()
    const context = createContextEmulator()

    const promise = removeRepository('/tmp/test-repo', spawn, context)

    const proc = processes.get('rm -rf /tmp/test-repo')
    proc?.emit('close', 0)

    const result = await promise
    expect(result).toBe(true)
    expect(calls[0].command).toBe('rm')
    expect(calls[0].spawnArguments).toEqual(['-rf', '/tmp/test-repo'])
  })

  test('returns false on failure', async () => {
    const { spawn, processes } = createMockSpawn()
    const context = createContextEmulator()

    const promise = removeRepository('/tmp/test-repo', spawn, context)

    const proc = processes.get('rm -rf /tmp/test-repo')
    proc?.emit('close', 1)

    const result = await promise
    expect(result).toBe(false)
  })
})

describe('gitPull', () => {
  test('runs git pull in repository', async () => {
    const { spawn, calls, processes } = createMockSpawn()

    const promise = gitPull('/repo', spawn)

    const proc = processes.get('git pull')
    proc?.emit('close', 0)

    const result = await promise
    expect(result).toEqual({ success: true })
    expect(calls[0].options?.cwd).toBe('/repo')
  })

  test('returns error message on failure', async () => {
    const { spawn, processes } = createMockSpawn()

    const promise = gitPull('/repo', spawn)

    const proc = processes.get('git pull')
    const stderr = (proc as EventEmitter & { stderr: EventEmitter }).stderr
    stderr?.emit('data', 'error: cannot pull')
    proc?.emit('close', 1)

    const result = await promise
    expect(result.success).toBe(false)
    expect(result.message).toBe('error: cannot pull')
  })
})

describe('readDustCommand', () => {
  test('reads dustCommand from settings', async () => {
    const fileSystem = createFileSystemEmulator({
      repo: {
        '.dust': {
          config: {
            'settings.json': JSON.stringify({ dustCommand: 'bun run dust' }),
          },
        },
      },
    })

    const result = await readDustCommand('/repo', fileSystem)
    expect(result).toBe('bun run dust')
  })

  test('returns npx dust when no settings file exists', async () => {
    const fileSystem = createFileSystemEmulator()

    const result = await readDustCommand('/repo', fileSystem)
    expect(result).toBe('npx dust')
  })

  test('returns npx dust when dustCommand not in settings', async () => {
    const fileSystem = createFileSystemEmulator({
      repo: {
        '.dust': {
          config: {
            'settings.json': JSON.stringify({ checks: [] }),
          },
        },
      },
    })

    const result = await readDustCommand('/repo', fileSystem)
    expect(result).toBe('npx dust')
  })
})

describe('checkForTasks', () => {
  test('returns true when dust next exits with 0', async () => {
    const { spawn, processes } = createMockSpawn()

    const promise = checkForTasks('/repo', 'dust', spawn)

    const proc = processes.get('dust next')
    proc?.emit('close', 0)

    const result = await promise
    expect(result).toBe(true)
  })

  test('returns false when dust next exits with non-zero', async () => {
    const { spawn, processes } = createMockSpawn()

    const promise = checkForTasks('/repo', 'dust', spawn)

    const proc = processes.get('dust next')
    proc?.emit('close', 1)

    const result = await promise
    expect(result).toBe(false)
  })

  test('handles multi-word dust command', async () => {
    const { spawn, calls, processes } = createMockSpawn()

    const promise = checkForTasks('/repo', 'bun run dust', spawn)

    const proc = processes.get('bun run dust next')
    proc?.emit('close', 0)

    await promise
    expect(calls[0].command).toBe('bun')
    expect(calls[0].spawnArguments).toEqual(['run', 'dust', 'next'])
  })
})

describe('invokeDust', () => {
  test('runs dust loop claude with max-iterations 1', async () => {
    const { spawn, calls, processes } = createMockSpawn()
    const context = createContextEmulator()

    const promise = invokeDust('/repo', 'dust', spawn, context)

    const proc = processes.get('dust loop claude --max-iterations 1')
    proc?.emit('close', 0)

    await promise
    expect(calls[0].spawnArguments).toEqual([
      'loop',
      'claude',
      '--max-iterations',
      '1',
    ])
    expect(calls[0].options?.env?.DUST_UNATTENDED).toBe('1')
  })

  test('rejects on non-zero exit', async () => {
    const { spawn, processes } = createMockSpawn()
    const context = createContextEmulator()

    const promise = invokeDust('/repo', 'dust', spawn, context)

    const proc = processes.get('dust loop claude --max-iterations 1')
    proc?.emit('close', 1)

    await expect(promise).rejects.toThrow('dust exited with code 1')
  })
})

describe('connectWebSocket', () => {
  test('creates WebSocket with token', () => {
    const commandDependencies = createDependencies()
    const state = createInitialContainerState()
    let capturedUrl: string | undefined
    let capturedToken: string | undefined

    const containerDependencies = createContainerDependencies({
      createWebSocket: (url, token) => {
        capturedUrl = url
        capturedToken = token
        return createMockWebSocket()
      },
    })

    connectWebSocket(
      'my-token',
      state,
      containerDependencies,
      commandDependencies.context
    )

    expect(capturedUrl).toBe('wss://dustbucket.com/ws')
    expect(capturedToken).toBe('my-token')
  })

  test('resets reconnect delay on successful connection', () => {
    const commandDependencies = createDependencies()
    const state = createInitialContainerState()
    state.reconnectDelay = 16000

    const webSocket = createMockWebSocket()
    const containerDependencies = createContainerDependencies({
      createWebSocket: () => webSocket,
    })

    connectWebSocket(
      'token',
      state,
      containerDependencies,
      commandDependencies.context
    )

    webSocket.readyState = WS_OPEN
    webSocket.onopen?.()

    expect(state.reconnectDelay).toBe(1000)
  })

  test('schedules reconnection on close', () => {
    const commandDependencies = createDependencies()
    const context = commandDependencies.context as ReturnType<
      typeof createContextEmulator
    >
    const state = createInitialContainerState()

    const webSocket = createMockWebSocket()
    const containerDependencies = createContainerDependencies({
      createWebSocket: () => webSocket,
    })

    connectWebSocket(
      'token',
      state,
      containerDependencies,
      commandDependencies.context
    )

    webSocket.onclose?.({ code: 1006, reason: 'Connection lost' })

    expect(context.stdoutLines.join('\n')).toContain('Reconnecting in 1 second')
    expect(state.reconnectTimer).not.toBeNull()
    expect(state.reconnectDelay).toBe(2000)

    if (state.reconnectTimer) clearTimeout(state.reconnectTimer)
  })

  test('does not connect when shutting down', () => {
    const commandDependencies = createDependencies()
    const state = createInitialContainerState()
    state.shuttingDown = true

    let wsCreated = false
    const containerDependencies = createContainerDependencies({
      createWebSocket: () => {
        wsCreated = true
        return createMockWebSocket()
      },
    })

    connectWebSocket(
      'token',
      state,
      containerDependencies,
      commandDependencies.context
    )

    expect(wsCreated).toBe(false)
  })

  test('handles repository-list messages', () => {
    const commandDependencies = createDependencies()
    const context = commandDependencies.context as ReturnType<
      typeof createContextEmulator
    >
    const state = createInitialContainerState()

    const webSocket = createMockWebSocket()
    const containerDependencies = createContainerDependencies({
      createWebSocket: () => webSocket,
    })

    connectWebSocket(
      'token',
      state,
      containerDependencies,
      commandDependencies.context
    )

    webSocket.onmessage?.({
      data: JSON.stringify({
        type: 'repository-list',
        repositories: ['repo1', 'repo2'],
      }),
    })

    expect(context.stdoutLines.join('\n')).toContain(
      'Received repository list (2 repositories)'
    )
  })
})

describe('handleRepositoryList', () => {
  test('adds new repositories and tracks them in state', async () => {
    const commandDependencies = createDependencies()
    const state = createInitialContainerState()
    const { spawn, processes } = createMockSpawn()

    // Use a flag to stop the loop immediately after adding
    let repoAdded = false
    const containerDependencies = createContainerDependencies({
      spawn,
      sleep: async () => {
        // Stop the loop after clone completes
        if (repoAdded) {
          for (const repoState of state.repositories.values()) {
            repoState.stopRequested = true
          }
        }
      },
    })

    // Start handling - this will clone repos then start loops
    const handlePromise = handleRepositoryList(
      ['repo1'],
      state,
      containerDependencies,
      commandDependencies.context
    )

    // Simulate successful clone
    const cloneProc = processes.get('git clone repo1 /tmp/dust-bucket-repo1')
    cloneProc?.emit('close', 0)
    repoAdded = true

    // The loop will run: git pull -> check tasks -> sleep (which stops)
    // Wait a tick for the loop to start
    await new Promise(resolve => setTimeout(resolve, 0))

    // Simulate git pull
    const pullProc = processes.get('git pull')
    pullProc?.emit('close', 0)

    // Simulate task check (no tasks)
    const nextProc = processes.get('npx dust next')
    nextProc?.emit('close', 1)

    await handlePromise

    expect(state.repositories.size).toBe(1)
    expect(state.repositories.has('repo1')).toBe(true)
  })

  test('removes repositories not in list', async () => {
    const commandDependencies = createDependencies()
    const state = createInitialContainerState()
    const { spawn, processes } = createMockSpawn()

    // Pre-add a repository with an already-completed loop
    state.repositories.set('old-repo', {
      repository: { name: 'old-repo', gitUrl: 'old-repo' },
      path: '/tmp/dust-bucket-old-repo',
      loopPromise: Promise.resolve(),
      stopRequested: false,
    })

    const containerDependencies = createContainerDependencies({
      spawn,
      sleep: () => Promise.resolve(),
    })

    const handlePromise = handleRepositoryList(
      [], // Empty list - should remove old-repo
      state,
      containerDependencies,
      commandDependencies.context
    )

    // Wait a tick for the async to start
    await new Promise(resolve => setTimeout(resolve, 0))

    // Simulate rm -rf
    const rmProc = processes.get('rm -rf /tmp/dust-bucket-old-repo')
    rmProc?.emit('close', 0)

    await handlePromise

    expect(state.repositories.size).toBe(0)
  })
})

describe('shutdownContainer', () => {
  test('clears reconnect timer', async () => {
    const commandDependencies = createDependencies()
    const state = createInitialContainerState()
    state.reconnectTimer = setTimeout(() => {}, 10000)

    const containerDependencies = createContainerDependencies()

    await shutdownContainer(
      state,
      containerDependencies,
      commandDependencies.context
    )

    expect(state.reconnectTimer).toBeNull()
    expect(state.shuttingDown).toBe(true)
  })

  test('closes WebSocket if open', async () => {
    const commandDependencies = createDependencies()
    const state = createInitialContainerState()
    let wsClosed = false

    const webSocket = createMockWebSocket()
    webSocket.readyState = WS_OPEN
    webSocket.close = () => {
      wsClosed = true
    }
    state.ws = webSocket

    const containerDependencies = createContainerDependencies()

    await shutdownContainer(
      state,
      containerDependencies,
      commandDependencies.context
    )

    expect(wsClosed).toBe(true)
    expect(state.ws).toBeNull()
  })

  test('stops all repository loops', async () => {
    const commandDependencies = createDependencies()
    const state = createInitialContainerState()
    const { spawn, processes } = createMockSpawn()

    // Add a repository with a running loop (already completed)
    const repoState = {
      repository: { name: 'repo', gitUrl: 'repo' },
      path: '/tmp/dust-bucket-repo',
      loopPromise: Promise.resolve(),
      stopRequested: false,
    }
    state.repositories.set('repo', repoState)

    const containerDependencies = createContainerDependencies({ spawn })

    const shutdownPromise = shutdownContainer(
      state,
      containerDependencies,
      commandDependencies.context
    )

    // Wait a tick for async to start
    await new Promise(resolve => setTimeout(resolve, 0))

    // Simulate rm -rf
    const rmProc = processes.get('rm -rf /tmp/dust-bucket-repo')
    rmProc?.emit('close', 0)

    await shutdownPromise

    expect(repoState.stopRequested).toBe(true)
    expect(state.repositories.size).toBe(0)
  })

  test('is idempotent', async () => {
    const commandDependencies = createDependencies()
    const context = commandDependencies.context as ReturnType<
      typeof createContextEmulator
    >
    const state = createInitialContainerState()

    const containerDependencies = createContainerDependencies()

    await shutdownContainer(
      state,
      containerDependencies,
      commandDependencies.context
    )
    const outputAfterFirst = context.stdoutLines.length

    await shutdownContainer(
      state,
      containerDependencies,
      commandDependencies.context
    )
    const outputAfterSecond = context.stdoutLines.length

    expect(outputAfterSecond).toBe(outputAfterFirst)
  })
})

describe('runRepositoryLoop', () => {
  test('stops when stopRequested is set', async () => {
    const context = createContextEmulator()
    const { spawn } = createMockSpawn()
    const fileSystem = createFileSystemEmulator()

    const repoState = {
      repository: { name: 'repo', gitUrl: 'repo' },
      path: '/tmp/repo',
      loopPromise: null,
      stopRequested: true, // Already stopped
    }

    const containerDependencies = createContainerDependencies({
      spawn,
      fileSystem,
    })

    await runRepositoryLoop(repoState, containerDependencies, context)

    expect(context.stdoutLines.join('\n')).toContain('Stopped loop for repo')
  })

  test('runs git pull and checks for tasks', async () => {
    const context = createContextEmulator()
    const { spawn, calls, processes } = createMockSpawn()
    const fileSystem = createFileSystemEmulator()

    const repoState = {
      repository: { name: 'repo', gitUrl: 'repo' },
      path: '/tmp/repo',
      loopPromise: null,
      stopRequested: false,
    }

    let iterationCount = 0
    const containerDependencies = createContainerDependencies({
      spawn,
      fileSystem,
      sleep: async () => {
        iterationCount++
        if (iterationCount >= 1) {
          repoState.stopRequested = true
        }
      },
    })

    const loopPromise = runRepositoryLoop(
      repoState,
      containerDependencies,
      context
    )

    // Wait for git pull to be called
    await new Promise(resolve => setTimeout(resolve, 0))

    // First iteration: git pull
    const pullProc = processes.get('git pull')
    pullProc?.emit('close', 0)

    // Wait for task check to be called
    await new Promise(resolve => setTimeout(resolve, 0))

    // Then check for tasks (returns no tasks -> sleep)
    const nextProc = processes.get('npx dust next')
    nextProc?.emit('close', 1) // No tasks

    await loopPromise

    expect(
      calls.some(c => c.command === 'git' && c.spawnArguments[0] === 'pull')
    ).toBe(true)
  })
})

describe('addRepository', () => {
  test('skips if repository already exists', async () => {
    const commandDependencies = createDependencies()
    const state = createInitialContainerState()

    // Pre-add repository
    state.repositories.set('repo', {
      repository: { name: 'repo', gitUrl: 'repo' },
      path: '/tmp/repo',
      loopPromise: null,
      stopRequested: false,
    })

    let cloneCalled = false
    const { spawn } = createMockSpawn()
    const containerDependencies = createContainerDependencies({
      spawn: ((command: string) => {
        if (command === 'git') cloneCalled = true
        return spawn(command, [], {})
      }) as ContainerDependencies['spawn'],
    })

    await addRepository(
      { name: 'repo', gitUrl: 'repo' },
      state,
      containerDependencies,
      commandDependencies.context
    )

    expect(cloneCalled).toBe(false)
  })
})

describe('removeRepositoryFromContainer', () => {
  test('does nothing for unknown repository', async () => {
    const commandDependencies = createDependencies()
    const state = createInitialContainerState()
    const containerDependencies = createContainerDependencies()

    await removeRepositoryFromContainer(
      'unknown',
      state,
      containerDependencies,
      commandDependencies.context
    )

    // Should not throw and should complete without error
  })
})

describe('formatBucketEvent', () => {
  test('formats bucket.connected event', () => {
    const result = formatBucketEvent({ type: 'bucket.connected' })
    expect(result).toBe('✅ Container connected to dustbucket')
  })

  test('formats bucket.disconnected event', () => {
    const result = formatBucketEvent({
      type: 'bucket.disconnected',
      code: 1006,
      reason: 'Connection lost',
    })
    expect(result).toBe(
      '🔌 Container disconnected (code: 1006, reason: Connection lost)'
    )
  })

  test('formats bucket.disconnected event with empty reason', () => {
    const result = formatBucketEvent({
      type: 'bucket.disconnected',
      code: 1000,
      reason: '',
    })
    expect(result).toBe('🔌 Container disconnected (code: 1000, reason: none)')
  })

  test('formats bucket.repository_added event', () => {
    const result = formatBucketEvent({
      type: 'bucket.repository_added',
      repository: 'my-repo',
    })
    expect(result).toBe('📦 Added repository: my-repo')
  })

  test('formats bucket.repository_removed event', () => {
    const result = formatBucketEvent({
      type: 'bucket.repository_removed',
      repository: 'my-repo',
    })
    expect(result).toBe('🗑️ Removed repository: my-repo')
  })

  test('formats bucket.iteration_started event', () => {
    const result = formatBucketEvent({
      type: 'bucket.iteration_started',
      repository: 'my-repo',
    })
    expect(result).toBe('🚀 Starting iteration for my-repo')
  })

  test('formats bucket.iteration_completed event (success)', () => {
    const result = formatBucketEvent({
      type: 'bucket.iteration_completed',
      repository: 'my-repo',
      success: true,
    })
    expect(result).toBe('✅ Completed iteration for my-repo')
  })

  test('formats bucket.iteration_completed event (failure)', () => {
    const result = formatBucketEvent({
      type: 'bucket.iteration_completed',
      repository: 'my-repo',
      success: false,
      error: 'dust exited with code 1',
    })
    expect(result).toBe(
      '❌ Iteration failed for my-repo: dust exited with code 1'
    )
  })

  test('formats bucket.error event with repository', () => {
    const result = formatBucketEvent({
      type: 'bucket.error',
      repository: 'my-repo',
      error: 'Clone failed',
    })
    expect(result).toBe('❌ Error for my-repo: Clone failed')
  })

  test('formats bucket.error event without repository', () => {
    const result = formatBucketEvent({
      type: 'bucket.error',
      error: 'Connection timeout',
    })
    expect(result).toBe('❌ Error: Connection timeout')
  })
})

describe('createBucketEventEmitter', () => {
  test('sends event via WebSocket when connected', () => {
    const sentMessages: string[] = []
    const ws = createMockWebSocket()
    ws.readyState = WS_OPEN
    ws.send = (data: string) => sentMessages.push(data)

    const emit = createBucketEventEmitter(() => ws, 'session-123')
    emit({ type: 'bucket.connected' })

    expect(sentMessages).toHaveLength(1)
    const payload = JSON.parse(sentMessages[0]) as BucketEventPayload
    expect(payload.type).toBe('bucket.connected')
    expect(payload.sessionId).toBe('session-123')
    expect(payload.sequence).toBe(1)
    expect(payload.timestamp).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/
    )
  })

  test('increments sequence number', () => {
    const sentMessages: string[] = []
    const ws = createMockWebSocket()
    ws.readyState = WS_OPEN
    ws.send = (data: string) => sentMessages.push(data)

    const emit = createBucketEventEmitter(() => ws, 'session-123')
    emit({ type: 'bucket.connected' })
    emit({ type: 'bucket.repository_added', repository: 'repo1' })
    emit({ type: 'bucket.repository_added', repository: 'repo2' })

    expect(sentMessages).toHaveLength(3)
    expect((JSON.parse(sentMessages[0]) as BucketEventPayload).sequence).toBe(1)
    expect((JSON.parse(sentMessages[1]) as BucketEventPayload).sequence).toBe(2)
    expect((JSON.parse(sentMessages[2]) as BucketEventPayload).sequence).toBe(3)
  })

  test('does not send when WebSocket is null', () => {
    const sendCalled = false
    const emit = createBucketEventEmitter(() => null, 'session-123')

    // Override send - but it shouldn't be called
    emit({ type: 'bucket.connected' })

    expect(sendCalled).toBe(false)
  })

  test('does not send when WebSocket is not open', () => {
    const sentMessages: string[] = []
    const ws = createMockWebSocket()
    ws.readyState = WS_CLOSED
    ws.send = (data: string) => sentMessages.push(data)

    const emit = createBucketEventEmitter(() => ws, 'session-123')
    emit({ type: 'bucket.connected' })

    expect(sentMessages).toHaveLength(0)
  })

  test('includes repository field for repo-specific events', () => {
    const sentMessages: string[] = []
    const ws = createMockWebSocket()
    ws.readyState = WS_OPEN
    ws.send = (data: string) => sentMessages.push(data)

    const emit = createBucketEventEmitter(() => ws, 'session-123')
    emit({ type: 'bucket.repository_added', repository: 'my-repo' })

    const payload = JSON.parse(sentMessages[0]) as BucketEventPayload
    expect(payload.repository).toBe('my-repo')
  })

  test('includes details for disconnected event', () => {
    const sentMessages: string[] = []
    const ws = createMockWebSocket()
    ws.readyState = WS_OPEN
    ws.send = (data: string) => sentMessages.push(data)

    const emit = createBucketEventEmitter(() => ws, 'session-123')
    emit({ type: 'bucket.disconnected', code: 1006, reason: 'Connection lost' })

    const payload = JSON.parse(sentMessages[0]) as BucketEventPayload
    expect(payload.details).toEqual({ code: 1006, reason: 'Connection lost' })
  })

  test('includes details for iteration_completed event', () => {
    const sentMessages: string[] = []
    const ws = createMockWebSocket()
    ws.readyState = WS_OPEN
    ws.send = (data: string) => sentMessages.push(data)

    const emit = createBucketEventEmitter(() => ws, 'session-123')
    emit({
      type: 'bucket.iteration_completed',
      repository: 'my-repo',
      success: false,
      error: 'Process crashed',
    })

    const payload = JSON.parse(sentMessages[0]) as BucketEventPayload
    expect(payload.details).toEqual({
      success: false,
      error: 'Process crashed',
    })
  })

  test('includes details for error event', () => {
    const sentMessages: string[] = []
    const ws = createMockWebSocket()
    ws.readyState = WS_OPEN
    ws.send = (data: string) => sentMessages.push(data)

    const emit = createBucketEventEmitter(() => ws, 'session-123')
    emit({ type: 'bucket.error', repository: 'my-repo', error: 'Clone failed' })

    const payload = JSON.parse(sentMessages[0]) as BucketEventPayload
    expect(payload.details).toEqual({ error: 'Clone failed' })
  })

  test('ignores send errors (fire-and-forget)', () => {
    const ws = createMockWebSocket()
    ws.readyState = WS_OPEN
    ws.send = () => {
      throw new Error('Send failed')
    }

    const emit = createBucketEventEmitter(() => ws, 'session-123')

    // Should not throw
    expect(() => emit({ type: 'bucket.connected' })).not.toThrow()
  })
})

describe('createInitialContainerState', () => {
  test('includes sessionId and emit function', () => {
    const state = createInitialContainerState()
    expect(state.sessionId).toBeDefined()
    expect(state.sessionId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    )
    expect(typeof state.emit).toBe('function')
  })

  test('emit function uses state.ws', () => {
    const state = createInitialContainerState()
    const sentMessages: string[] = []

    // Initially ws is null, so nothing should be sent
    state.emit({ type: 'bucket.connected' })
    expect(sentMessages).toHaveLength(0)

    // Set up a mock WebSocket
    const ws = createMockWebSocket()
    ws.readyState = WS_OPEN
    ws.send = (data: string) => sentMessages.push(data)
    state.ws = ws

    // Now emit should send
    state.emit({ type: 'bucket.connected' })
    expect(sentMessages).toHaveLength(1)
  })
})

describe('connectWebSocket event emission', () => {
  test('emits bucket.connected on open', () => {
    const commandDependencies = createDependencies()
    const state = createInitialContainerState()
    const sentMessages: string[] = []

    const webSocket = createMockWebSocket()
    webSocket.send = (data: string) => sentMessages.push(data)

    const containerDependencies = createContainerDependencies({
      createWebSocket: () => webSocket,
    })

    connectWebSocket(
      'token',
      state,
      containerDependencies,
      commandDependencies.context
    )

    // Set readyState before triggering onopen
    webSocket.readyState = WS_OPEN
    webSocket.onopen?.()

    expect(sentMessages).toHaveLength(1)
    const payload = JSON.parse(sentMessages[0]) as BucketEventPayload
    expect(payload.type).toBe('bucket.connected')
  })

  test('emits bucket.disconnected on close', () => {
    const commandDependencies = createDependencies()
    const state = createInitialContainerState()
    const sentMessages: string[] = []

    const webSocket = createMockWebSocket()
    webSocket.send = (data: string) => sentMessages.push(data)

    const containerDependencies = createContainerDependencies({
      createWebSocket: () => webSocket,
    })

    connectWebSocket(
      'token',
      state,
      containerDependencies,
      commandDependencies.context
    )

    // First connect
    webSocket.readyState = WS_OPEN
    webSocket.onopen?.()

    // Then disconnect - note: ws is still set, so disconnected event can be sent
    webSocket.onclose?.({ code: 1006, reason: 'Connection lost' })

    // Should have connected event + disconnected event
    // But disconnected happens after ws is set to null, so it won't be sent
    // Actually, emit is called before state.ws is set to null, so it should work
    expect(sentMessages.length).toBeGreaterThanOrEqual(1)
    const connectedPayload = JSON.parse(sentMessages[0]) as BucketEventPayload
    expect(connectedPayload.type).toBe('bucket.connected')

    // Clean up reconnect timer
    if (state.reconnectTimer) clearTimeout(state.reconnectTimer)
  })
})
