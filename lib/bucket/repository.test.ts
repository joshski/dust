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
  getRepoPath,
  handleRepositoryList,
  parseRepository,
  type Repository,
  type RepositoryDependencies,
  type RepositoryManager,
  type RepositoryState,
  removeRepository,
  removeRepositoryFromManager,
  runRepositoryLoop,
  startRepositoryLoop,
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
    sleep: () => new Promise(() => {}),
    getReposDir: () => '/tmp',
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
    expect(typeof repoDeps.getReposDir).toBe('function')
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
    // Both keys present but wrong types
    expect(parseRepository({ name: 123, gitUrl: 456 })).toBeNull()
  })

  test('parses object with name, gitUrl, and url', () => {
    const repo = parseRepository({
      name: 'my-repo',
      gitUrl: 'https://github.com/user/repo.git',
      url: 'https://github.com/user/repo',
    })
    expect(repo).toEqual({
      name: 'my-repo',
      gitUrl: 'https://github.com/user/repo.git',
      url: 'https://github.com/user/repo',
    })
  })

  test('ignores url field if not a string', () => {
    const repo = parseRepository({
      name: 'my-repo',
      gitUrl: 'https://github.com/user/repo.git',
      url: 123, // Invalid url
    })
    expect(repo).toEqual({
      name: 'my-repo',
      gitUrl: 'https://github.com/user/repo.git',
    })
    expect(repo?.url).toBeUndefined()
  })

  test('parses object with name, gitUrl, and id', () => {
    const repo = parseRepository({
      name: 'my-repo',
      gitUrl: 'https://github.com/user/repo.git',
      id: 123,
    })
    expect(repo).toEqual({
      name: 'my-repo',
      gitUrl: 'https://github.com/user/repo.git',
      id: 123,
    })
  })

  test('ignores id field if not a number', () => {
    const repo = parseRepository({
      name: 'my-repo',
      gitUrl: 'https://github.com/user/repo.git',
      id: 'not-a-number',
    })
    expect(repo).toEqual({
      name: 'my-repo',
      gitUrl: 'https://github.com/user/repo.git',
    })
    expect(repo?.id).toBeUndefined()
  })
})

describe('getRepoPath', () => {
  test('creates directory matching repo name', () => {
    const path = getRepoPath('my-repo', '/tmp')
    expect(path).toBe('/tmp/my-repo')
  })

  test('preserves org/repo structure', () => {
    const path = getRepoPath('user/repo', '/tmp')
    expect(path).toBe('/tmp/user/repo')
  })

  test('sanitizes special characters but keeps slashes', () => {
    const path = getRepoPath('user/repo.name', '/tmp')
    expect(path).toBe('/tmp/user/repo-name')
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
      agentStatus: 'idle' as const,
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

  test('waits for wakeUp signal when no tasks available', async () => {
    const { spawn } = createAutoResolvingSpawn()
    const fileSystem = createFileSystemEmulator()

    const repoState: RepositoryState = {
      repository: { name: 'repo', gitUrl: 'repo' },
      path: '/tmp/repo',
      loopPromise: null,
      stopRequested: false,
      logBuffer: createLogBuffer(),
      agentStatus: 'idle' as const,
    }

    let sleepCalled = false
    const repoDeps = createRepositoryDependencies({
      spawn,
      fileSystem,
      sleep: async () => {
        sleepCalled = true
        // Don't resolve instantly — let the test control timing via wakeUp
        return new Promise(() => {})
      },
    })

    // Start the loop
    const loopPromise = runRepositoryLoop(repoState, repoDeps)

    // Wait for the loop to enter the wait state
    await new Promise(resolve => setTimeout(resolve, 50))

    expect(sleepCalled).toBe(true)

    // Stop on next iteration, then wake up
    repoState.stopRequested = true
    repoState.wakeUp?.()

    await loopPromise

    const logLines = getLogLines(repoState.logBuffer)
    expect(logLines.some(l => l.text.includes('No tasks'))).toBe(true)
  })

  test('skips wait when taskAvailablePending is set', async () => {
    const { spawn } = createAutoResolvingSpawn()
    const fileSystem = createFileSystemEmulator()

    const repoState: RepositoryState = {
      repository: { name: 'repo', gitUrl: 'repo' },
      path: '/tmp/repo',
      loopPromise: null,
      stopRequested: false,
      logBuffer: createLogBuffer(),
      agentStatus: 'idle' as const,
      taskAvailablePending: true,
    }

    let sleepCalled = false
    const repoDeps = createRepositoryDependencies({
      spawn,
      fileSystem,
      sleep: async () => {
        sleepCalled = true
        return new Promise(() => {})
      },
    })

    const loopPromise = runRepositoryLoop(repoState, repoDeps)

    // Wait for the loop to process two iterations (pending flag cleared, then no_tasks)
    await new Promise(resolve => setTimeout(resolve, 50))

    // The flag should have been cleared and the loop should have retried
    expect(repoState.taskAvailablePending).toBeFalsy()

    // Eventually it should reach the wait state (no tasks on second iteration)
    expect(sleepCalled).toBe(true)

    // Clean up
    repoState.stopRequested = true
    repoState.wakeUp?.()
    await loopPromise
  })

  test('wakeUp resolves the wait immediately', async () => {
    const { spawn } = createAutoResolvingSpawn()
    const fileSystem = createFileSystemEmulator()

    const repoState: RepositoryState = {
      repository: { name: 'repo', gitUrl: 'repo' },
      path: '/tmp/repo',
      loopPromise: null,
      stopRequested: false,
      logBuffer: createLogBuffer(),
      agentStatus: 'idle' as const,
    }

    const repoDeps = createRepositoryDependencies({
      spawn,
      fileSystem,
      sleep: () => new Promise(() => {}),
    })

    const loopPromise = runRepositoryLoop(repoState, repoDeps)

    // Wait for the loop to reach the wait state
    await new Promise(resolve => setTimeout(resolve, 50))

    // wakeUp should be set
    expect(repoState.wakeUp).toBeDefined()

    // Wake up the loop, then stop it on the next iteration
    repoState.stopRequested = true
    repoState.wakeUp?.()

    await loopPromise

    const logLines = getLogLines(repoState.logBuffer)
    expect(logLines.some(l => l.text.includes('Stopped loop for repo'))).toBe(
      true
    )
  })

  test('cancelCurrentIteration aborts an in-flight agent run', async () => {
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

    const repoState: RepositoryState = {
      repository: { name: 'repo', gitUrl: 'repo' },
      path: '/tmp/repo',
      loopPromise: null,
      stopRequested: false,
      logBuffer: createLogBuffer(),
      agentStatus: 'idle' as const,
    }

    let signalWasAborted = false
    let runStartedResolve: (() => void) | undefined
    const runStarted = new Promise<void>(resolve => {
      runStartedResolve = resolve
    })

    const repoDeps = createRepositoryDependencies({
      spawn,
      fileSystem,
      run: async (_prompt, options) => {
        const signal = (options as { spawnOptions?: { signal?: AbortSignal } })
          .spawnOptions?.signal
        runStartedResolve?.()
        await new Promise<void>(resolve => {
          if (!signal) return resolve()
          if (signal.aborted) {
            signalWasAborted = true
            return resolve()
          }
          signal.addEventListener(
            'abort',
            () => {
              signalWasAborted = true
              resolve()
            },
            { once: true }
          )
        })
        fileSystem.files.delete('/tmp/repo/.dust/tasks/my-task.md')
      },
      sleep: async () => {},
    })

    const loopPromise = runRepositoryLoop(repoState, repoDeps)
    await runStarted

    repoState.stopRequested = true
    repoState.cancelCurrentIteration?.()
    await loopPromise

    expect(signalWasAborted).toBe(true)
    expect(repoState.cancelCurrentIteration).toBeUndefined()
  })

  test('stale fallback timeout does not clear a newer wait wakeUp handler', async () => {
    const { spawn } = createAutoResolvingSpawn()
    const fileSystem = createFileSystemEmulator()

    const repoState: RepositoryState = {
      repository: { name: 'repo', gitUrl: 'repo' },
      path: '/tmp/repo',
      loopPromise: null,
      stopRequested: false,
      logBuffer: createLogBuffer(),
      agentStatus: 'idle' as const,
    }

    const sleepResolvers: Array<() => void> = []
    const repoDeps = createRepositoryDependencies({
      spawn,
      fileSystem,
      sleep: () =>
        new Promise<void>(resolve => {
          sleepResolvers.push(resolve)
        }),
    })

    const loopPromise = runRepositoryLoop(repoState, repoDeps)

    // First wait state
    await new Promise(resolve => setTimeout(resolve, 50))
    const firstWakeUp = repoState.wakeUp
    expect(firstWakeUp).toBeDefined()
    expect(sleepResolvers.length).toBeGreaterThanOrEqual(1)

    // Move into second wait state
    firstWakeUp?.()
    await new Promise(resolve => setTimeout(resolve, 50))
    const secondWakeUp = repoState.wakeUp
    expect(secondWakeUp).toBeDefined()
    expect(sleepResolvers.length).toBeGreaterThanOrEqual(2)

    // Resolve the first wait's timeout after second wait is active.
    // This previously cleared the second wakeUp and deadlocked the loop.
    sleepResolvers[0]?.()
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(repoState.wakeUp).toBe(secondWakeUp)

    repoState.stopRequested = true
    repoState.wakeUp?.()
    await loopPromise
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
      agentStatus: 'idle' as const,
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
    const startedEvent = sentEvents.find(
      e =>
        (e as { repository: string }).repository === 'repo' &&
        (e as { event: { type: string } }).event.type ===
          'agent-session-started'
    )
    expect(startedEvent).toBeDefined()
    // agentSessionId should be present from the first event (dust-generated)
    expect(
      (startedEvent as { agentSessionId?: string }).agentSessionId
    ).toBeDefined()
    // title should be present on agent-session-started
    expect((startedEvent as { event: { title?: string } }).event.title).toBe(
      'My Task'
    )

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
      agentStatus: 'idle' as const,
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

  test('sets agentStatus to busy on agent-session-started and idle on agent-session-ended', async () => {
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
      agentStatus: 'idle' as const,
    }

    let statusDuringRun: string | undefined

    const repoDeps = createRepositoryDependencies({
      spawn,
      fileSystem,
      run: async () => {
        // By the time run is called, agent-session-started has been emitted
        // so agentStatus should be 'busy'
        statusDuringRun = repoState.agentStatus
        fileSystem.files.delete('/tmp/repo/.dust/tasks/my-task.md')
      },
      sleep: async () => {
        repoState.stopRequested = true
      },
    })

    await runRepositoryLoop(repoState, repoDeps)

    expect(statusDuringRun).toBe('busy')
    expect(repoState.agentStatus).toBe('idle')
  })
})

describe('startRepositoryLoop', () => {
  test('clears loopPromise after loop exits', async () => {
    const { spawn } = createAutoResolvingSpawn()
    const fileSystem = createFileSystemEmulator()

    const repoState: RepositoryState = {
      repository: { name: 'repo', gitUrl: 'repo' },
      path: '/tmp/repo',
      loopPromise: null,
      stopRequested: false,
      logBuffer: createLogBuffer(),
      agentStatus: 'idle',
    }

    const repoDeps = createRepositoryDependencies({
      spawn,
      fileSystem,
      sleep: async () => {
        repoState.stopRequested = true
      },
    })

    startRepositoryLoop(repoState, repoDeps)
    expect(repoState.loopPromise).not.toBeNull()

    const firstPromise = repoState.loopPromise as Promise<void>
    await firstPromise

    expect(repoState.loopPromise).toBeNull()
  })
})

describe('handleRepositoryList', () => {
  test('filters out invalid repository entries', async () => {
    const context = createContextEmulator()
    const manager = createMockManager()
    const repoDeps = createRepositoryDependencies({
      sleep: () => Promise.resolve(),
    })

    // Pass an array with invalid entries that parseRepository returns null for
    await handleRepositoryList(
      [123, null, { invalid: 'data' }],
      manager,
      repoDeps,
      context
    )

    // No repositories should be added since all are invalid
    expect(manager.repositories.size).toBe(0)
  })

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
        // Block until clone is resolved, then stop the loop
        if (!cloneResolved) return new Promise(() => {})
        for (const repoState of manager.repositories.values()) {
          repoState.stopRequested = true
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

    const cloneProc = processes.get('git clone repo1 /tmp/repo1')
    cloneProc?.emit('close', 0)
    cloneResolved = true

    // Wake the loop now that clone is done
    for (const repoState of manager.repositories.values()) {
      repoState.wakeUp?.()
    }

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
      path: '/tmp/old-repo',
      loopPromise: Promise.resolve(),
      stopRequested: false,
      logBuffer: createLogBuffer(),
      agentStatus: 'idle' as const,
    })

    const repoDeps = createRepositoryDependencies({
      spawn,
      sleep: () => Promise.resolve(),
    })

    const handlePromise = handleRepositoryList([], manager, repoDeps, context)

    await new Promise(resolve => setTimeout(resolve, 0))

    const rmProc = processes.get('rm -rf /tmp/old-repo')
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
      agentStatus: 'idle' as const,
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
        'stale-repo': {
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

    const cloneProc = processes.get('git clone stale-repo /tmp/stale-repo')
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

    const cloneProc = processes.get('git clone bad-url /tmp/fail-repo')
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
