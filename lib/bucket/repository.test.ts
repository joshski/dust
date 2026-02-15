import { EventEmitter } from 'node:events'
import { describe, expect, test } from 'vitest'
import {
  createContextEmulator,
  createFileSystemEmulator,
} from '../test/test-utilities'
import { createLogBuffer, getLogLines } from './log-buffer'
import {
  addRepository,
  cloneRepository,
  createDefaultRepositoryDependencies,
  getRepoTempPath,
  handleRepositoryList,
  parseRepository,
  type Repository,
  type RepositoryDependencies,
  type RepositoryManager,
  removeRepository,
  removeRepositoryFromManager,
  runRepositoryLoop,
} from './repository'

interface SpawnCall {
  command: string
  spawnArguments: string[]
  options?: { cwd?: string; env?: NodeJS.ProcessEnv; stdio?: unknown }
}

function createMockSpawn(): {
  spawn: RepositoryDependencies['spawn']
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
  }) as RepositoryDependencies['spawn']

  return { spawn, calls, processes }
}

/**
 * Create a spawn that auto-resolves all processes with exit code 0.
 * Useful for tests that go through runOneIteration where we don't
 * need to manually control subprocess timing.
 */
function createAutoResolvingSpawn(): {
  spawn: RepositoryDependencies['spawn']
  calls: SpawnCall[]
} {
  const calls: SpawnCall[] = []

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
    process.nextTick(() => proc.emit('close', 0))
    return proc
  }) as RepositoryDependencies['spawn']

  return { spawn, calls }
}

function createMockRun(): RepositoryDependencies['run'] {
  return async () => {}
}

function createRepositoryDependencies(
  overrides: Partial<RepositoryDependencies> = {}
): RepositoryDependencies {
  const fileSystem = createFileSystemEmulator()
  return {
    spawn: createMockSpawn().spawn,
    run: createMockRun(),
    fileSystem,
    sleep: () => Promise.resolve(),
    getTempDir: () => '/tmp',
    ...overrides,
  }
}

function createMockManager(): RepositoryManager {
  return {
    repositories: new Map(),
    logBuffers: new Map(),
    emit: () => {},
    sendEvent: () => {},
    sessionId: 'test-session-id',
  }
}

describe('createDefaultRepositoryDependencies', () => {
  test('returns object with required functions', () => {
    const fileSystem = createFileSystemEmulator()
    const repoDeps = createDefaultRepositoryDependencies(fileSystem)
    expect(typeof repoDeps.spawn).toBe('function')
    expect(typeof repoDeps.run).toBe('function')
    expect(repoDeps.fileSystem).toBe(fileSystem)
    expect(typeof repoDeps.sleep).toBe('function')
    expect(typeof repoDeps.getTempDir).toBe('function')
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

  test('returns false on spawn error', async () => {
    const { spawn, processes } = createMockSpawn()
    const context = createContextEmulator()

    const promise = removeRepository('/tmp/test-repo', spawn, context)

    const proc = processes.get('rm -rf /tmp/test-repo')
    proc?.emit('error', new Error('spawn failed'))

    const result = await promise
    expect(result).toBe(false)
    expect(context.stderrLines.join('\n')).toContain(
      'Failed to remove /tmp/test-repo: spawn failed'
    )
  })
})

describe('runRepositoryLoop', () => {
  test('stops when stopRequested is set', async () => {
    const { spawn } = createAutoResolvingSpawn()
    const fileSystem = createFileSystemEmulator()

    const repoState = {
      repository: { name: 'repo', gitUrl: 'repo' },
      path: '/tmp/repo',
      loopPromise: null,
      stopRequested: true,
      logBuffer: createLogBuffer(),
    }

    const repoDeps = createRepositoryDependencies({
      spawn,
      fileSystem,
    })

    await runRepositoryLoop(repoState, repoDeps)

    const logLines = getLogLines(repoState.logBuffer)
    expect(logLines.some(l => l.text.includes('Stopped loop for repo'))).toBe(
      true
    )
  })

  test('sleeps when no tasks available and stops on request', async () => {
    const { spawn } = createAutoResolvingSpawn()
    const fileSystem = createFileSystemEmulator()

    const repoState = {
      repository: { name: 'repo', gitUrl: 'repo' },
      path: '/tmp/repo',
      loopPromise: null,
      stopRequested: false,
      logBuffer: createLogBuffer(),
    }

    let sleepCount = 0
    const repoDeps = createRepositoryDependencies({
      spawn,
      fileSystem,
      sleep: async () => {
        sleepCount++
        if (sleepCount >= 1) {
          repoState.stopRequested = true
        }
      },
    })

    await runRepositoryLoop(repoState, repoDeps)

    // "No tasks" message is written by loopEmit via formatEvent('loop.no_tasks')
    const logLines = getLogLines(repoState.logBuffer)
    expect(logLines.some(l => l.text.includes('No tasks'))).toBe(true)
    expect(sleepCount).toBe(1)
  })

  test('sends agent events over WebSocket when tasks are found and claude runs', async () => {
    const { spawn } = createAutoResolvingSpawn()

    // Set up filesystem with a task file (tmp = /tmp directory)
    const fileSystem = createFileSystemEmulator({
      // biome-ignore lint: tmp is the /tmp directory name, not an abbreviation
      tmp: {
        repo: {
          '.dust': {
            tasks: {
              'my-task.md': '# My Task\n\nDo something',
            },
          },
        },
      },
    })

    const repoState = {
      repository: { name: 'repo', gitUrl: 'repo' },
      path: '/tmp/repo',
      loopPromise: null,
      stopRequested: false,
      logBuffer: createLogBuffer(),
    }

    let iterationCount = 0
    const sentEvents: unknown[] = []

    const repoDeps = createRepositoryDependencies({
      spawn,
      fileSystem,
      run: async (_prompt, options, dependencies) => {
        // Exercise the bufferSinkDeps callbacks
        if (dependencies) {
          const sink = dependencies.createStdoutSink()
          // write() with partial line (no trailing newline)
          sink.write('partial ')
          // write() with complete lines
          sink.write('line\ncomplete\n')
          // line() flushes pending partial then writes
          sink.write('pending')
          sink.line('tool output\nmultiline')
        }
        // Exercise onRawEvent with session_id
        const runOptions = options as {
          onRawEvent?: (e: Record<string, unknown>) => void
        }
        runOptions?.onRawEvent?.({
          type: 'stream_event',
          session_id: 'agent-session-xyz',
        })
        // Simulate Claude completing - remove the task file
        // so next iteration finds no tasks and the loop sleeps
        fileSystem.files.delete('/tmp/repo/.dust/tasks/my-task.md')
      },
      sleep: async () => {
        iterationCount++
        if (iterationCount >= 1) {
          repoState.stopRequested = true
        }
      },
    })

    await runRepositoryLoop(
      repoState,
      repoDeps,
      msg => {
        sentEvents.push(msg)
      },
      'bucket-session-1'
    )

    // Should have sent agent-session-started and agent-session-ended EventMessages
    expect(
      sentEvents.some(
        e =>
          (e as { repository: string }).repository === 'repo' &&
          (e as { event: { type: string } }).event.type ===
            'agent-session-started'
      )
    ).toBe(true)
    expect(
      sentEvents.some(
        e =>
          (e as { repository: string }).repository === 'repo' &&
          (e as { event: { type: string } }).event.type ===
            'agent-session-ended'
      )
    ).toBe(true)

    // Should have logged events to the log buffer
    const logLines = getLogLines(repoState.logBuffer)
    expect(logLines.length).toBeGreaterThan(0)
  })

  test('logs claude errors to repo log buffer via context.stderr', async () => {
    const { spawn } = createAutoResolvingSpawn()
    const fileSystem = createFileSystemEmulator({
      // biome-ignore lint: tmp is the /tmp directory name, not an abbreviation
      tmp: {
        repo: {
          '.dust': {
            tasks: {
              'my-task.md': '# My Task\n\nDo something',
            },
          },
        },
      },
    })

    const repoState = {
      repository: { name: 'repo', gitUrl: 'repo' },
      path: '/tmp/repo',
      loopPromise: null,
      stopRequested: false,
      logBuffer: createLogBuffer(),
    }

    const repoDeps = createRepositoryDependencies({
      spawn,
      fileSystem,
      run: async () => {
        fileSystem.files.delete('/tmp/repo/.dust/tasks/my-task.md')
        throw new Error('Claude crashed')
      },
      sleep: async () => {
        repoState.stopRequested = true
      },
    })

    await runRepositoryLoop(repoState, repoDeps)

    const logLines = getLogLines(repoState.logBuffer)
    expect(logLines.some(l => l.stream === 'stderr')).toBe(true)
    expect(
      logLines.some(l => l.text.includes('Claude exited with error'))
    ).toBe(true)
  })
})

describe('handleRepositoryList', () => {
  test('adds new repositories and tracks them in state', async () => {
    const context = createContextEmulator()
    const manager = createMockManager()

    // Use manual spawn for clone, auto-resolve for everything else
    const { spawn: manualSpawn, processes } = createMockSpawn()
    const { spawn: autoSpawn } = createAutoResolvingSpawn()

    let cloneResolved = false
    const combinedSpawn = ((
      command: string,
      spawnArguments: string[],
      options?: unknown
    ) => {
      // Use manual spawn for clone, auto-resolving for git pull
      if (command === 'git' && spawnArguments[0] === 'clone') {
        return manualSpawn(command, spawnArguments, options as never)
      }
      return autoSpawn(command, spawnArguments, options as never)
    }) as RepositoryDependencies['spawn']

    const repoDeps = createRepositoryDependencies({
      spawn: combinedSpawn,
      sleep: async () => {
        if (cloneResolved) {
          for (const repoState of manager.repositories.values()) {
            repoState.stopRequested = true
          }
        }
      },
    })

    const handlePromise = handleRepositoryList(
      ['repo1'],
      manager,
      repoDeps,
      context
    )

    // Wait for clone to be spawned
    await new Promise(resolve => setTimeout(resolve, 0))

    const cloneProc = processes.get('git clone repo1 /tmp/dust-bucket-repo1')
    cloneProc?.emit('close', 0)
    cloneResolved = true

    await handlePromise

    expect(manager.repositories.size).toBe(1)
    expect(manager.repositories.has('repo1')).toBe(true)
  })

  test('removes repositories not in list', async () => {
    const context = createContextEmulator()
    const manager = createMockManager()
    const { spawn, processes } = createMockSpawn()

    manager.repositories.set('old-repo', {
      repository: { name: 'old-repo', gitUrl: 'old-repo' },
      path: '/tmp/dust-bucket-old-repo',
      loopPromise: Promise.resolve(),
      stopRequested: false,
      logBuffer: createLogBuffer(),
    })

    const repoDeps = createRepositoryDependencies({
      spawn,
      sleep: () => Promise.resolve(),
    })

    const handlePromise = handleRepositoryList([], manager, repoDeps, context)

    await new Promise(resolve => setTimeout(resolve, 0))

    const rmProc = processes.get('rm -rf /tmp/dust-bucket-old-repo')
    rmProc?.emit('close', 0)

    await handlePromise

    expect(manager.repositories.size).toBe(0)
  })
})

describe('addRepository', () => {
  test('skips if repository already exists', async () => {
    const context = createContextEmulator()
    const manager = createMockManager()

    manager.repositories.set('repo', {
      repository: { name: 'repo', gitUrl: 'repo' },
      path: '/tmp/repo',
      loopPromise: null,
      stopRequested: false,
      logBuffer: createLogBuffer(),
    })

    let cloneCalled = false
    const { spawn } = createMockSpawn()
    const repoDeps = createRepositoryDependencies({
      spawn: ((command: string) => {
        if (command === 'git') cloneCalled = true
        return spawn(command, [], {})
      }) as RepositoryDependencies['spawn'],
    })

    await addRepository(
      { name: 'repo', gitUrl: 'repo' },
      manager,
      repoDeps,
      context
    )

    expect(cloneCalled).toBe(false)
  })

  test('cleans up stale directory before cloning', async () => {
    const context = createContextEmulator()
    const manager = createMockManager()

    const fileSystem = createFileSystemEmulator({
      // biome-ignore lint: tmp is the /tmp directory name, not an abbreviation
      tmp: {
        'dust-bucket-stale-repo': {
          'some-file': 'leftover',
        },
      },
    })

    const { spawn: manualSpawn, processes } = createMockSpawn()
    const { spawn: autoSpawn } = createAutoResolvingSpawn()

    const combinedSpawn = ((
      command: string,
      spawnArguments: string[],
      options?: unknown
    ) => {
      // Use manual spawn for clone, auto-resolving for rm -rf and git pull
      if (command === 'git' && spawnArguments[0] === 'clone') {
        return manualSpawn(command, spawnArguments, options as never)
      }
      if (command === 'rm') {
        return autoSpawn(command, spawnArguments, options as never)
      }
      return autoSpawn(command, spawnArguments, options as never)
    }) as RepositoryDependencies['spawn']

    const repoDeps = createRepositoryDependencies({
      spawn: combinedSpawn,
      fileSystem,
      sleep: async () => {
        for (const repoState of manager.repositories.values()) {
          repoState.stopRequested = true
        }
      },
    })

    const addPromise = addRepository(
      { name: 'stale-repo', gitUrl: 'stale-repo' },
      manager,
      repoDeps,
      context
    )

    await new Promise(resolve => setTimeout(resolve, 0))

    const cloneProc = processes.get(
      'git clone stale-repo /tmp/dust-bucket-stale-repo'
    )
    cloneProc?.emit('close', 0)

    await addPromise

    expect(manager.repositories.has('stale-repo')).toBe(true)
  })

  test('emits error event and returns when clone fails', async () => {
    const context = createContextEmulator()
    const manager = createMockManager()
    const emittedEvents: unknown[] = []
    manager.emit = event => {
      emittedEvents.push(event)
    }

    const { spawn, processes } = createMockSpawn()
    const repoDeps = createRepositoryDependencies({ spawn })

    const addPromise = addRepository(
      { name: 'fail-repo', gitUrl: 'bad-url' },
      manager,
      repoDeps,
      context
    )

    await new Promise(resolve => setTimeout(resolve, 0))

    const cloneProc = processes.get(
      'git clone bad-url /tmp/dust-bucket-fail-repo'
    )
    const stderr = (cloneProc as EventEmitter & { stderr: EventEmitter }).stderr
    stderr?.emit('data', 'clone error')
    cloneProc?.emit('close', 128)

    await addPromise

    expect(manager.repositories.has('fail-repo')).toBe(false)
    expect(emittedEvents).toEqual([
      expect.objectContaining({
        type: 'bucket.error',
        repository: 'fail-repo',
        error: 'Clone failed',
      }),
    ])
    expect(context.stderrLines.join('\n')).toContain('Clone failed')
  })
})

describe('removeRepositoryFromManager', () => {
  test('does nothing for unknown repository', async () => {
    const context = createContextEmulator()
    const manager = createMockManager()
    const repoDeps = createRepositoryDependencies()

    await removeRepositoryFromManager('unknown', manager, repoDeps, context)
  })
})
