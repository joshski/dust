import { EventEmitter } from 'node:events'
import { describe, expect, test } from 'vitest'
import {
  createContextEmulator,
  createFileSystemEmulator,
  createTestAuthConfig,
  createTestRuntimeConfig,
  createTestSessionConfig,
  waitFor,
} from '../test/test-utilities'
import { createLogBuffer, getLogLines } from './log-buffer'

const VALID_TASK_CONTENT = `# My Task

Do something

## Blocked By

(none)

## Definition of Done

- [ ] Done`
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
    session: createTestSessionConfig(),
    runtime: createTestRuntimeConfig(),
    auth: createTestAuthConfig(),
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
  test('parses object with all required fields', () => {
    const repo = parseRepository({
      name: 'my-repo',
      gitUrl: 'https://github.com/user/repo.git',
      url: 'https://example.com/my-repo',
      id: 123,
    })
    expect(repo).toEqual({
      name: 'my-repo',
      gitUrl: 'https://github.com/user/repo.git',
      gitSshUrl: undefined,
      url: 'https://example.com/my-repo',
      id: 123,
    })
  })

  test('parses object with gitSshUrl', () => {
    const repo = parseRepository({
      name: 'my-repo',
      gitUrl: 'https://github.com/user/repo.git',
      gitSshUrl: 'git@github.com:user/repo.git',
      url: 'https://example.com/my-repo',
      id: 123,
    })
    expect(repo).toEqual({
      name: 'my-repo',
      gitUrl: 'https://github.com/user/repo.git',
      gitSshUrl: 'git@github.com:user/repo.git',
      url: 'https://example.com/my-repo',
      id: 123,
    })
  })

  test('returns null for invalid input', () => {
    expect(parseRepository(null)).toBeNull()
    expect(parseRepository(undefined)).toBeNull()
    expect(parseRepository(123)).toBeNull()
    expect(parseRepository('my-repo')).toBeNull()
    expect(parseRepository({ name: 'test' })).toBeNull()
    expect(parseRepository({ gitUrl: 'test' })).toBeNull()
    expect(parseRepository({ name: 123, gitUrl: 456 })).toBeNull()
  })

  test('returns null when url is missing or invalid', () => {
    expect(
      parseRepository({
        name: 'my-repo',
        gitUrl: 'https://github.com/user/repo.git',
        id: 123,
      })
    ).toBeNull()
    expect(
      parseRepository({
        name: 'my-repo',
        gitUrl: 'https://github.com/user/repo.git',
        id: 123,
        url: 123,
      })
    ).toBeNull()
  })

  test('parses object with agentProvider', () => {
    const repo = parseRepository({
      name: 'my-repo',
      gitUrl: 'https://github.com/user/repo.git',
      url: 'https://example.com/my-repo',
      id: 123,
      agentProvider: 'codex',
    })
    expect(repo).toEqual({
      name: 'my-repo',
      gitUrl: 'https://github.com/user/repo.git',
      url: 'https://example.com/my-repo',
      id: 123,
      agentProvider: 'codex',
    })
  })

  test('returns null when id is missing or invalid', () => {
    expect(
      parseRepository({
        name: 'my-repo',
        gitUrl: 'https://github.com/user/repo.git',
        url: 'https://example.com/my-repo',
      })
    ).toBeNull()
    expect(
      parseRepository({
        name: 'my-repo',
        gitUrl: 'https://github.com/user/repo.git',
        url: 'https://example.com/my-repo',
        id: 'not-a-number',
      })
    ).toBeNull()
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
      url: 'https://example.com/test-repo',
      id: 1,
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
    const repo: Repository = {
      name: 'test-repo',
      gitUrl: 'invalid-url',
      url: 'https://example.com/test-repo',
      id: 2,
    }

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
    const repo: Repository = {
      name: 'test-repo',
      gitUrl: 'url',
      url: 'https://example.com/test-repo',
      id: 3,
    }

    const promise = cloneRepository(repo, '/tmp/test-repo', spawn, context)

    const proc = processes.get('git clone url /tmp/test-repo')
    proc?.emit('error', new Error('spawn failed'))

    const result = await promise
    expect(result).toBe(false)
    expect(context.stderrLines.join('\n')).toContain('spawn failed')
  })

  test('falls back to SSH when HTTPS clone fails', async () => {
    const { spawn, calls, processes } = createMockSpawn()
    const context = createContextEmulator()
    const repo: Repository = {
      name: 'test-repo',
      gitUrl: 'https://github.com/user/repo.git',
      gitSshUrl: 'git@github.com:user/repo.git',
      url: 'https://example.com/test-repo',
      id: 4,
    }

    const promise = cloneRepository(repo, '/tmp/test-repo', spawn, context)

    // Fail the HTTPS clone
    const httpsProc = processes.get(
      'git clone https://github.com/user/repo.git /tmp/test-repo'
    )
    const httpsStderr = (httpsProc as EventEmitter & { stderr: EventEmitter })
      .stderr
    httpsStderr?.emit('data', 'authentication failed')
    httpsProc?.emit('close', 128)

    // Wait for SSH clone to be spawned
    await new Promise(resolve => setTimeout(resolve, 0))

    // Succeed the SSH clone
    const sshProc = processes.get(
      'git clone git@github.com:user/repo.git /tmp/test-repo'
    )
    sshProc?.emit('close', 0)

    const result = await promise
    expect(result).toBe(true)
    expect(calls.length).toBe(2)
    expect(calls[0].spawnArguments).toEqual([
      'clone',
      'https://github.com/user/repo.git',
      '/tmp/test-repo',
    ])
    expect(calls[1].spawnArguments).toEqual([
      'clone',
      'git@github.com:user/repo.git',
      '/tmp/test-repo',
    ])
    expect(context.stderrLines.join('\n')).toContain(
      'HTTPS clone failed for test-repo, trying SSH'
    )
  })

  test('reports SSH failure when both HTTPS and SSH fail', async () => {
    const { spawn, processes } = createMockSpawn()
    const context = createContextEmulator()
    const repo: Repository = {
      name: 'test-repo',
      gitUrl: 'https://github.com/user/repo.git',
      gitSshUrl: 'git@github.com:user/repo.git',
      url: 'https://example.com/test-repo',
      id: 5,
    }

    const promise = cloneRepository(repo, '/tmp/test-repo', spawn, context)

    // Fail the HTTPS clone
    const httpsProc = processes.get(
      'git clone https://github.com/user/repo.git /tmp/test-repo'
    )
    const httpsStderr = (httpsProc as EventEmitter & { stderr: EventEmitter })
      .stderr
    httpsStderr?.emit('data', 'authentication failed')
    httpsProc?.emit('close', 128)

    // Wait for SSH clone to be spawned
    await new Promise(resolve => setTimeout(resolve, 0))

    // Fail the SSH clone
    const sshProc = processes.get(
      'git clone git@github.com:user/repo.git /tmp/test-repo'
    )
    const sshStderr = (sshProc as EventEmitter & { stderr: EventEmitter })
      .stderr
    sshStderr?.emit('data', 'Permission denied (publickey)')
    sshProc?.emit('close', 128)

    const result = await promise
    expect(result).toBe(false)
    expect(context.stderrLines.join('\n')).toContain(
      'Failed to clone test-repo via SSH'
    )
  })

  test('does not attempt SSH fallback when gitSshUrl is not provided', async () => {
    const { spawn, calls, processes } = createMockSpawn()
    const context = createContextEmulator()
    const repo: Repository = {
      name: 'test-repo',
      gitUrl: 'https://github.com/user/repo.git',
      url: 'https://example.com/test-repo',
      id: 6,
    }

    const promise = cloneRepository(repo, '/tmp/test-repo', spawn, context)

    // Fail the HTTPS clone
    const httpsProc = processes.get(
      'git clone https://github.com/user/repo.git /tmp/test-repo'
    )
    const httpsStderr = (httpsProc as EventEmitter & { stderr: EventEmitter })
      .stderr
    httpsStderr?.emit('data', 'authentication failed')
    httpsProc?.emit('close', 128)

    const result = await promise
    expect(result).toBe(false)
    expect(calls.length).toBe(1)
    expect(context.stderrLines.join('\n')).toContain(
      'Failed to clone test-repo: authentication failed'
    )
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
  test('stops when lifecycle is stopping', async () => {
    const { spawn } = createAutoResolvingSpawn()
    const fileSystem = createFileSystemEmulator()

    const repoState: RepositoryState = {
      repository: {
        name: 'repo',
        gitUrl: 'repo',
        url: 'https://example.com/repo',
        id: 1,
      },
      path: '/tmp/repo',
      logBuffer: createLogBuffer(),
      lifecycle: { type: 'stopping' },
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
      repository: {
        name: 'repo',
        gitUrl: 'repo',
        url: 'https://example.com/repo',
        id: 1,
      },
      path: '/tmp/repo',
      logBuffer: createLogBuffer(),
      lifecycle: {
        type: 'running',
        loopPromise: Promise.resolve(),
        cancel: () => {},
      },
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
    await waitFor(() => expect(sleepCalled).toBe(true))

    // Stop on next iteration, then wake up
    repoState.lifecycle = { type: 'stopping' }
    repoState.wakeUp?.()

    await loopPromise

    const logLines = getLogLines(repoState.logBuffer)
    expect(logLines.some(l => l.text.includes('No tasks'))).toBe(true)
  })

  test('skips wait when taskAvailablePending is set', async () => {
    const { spawn } = createAutoResolvingSpawn()
    const fileSystem = createFileSystemEmulator()

    const repoState: RepositoryState = {
      repository: {
        name: 'repo',
        gitUrl: 'repo',
        url: 'https://example.com/repo',
        id: 1,
      },
      path: '/tmp/repo',
      logBuffer: createLogBuffer(),
      lifecycle: {
        type: 'running',
        loopPromise: Promise.resolve(),
        cancel: () => {},
      },
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

    // Wait for sleep to be called, which indicates the loop processed
    // the pending flag and then found no tasks on second iteration
    await waitFor(() => expect(sleepCalled).toBe(true))

    // The flag should have been cleared and the loop should have retried
    expect(repoState.taskAvailablePending).toBeFalsy()

    // Eventually it should reach the wait state (no tasks on second iteration)
    expect(sleepCalled).toBe(true)

    // Clean up
    repoState.lifecycle = { type: 'stopping' }
    repoState.wakeUp?.()
    await loopPromise
  })

  test('wakeUp resolves the wait immediately', async () => {
    const { spawn } = createAutoResolvingSpawn()
    const fileSystem = createFileSystemEmulator()

    const repoState: RepositoryState = {
      repository: {
        name: 'repo',
        gitUrl: 'repo',
        url: 'https://example.com/repo',
        id: 1,
      },
      path: '/tmp/repo',
      logBuffer: createLogBuffer(),
      lifecycle: {
        type: 'running',
        loopPromise: Promise.resolve(),
        cancel: () => {},
      },
      agentStatus: 'idle' as const,
    }

    const repoDeps = createRepositoryDependencies({
      spawn,
      fileSystem,
      sleep: () => new Promise(() => {}),
    })

    const loopPromise = runRepositoryLoop(repoState, repoDeps)

    // Wait for the loop to reach the wait state
    await waitFor(() => expect(repoState.wakeUp).toBeDefined())

    // Wake up the loop, then stop it on the next iteration
    repoState.lifecycle = { type: 'stopping' }
    repoState.wakeUp?.()

    await loopPromise

    const logLines = getLogLines(repoState.logBuffer)
    expect(logLines.some(l => l.text.includes('Stopped loop for repo'))).toBe(
      true
    )
  })

  test('lifecycle cancel aborts an in-flight agent run', async () => {
    const { spawn } = createAutoResolvingSpawn()
    const fileSystem = createFileSystemEmulator({
      // biome-ignore lint: tmp is the /tmp directory name, not an abbreviation
      tmp: {
        repo: {
          '.dust': {
            tasks: {
              'my-task.md': VALID_TASK_CONTENT,
            },
          },
        },
      },
    })

    const repoState: RepositoryState = {
      repository: {
        name: 'repo',
        gitUrl: 'repo',
        url: 'https://example.com/repo',
        id: 1,
      },
      path: '/tmp/repo',
      logBuffer: createLogBuffer(),
      lifecycle: {
        type: 'running',
        loopPromise: Promise.resolve(),
        cancel: () => {},
      },
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

    // The loop should have updated lifecycle with a cancel that aborts current iteration
    if (repoState.lifecycle.type === 'running') {
      repoState.lifecycle.cancel()
    }
    await loopPromise

    expect(signalWasAborted).toBe(true)
  })

  test('stale fallback timeout does not clear a newer wait wakeUp handler', async () => {
    const { spawn } = createAutoResolvingSpawn()
    const fileSystem = createFileSystemEmulator()

    const repoState: RepositoryState = {
      repository: {
        name: 'repo',
        gitUrl: 'repo',
        url: 'https://example.com/repo',
        id: 1,
      },
      path: '/tmp/repo',
      logBuffer: createLogBuffer(),
      lifecycle: {
        type: 'running',
        loopPromise: Promise.resolve(),
        cancel: () => {},
      },
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
    await waitFor(() => {
      expect(repoState.wakeUp).toBeDefined()
      expect(sleepResolvers.length).toBeGreaterThanOrEqual(1)
    })
    const firstWakeUp = repoState.wakeUp

    // Move into second wait state
    firstWakeUp?.()
    await waitFor(() => {
      expect(repoState.wakeUp).toBeDefined()
      expect(sleepResolvers.length).toBeGreaterThanOrEqual(2)
    })
    const secondWakeUp = repoState.wakeUp

    // Resolve the first wait's timeout after second wait is active.
    // This previously cleared the second wakeUp and deadlocked the loop.
    sleepResolvers[0]?.()
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(repoState.wakeUp).toBe(secondWakeUp)

    repoState.lifecycle = { type: 'stopping' }
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
              'my-task.md': VALID_TASK_CONTENT,
            },
          },
        },
      },
    })

    const repoState: RepositoryState = {
      repository: {
        name: 'repo',
        gitUrl: 'repo',
        url: 'https://example.com/repo',
        id: 1,
      },
      path: '/tmp/repo',
      logBuffer: createLogBuffer(),
      lifecycle: {
        type: 'running',
        loopPromise: Promise.resolve(),
        cancel: () => {},
      },
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
          repoState.lifecycle = { type: 'stopping' }
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
              'my-task.md': VALID_TASK_CONTENT,
            },
          },
        },
      },
    })

    const repoState: RepositoryState = {
      repository: {
        name: 'repo',
        gitUrl: 'repo',
        url: 'https://example.com/repo',
        id: 1,
      },
      path: '/tmp/repo',
      logBuffer: createLogBuffer(),
      lifecycle: {
        type: 'running',
        loopPromise: Promise.resolve(),
        cancel: () => {},
      },
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
        repoState.lifecycle = { type: 'stopping' }
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
              'my-task.md': VALID_TASK_CONTENT,
            },
          },
        },
      },
    })

    const repoState: RepositoryState = {
      repository: {
        name: 'repo',
        gitUrl: 'repo',
        url: 'https://example.com/repo',
        id: 1,
      },
      path: '/tmp/repo',
      logBuffer: createLogBuffer(),
      lifecycle: {
        type: 'running',
        loopPromise: Promise.resolve(),
        cancel: () => {},
      },
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
        repoState.lifecycle = { type: 'stopping' }
      },
    })

    await runRepositoryLoop(repoState, repoDeps)

    expect(statusDuringRun).toBe('busy')
    expect(repoState.agentStatus).toBe('idle')
  })
})

describe('startRepositoryLoop', () => {
  test('transitions idle -> starting -> running, then stopped when cancelled', async () => {
    const { spawn } = createAutoResolvingSpawn()
    const fileSystem = createFileSystemEmulator()

    const repoState: RepositoryState = {
      repository: {
        name: 'repo',
        gitUrl: 'repo',
        url: 'https://example.com/repo',
        id: 1,
      },
      path: '/tmp/repo',
      logBuffer: createLogBuffer(),
      lifecycle: { type: 'idle' },
      agentStatus: 'idle',
    }

    const repoDeps = createRepositoryDependencies({
      spawn,
      fileSystem,
      sleep: async () => {
        // Use cancel to properly transition through the state machine
        if (repoState.lifecycle.type === 'running') {
          repoState.lifecycle.cancel()
        }
      },
    })

    startRepositoryLoop(repoState, repoDeps)
    // After startRepositoryLoop, should be in 'running' state (starting -> running happens synchronously)
    expect(repoState.lifecycle.type).toBe('running')

    const runningLifecycle = repoState.lifecycle as {
      type: 'running'
      loopPromise: Promise<void>
    }
    await runningLifecycle.loopPromise

    // When cancelled via state machine, transitions to stopped
    expect(repoState.lifecycle.type).toBe('stopped')
  })

  test('does not start loop when not in idle state', async () => {
    const { spawn } = createAutoResolvingSpawn()
    const fileSystem = createFileSystemEmulator()

    const repoState: RepositoryState = {
      repository: {
        name: 'repo',
        gitUrl: 'repo',
        url: 'https://example.com/repo',
        id: 1,
      },
      path: '/tmp/repo',
      logBuffer: createLogBuffer(),
      lifecycle: { type: 'stopping' }, // Not idle
      agentStatus: 'idle',
    }

    const repoDeps = createRepositoryDependencies({
      spawn,
      fileSystem,
    })

    startRepositoryLoop(repoState, repoDeps)
    // Should remain in 'stopping' state since transition from stopping is invalid
    expect(repoState.lifecycle.type).toBe('stopping')
  })

  test('cancel transitions running -> stopping -> stopped', async () => {
    const { spawn } = createAutoResolvingSpawn()
    const fileSystem = createFileSystemEmulator()

    const repoState: RepositoryState = {
      repository: {
        name: 'repo',
        gitUrl: 'repo',
        url: 'https://example.com/repo',
        id: 1,
      },
      path: '/tmp/repo',
      logBuffer: createLogBuffer(),
      lifecycle: { type: 'idle' },
      agentStatus: 'idle',
    }

    let sleepResolve: (() => void) | undefined
    const repoDeps = createRepositoryDependencies({
      spawn,
      fileSystem,
      sleep: () =>
        new Promise<void>(resolve => {
          sleepResolve = resolve
        }),
    })

    startRepositoryLoop(repoState, repoDeps)
    expect(repoState.lifecycle.type).toBe('running')

    // Wait for loop to reach sleep
    await new Promise(resolve => setTimeout(resolve, 50))

    // Call cancel to transition to stopping
    const runningLifecycle = repoState.lifecycle as {
      type: 'running'
      loopPromise: Promise<void>
      cancel: () => void
    }
    runningLifecycle.cancel()
    expect(repoState.lifecycle.type).toBe('stopping')

    // Wake up the loop to let it exit
    repoState.wakeUp?.()
    sleepResolve?.()
    await runningLifecycle.loopPromise

    // Should transition to stopped since we were in stopping state
    expect(repoState.lifecycle.type).toBe('stopped')
  })

  test('crash handler logs error when runRepositoryLoop rejects', async () => {
    const baseFileSystem = createFileSystemEmulator()
    // Create a fileSystem that throws on exists() to cause runRepositoryLoop
    // to crash before entering its internal try/catch
    const crashingFileSystem = {
      ...baseFileSystem,
      exists: () => {
        throw new Error('FileSystem crashed')
      },
    }

    const repoState: RepositoryState = {
      repository: {
        name: 'crash-repo',
        gitUrl: 'crash-repo',
        url: 'https://example.com/crash-repo',
        id: 1,
      },
      path: '/tmp/crash-repo',
      logBuffer: createLogBuffer(),
      lifecycle: { type: 'idle' },
      agentStatus: 'idle',
    }

    const repoDeps = createRepositoryDependencies({
      fileSystem: crashingFileSystem,
    })

    startRepositoryLoop(repoState, repoDeps)

    // Wait for the promise chain to settle
    const runningLifecycle = repoState.lifecycle as {
      type: 'running'
      loopPromise: Promise<void>
    }
    await runningLifecycle.loopPromise

    // The crash handler should have logged the error to the log buffer
    const logLines = getLogLines(repoState.logBuffer)
    expect(
      logLines.some(
        l => l.stream === 'stderr' && l.text.includes('Repository loop crashed')
      )
    ).toBe(true)
    expect(logLines.some(l => l.text.includes('FileSystem crashed'))).toBe(true)
  })

  test('crash handler handles non-Error thrown values', async () => {
    const baseFileSystem = createFileSystemEmulator()
    // Create a fileSystem that throws a string to exercise the String(error) branch
    const crashingFileSystem = {
      ...baseFileSystem,
      exists: () => {
        throw 'String error thrown'
      },
    }

    const repoState: RepositoryState = {
      repository: {
        name: 'string-crash-repo',
        gitUrl: 'string-crash-repo',
        url: 'https://example.com/string-crash-repo',
        id: 1,
      },
      path: '/tmp/string-crash-repo',
      logBuffer: createLogBuffer(),
      lifecycle: { type: 'idle' },
      agentStatus: 'idle',
    }

    const repoDeps = createRepositoryDependencies({
      fileSystem: crashingFileSystem,
    })

    startRepositoryLoop(repoState, repoDeps)

    // Wait for the promise chain to settle
    const runningLifecycle = repoState.lifecycle as {
      type: 'running'
      loopPromise: Promise<void>
    }
    await runningLifecycle.loopPromise

    // The crash handler should have logged the string error to the log buffer
    const logLines = getLogLines(repoState.logBuffer)
    expect(logLines.some(l => l.text.includes('String error thrown'))).toBe(
      true
    )
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

  test('updates agentProvider on existing repository', async () => {
    const context = createContextEmulator()
    const manager = createMockManager()
    const repoDeps = createRepositoryDependencies({
      sleep: () => Promise.resolve(),
    })

    // Pre-populate manager with a repo that has no agentProvider
    manager.repositories.set('user/repo', {
      repository: {
        name: 'user/repo',
        gitUrl: 'https://github.com/user/repo.git',
        url: 'https://example.com/user/repo',
        id: 1,
      },
      path: '/tmp/user/repo',
      logBuffer: { lines: [], maxLines: 100, trimToLines: 60 },
      lifecycle: { type: 'idle' },
      agentStatus: 'idle',
    } as RepositoryState)

    await handleRepositoryList(
      [
        {
          name: 'user/repo',
          gitUrl: 'https://github.com/user/repo.git',
          url: 'https://example.com/user/repo',
          id: 1,
          agentProvider: 'codex',
        },
      ],
      manager,
      repoDeps,
      context
    )

    expect(
      manager.repositories.get('user/repo')?.repository.agentProvider
    ).toBe('codex')

    // Send same agentProvider again — should not change
    await handleRepositoryList(
      [
        {
          name: 'user/repo',
          gitUrl: 'https://github.com/user/repo.git',
          url: 'https://example.com/user/repo',
          id: 1,
          agentProvider: 'codex',
        },
      ],
      manager,
      repoDeps,
      context
    )

    expect(
      manager.repositories.get('user/repo')?.repository.agentProvider
    ).toBe('codex')
  })

  test('updates agentProvider to undefined when removed', async () => {
    const context = createContextEmulator()
    const manager = createMockManager()
    const repoDeps = createRepositoryDependencies({
      sleep: () => Promise.resolve(),
    })

    manager.repositories.set('user/repo', {
      repository: {
        name: 'user/repo',
        gitUrl: 'https://github.com/user/repo.git',
        url: 'https://example.com/user/repo',
        id: 1,
        agentProvider: 'codex',
      },
      path: '/tmp/user/repo',
      logBuffer: { lines: [], maxLines: 100, trimToLines: 60 },
      lifecycle: { type: 'idle' },
      agentStatus: 'idle',
    } as RepositoryState)

    await handleRepositoryList(
      [
        {
          name: 'user/repo',
          gitUrl: 'https://github.com/user/repo.git',
          url: 'https://example.com/user/repo',
          id: 1,
        },
      ],
      manager,
      repoDeps,
      context
    )

    expect(
      manager.repositories.get('user/repo')?.repository.agentProvider
    ).toBeUndefined()
  })

  test('updates agentProvider between named providers', async () => {
    const context = createContextEmulator()
    const manager = createMockManager()
    const repoDeps = createRepositoryDependencies({
      sleep: () => Promise.resolve(),
    })

    manager.repositories.set('user/repo', {
      repository: {
        name: 'user/repo',
        gitUrl: 'https://github.com/user/repo.git',
        url: 'https://example.com/user/repo',
        id: 1,
        agentProvider: 'claude',
      },
      path: '/tmp/user/repo',
      logBuffer: { lines: [], maxLines: 100, trimToLines: 60 },
      lifecycle: { type: 'idle' },
      agentStatus: 'idle',
    } as RepositoryState)

    await handleRepositoryList(
      [
        {
          name: 'user/repo',
          gitUrl: 'https://github.com/user/repo.git',
          url: 'https://example.com/user/repo',
          id: 1,
          agentProvider: 'codex',
        },
      ],
      manager,
      repoDeps,
      context
    )

    expect(
      manager.repositories.get('user/repo')?.repository.agentProvider
    ).toBe('codex')
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
          repoState.lifecycle = { type: 'stopping' }
        }
      },
    })

    const handlePromise = handleRepositoryList(
      [
        {
          name: 'repo1',
          gitUrl: 'https://github.com/user/repo1.git',
          url: 'https://example.com/repo1',
          id: 1,
        },
      ],
      manager,
      repoDeps,
      context
    )

    // Wait for clone to be spawned
    await new Promise(resolve => setTimeout(resolve, 0))

    const cloneProc = processes.get(
      'git clone https://github.com/user/repo1.git /tmp/repo1'
    )
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
      repository: {
        name: 'old-repo',
        gitUrl: 'old-repo',
        url: 'https://example.com/old-repo',
        id: 99,
      },
      path: '/tmp/old-repo',
      lifecycle: {
        type: 'running',
        loopPromise: Promise.resolve(),
        cancel: () => {},
      },
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

  test('removes idle repositories and calls wakeUp', async () => {
    const context = createContextEmulator()
    const manager = createMockManager()
    const { spawn, processes } = createMockSpawn()

    let wakeUpCalled = false
    manager.repositories.set('idle-repo', {
      repository: {
        name: 'idle-repo',
        gitUrl: 'idle-repo',
        url: 'https://example.com/idle-repo',
        id: 99,
      },
      path: '/tmp/idle-repo',
      lifecycle: { type: 'idle' },
      logBuffer: createLogBuffer(),
      agentStatus: 'idle' as const,
      wakeUp: () => {
        wakeUpCalled = true
      },
    })

    const repoDeps = createRepositoryDependencies({
      spawn,
      sleep: () => Promise.resolve(),
    })

    const handlePromise = handleRepositoryList([], manager, repoDeps, context)

    await new Promise(resolve => setTimeout(resolve, 0))

    const rmProc = processes.get('rm -rf /tmp/idle-repo')
    rmProc?.emit('close', 0)

    await handlePromise

    expect(manager.repositories.size).toBe(0)
    expect(wakeUpCalled).toBe(true)
  })
})

describe('addRepository', () => {
  test('skips if repository already exists', async () => {
    const context = createContextEmulator()
    const manager = createMockManager()

    manager.repositories.set('repo', {
      repository: {
        name: 'repo',
        gitUrl: 'repo',
        url: 'https://example.com/repo',
        id: 1,
      },
      path: '/tmp/repo',
      lifecycle: { type: 'idle' },
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
      { name: 'repo', gitUrl: 'repo', url: 'https://example.com/repo', id: 1 },
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
          repoState.lifecycle = { type: 'stopping' }
        }
      },
    })

    const addPromise = addRepository(
      {
        name: 'stale-repo',
        gitUrl: 'stale-repo',
        url: 'https://example.com/stale-repo',
        id: 1,
      },
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
      {
        name: 'fail-repo',
        gitUrl: 'bad-url',
        url: 'https://example.com/fail-repo',
        id: 2,
      },
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

  test('transitions running -> stopping -> stopped when removing running repository', async () => {
    const context = createContextEmulator()
    const manager = createMockManager()
    const { spawn, processes } = createMockSpawn()

    let loopResolve: (() => void) | undefined
    const loopPromise = new Promise<void>(resolve => {
      loopResolve = resolve
    })

    const stateHistory: string[] = []
    const repoState: RepositoryState = {
      repository: {
        name: 'running-repo',
        gitUrl: 'running-repo',
        url: 'https://example.com/running-repo',
        id: 1,
      },
      path: '/tmp/running-repo',
      lifecycle: {
        type: 'running',
        loopPromise,
        cancel: () => {
          stateHistory.push('cancel called')
        },
      },
      logBuffer: createLogBuffer(),
      agentStatus: 'idle' as const,
      wakeUp: () => {
        stateHistory.push('wakeUp called')
        loopResolve?.()
      },
    }
    manager.repositories.set('running-repo', repoState)

    const repoDeps = createRepositoryDependencies({
      spawn,
      sleep: () => Promise.resolve(),
    })

    const removePromise = removeRepositoryFromManager(
      'running-repo',
      manager,
      repoDeps,
      context
    )

    await new Promise(resolve => setTimeout(resolve, 0))

    const rmProc = processes.get('rm -rf /tmp/running-repo')
    rmProc?.emit('close', 0)

    await removePromise

    expect(stateHistory).toContain('cancel called')
    expect(stateHistory).toContain('wakeUp called')
    expect(manager.repositories.has('running-repo')).toBe(false)
  })

  test('transitions idle repository using state machine stop action', async () => {
    const context = createContextEmulator()
    const manager = createMockManager()
    const { spawn, processes } = createMockSpawn()

    const repoState: RepositoryState = {
      repository: {
        name: 'idle-repo',
        gitUrl: 'idle-repo',
        url: 'https://example.com/idle-repo',
        id: 1,
      },
      path: '/tmp/idle-repo',
      lifecycle: { type: 'stopping' }, // In stopping state (not idle, not running)
      logBuffer: createLogBuffer(),
      agentStatus: 'idle' as const,
    }
    manager.repositories.set('idle-repo', repoState)

    const repoDeps = createRepositoryDependencies({
      spawn,
      sleep: () => Promise.resolve(),
    })

    const removePromise = removeRepositoryFromManager(
      'idle-repo',
      manager,
      repoDeps,
      context
    )

    await new Promise(resolve => setTimeout(resolve, 0))

    const rmProc = processes.get('rm -rf /tmp/idle-repo')
    rmProc?.emit('close', 0)

    await removePromise

    // Should have transitioned stopping -> idle via the stop action
    expect(manager.repositories.has('idle-repo')).toBe(false)
  })
})
