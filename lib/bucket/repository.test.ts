import { EventEmitter } from 'node:events'
import { describe, expect, test } from 'vitest'
import {
  createContextEmulator,
  createFileSystemEmulator,
  createTestAuthConfig,
  createTestRuntimeConfig,
  createTestSessionConfig,
  waitFor,
} from '../test-support/test-utilities'
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
  computeRepositoryReconciliation,
  createDefaultRepositoryDependencies,
  createLoopCancel,
  getRepoPath,
  handleLoopFinished,
  handleRepositoryList,
  parseRepository,
  parseRepositoryList,
  type Repository,
  type RepositoryDependencies,
  type RepositoryManager,
  type RepositoryState,
  removeRepository,
  removeRepositoryFromManager,
  runRepositoryLoop,
  shouldRecloneForBranchChange,
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

function createTestRepositoryDependencies(
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
    shellRunner: { run: async () => ({ exitCode: 0, output: '' }) },
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

function createTestRepo(
  name: string,
  overrides: Partial<Repository> = {}
): Repository {
  return {
    name,
    gitUrl: `https://github.com/user/${name}.git`,
    gitSshUrl: `git@github.com:user/${name}.git`,
    url: `https://example.com/${name}`,
    id: 1,
    ...overrides,
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

  test('sleep resolves after delay', async () => {
    const fileSystem = createFileSystemEmulator()
    const repoDeps = createDefaultRepositoryDependencies(fileSystem)
    await repoDeps.sleep(1)
  })

  test('getReposDir returns a path', () => {
    const fileSystem = createFileSystemEmulator()
    const repoDeps = createDefaultRepositoryDependencies(fileSystem)
    const dir = repoDeps.getReposDir()
    expect(typeof dir).toBe('string')
    expect(dir.length).toBeGreaterThan(0)
  })
})

describe('parseRepository', () => {
  test('parses object with all required fields', () => {
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
      branch: undefined,
    })
  })

  test('parses object with branch', () => {
    const repo = parseRepository({
      name: 'my-repo',
      gitUrl: 'https://github.com/user/repo.git',
      gitSshUrl: 'git@github.com:user/repo.git',
      url: 'https://example.com/my-repo',
      id: 123,
      branch: 'develop',
    })
    expect(repo).toEqual({
      name: 'my-repo',
      gitUrl: 'https://github.com/user/repo.git',
      gitSshUrl: 'git@github.com:user/repo.git',
      url: 'https://example.com/my-repo',
      id: 123,
      branch: 'develop',
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

  test('returns null when gitSshUrl is missing', () => {
    expect(
      parseRepository({
        name: 'my-repo',
        gitUrl: 'https://github.com/user/repo.git',
        url: 'https://example.com/my-repo',
        id: 123,
      })
    ).toBeNull()
  })

  test('returns null when url is missing or invalid', () => {
    expect(
      parseRepository({
        name: 'my-repo',
        gitUrl: 'https://github.com/user/repo.git',
        gitSshUrl: 'git@github.com:user/repo.git',
        id: 123,
      })
    ).toBeNull()
    expect(
      parseRepository({
        name: 'my-repo',
        gitUrl: 'https://github.com/user/repo.git',
        gitSshUrl: 'git@github.com:user/repo.git',
        id: 123,
        url: 123,
      })
    ).toBeNull()
  })

  test('parses object with agentProvider', () => {
    const repo = parseRepository({
      name: 'my-repo',
      gitUrl: 'https://github.com/user/repo.git',
      gitSshUrl: 'git@github.com:user/repo.git',
      url: 'https://example.com/my-repo',
      id: 123,
      agentProvider: 'codex',
    })
    expect(repo).toEqual({
      name: 'my-repo',
      gitUrl: 'https://github.com/user/repo.git',
      gitSshUrl: 'git@github.com:user/repo.git',
      url: 'https://example.com/my-repo',
      id: 123,
      agentProvider: 'codex',
      branch: undefined,
    })
  })

  test('returns null when id is missing or invalid', () => {
    expect(
      parseRepository({
        name: 'my-repo',
        gitUrl: 'https://github.com/user/repo.git',
        gitSshUrl: 'git@github.com:user/repo.git',
        url: 'https://example.com/my-repo',
      })
    ).toBeNull()
    expect(
      parseRepository({
        name: 'my-repo',
        gitUrl: 'https://github.com/user/repo.git',
        gitSshUrl: 'git@github.com:user/repo.git',
        url: 'https://example.com/my-repo',
        id: 'not-a-number',
      })
    ).toBeNull()
  })
})

describe('shouldRecloneForBranchChange', () => {
  test('returns false when both branches are undefined', () => {
    const existing: Repository = {
      name: 'repo',
      gitUrl: 'url',
      gitSshUrl: 'ssh-url',
      url: 'https://example.com',
      id: 1,
    }
    const incoming: Repository = {
      name: 'repo',
      gitUrl: 'url',
      gitSshUrl: 'ssh-url',
      url: 'https://example.com',
      id: 1,
    }
    expect(shouldRecloneForBranchChange(existing, incoming)).toBe(false)
  })

  test('returns false when branches are the same', () => {
    const existing: Repository = {
      name: 'repo',
      gitUrl: 'url',
      gitSshUrl: 'ssh-url',
      url: 'https://example.com',
      id: 1,
      branch: 'develop',
    }
    const incoming: Repository = {
      name: 'repo',
      gitUrl: 'url',
      gitSshUrl: 'ssh-url',
      url: 'https://example.com',
      id: 1,
      branch: 'develop',
    }
    expect(shouldRecloneForBranchChange(existing, incoming)).toBe(false)
  })

  test('returns true when branch changes from undefined to defined', () => {
    const existing: Repository = {
      name: 'repo',
      gitUrl: 'url',
      gitSshUrl: 'ssh-url',
      url: 'https://example.com',
      id: 1,
    }
    const incoming: Repository = {
      name: 'repo',
      gitUrl: 'url',
      gitSshUrl: 'ssh-url',
      url: 'https://example.com',
      id: 1,
      branch: 'develop',
    }
    expect(shouldRecloneForBranchChange(existing, incoming)).toBe(true)
  })

  test('returns true when branch changes from defined to undefined', () => {
    const existing: Repository = {
      name: 'repo',
      gitUrl: 'url',
      gitSshUrl: 'ssh-url',
      url: 'https://example.com',
      id: 1,
      branch: 'develop',
    }
    const incoming: Repository = {
      name: 'repo',
      gitUrl: 'url',
      gitSshUrl: 'ssh-url',
      url: 'https://example.com',
      id: 1,
    }
    expect(shouldRecloneForBranchChange(existing, incoming)).toBe(true)
  })

  test('returns true when branch changes to different value', () => {
    const existing: Repository = {
      name: 'repo',
      gitUrl: 'url',
      gitSshUrl: 'ssh-url',
      url: 'https://example.com',
      id: 1,
      branch: 'develop',
    }
    const incoming: Repository = {
      name: 'repo',
      gitUrl: 'url',
      gitSshUrl: 'ssh-url',
      url: 'https://example.com',
      id: 1,
      branch: 'staging',
    }
    expect(shouldRecloneForBranchChange(existing, incoming)).toBe(true)
  })
})

describe('parseRepositoryList', () => {
  test('parses array of valid repository objects', () => {
    const result = parseRepositoryList([
      {
        name: 'repo1',
        gitUrl: 'https://github.com/user/repo1.git',
        gitSshUrl: 'git@github.com:user/repo1.git',
        url: 'https://example.com/repo1',
        id: 1,
      },
      {
        name: 'repo2',
        gitUrl: 'https://github.com/user/repo2.git',
        gitSshUrl: 'git@github.com:user/repo2.git',
        url: 'https://example.com/repo2',
        id: 2,
      },
    ])
    expect(result.size).toBe(2)
    expect(result.get('repo1')?.gitUrl).toBe(
      'https://github.com/user/repo1.git'
    )
    expect(result.get('repo2')?.gitUrl).toBe(
      'https://github.com/user/repo2.git'
    )
  })

  test('filters out invalid entries', () => {
    const result = parseRepositoryList([
      { invalid: 'data' },
      null,
      {
        name: 'valid',
        gitUrl: 'url',
        gitSshUrl: 'ssh-url',
        url: 'https://example.com',
        id: 1,
      },
      123,
    ])
    expect(result.size).toBe(1)
    expect(result.has('valid')).toBe(true)
  })

  test('returns empty map for empty array', () => {
    const result = parseRepositoryList([])
    expect(result.size).toBe(0)
  })
})

describe('computeRepositoryReconciliation', () => {
  test('returns add action for new repository', () => {
    const existing = new Map<string, Repository>()
    const incoming = new Map<string, Repository>([
      ['new-repo', createTestRepo('new-repo')],
    ])

    const actions = computeRepositoryReconciliation(existing, incoming)

    expect(actions).toHaveLength(1)
    expect(actions[0]).toEqual({
      type: 'add',
      repository: createTestRepo('new-repo'),
    })
  })

  test('returns remove action for missing repository', () => {
    const existing = new Map<string, Repository>([
      ['old-repo', createTestRepo('old-repo')],
    ])
    const incoming = new Map<string, Repository>()

    const actions = computeRepositoryReconciliation(existing, incoming)

    expect(actions).toHaveLength(1)
    expect(actions[0]).toEqual({
      type: 'remove',
      name: 'old-repo',
    })
  })

  test('returns reclone action when branch changes', () => {
    const existing = new Map<string, Repository>([
      ['repo', createTestRepo('repo', { branch: 'main' })],
    ])
    const incoming = new Map<string, Repository>([
      ['repo', createTestRepo('repo', { branch: 'develop' })],
    ])

    const actions = computeRepositoryReconciliation(existing, incoming)

    expect(actions).toHaveLength(1)
    expect(actions[0]).toEqual({
      type: 'reclone',
      name: 'repo',
      repository: createTestRepo('repo', { branch: 'develop' }),
      reason: 'branch changed from main to develop',
    })
  })

  test('returns reclone action when branch changes from undefined to defined', () => {
    const existing = new Map<string, Repository>([
      ['repo', createTestRepo('repo')],
    ])
    const incoming = new Map<string, Repository>([
      ['repo', createTestRepo('repo', { branch: 'feature' })],
    ])

    const actions = computeRepositoryReconciliation(existing, incoming)

    expect(actions).toHaveLength(1)
    expect(actions[0]).toEqual({
      type: 'reclone',
      name: 'repo',
      repository: createTestRepo('repo', { branch: 'feature' }),
      reason: 'branch changed from (default) to feature',
    })
  })

  test('returns updateProvider action when provider changes', () => {
    const existing = new Map<string, Repository>([
      ['repo', createTestRepo('repo', { agentProvider: 'claude' })],
    ])
    const incoming = new Map<string, Repository>([
      ['repo', createTestRepo('repo', { agentProvider: 'codex' })],
    ])

    const actions = computeRepositoryReconciliation(existing, incoming)

    expect(actions).toHaveLength(1)
    expect(actions[0]).toEqual({
      type: 'updateProvider',
      name: 'repo',
      newProvider: 'codex',
    })
  })

  test('returns updateProvider action when provider is removed', () => {
    const existing = new Map<string, Repository>([
      ['repo', createTestRepo('repo', { agentProvider: 'claude' })],
    ])
    const incoming = new Map<string, Repository>([
      ['repo', createTestRepo('repo')],
    ])

    const actions = computeRepositoryReconciliation(existing, incoming)

    expect(actions).toHaveLength(1)
    expect(actions[0]).toEqual({
      type: 'updateProvider',
      name: 'repo',
      newProvider: undefined,
    })
  })

  test('returns no actions when repositories are identical', () => {
    const repo = createTestRepo('repo', {
      branch: 'main',
      agentProvider: 'claude',
    })
    const existing = new Map<string, Repository>([['repo', repo]])
    const incoming = new Map<string, Repository>([['repo', { ...repo }]])

    const actions = computeRepositoryReconciliation(existing, incoming)

    expect(actions).toHaveLength(0)
  })

  test('handles multiple actions for complex reconciliation', () => {
    const existing = new Map<string, Repository>([
      ['keep', createTestRepo('keep')],
      ['remove-me', createTestRepo('remove-me')],
      ['reclone-me', createTestRepo('reclone-me', { branch: 'old' })],
      ['update-me', createTestRepo('update-me', { agentProvider: 'old' })],
    ])
    const incoming = new Map<string, Repository>([
      ['keep', createTestRepo('keep')],
      ['add-me', createTestRepo('add-me')],
      ['reclone-me', createTestRepo('reclone-me', { branch: 'new' })],
      ['update-me', createTestRepo('update-me', { agentProvider: 'new' })],
    ])

    const actions = computeRepositoryReconciliation(existing, incoming)

    expect(actions).toHaveLength(4)

    const actionTypes = actions.map(
      a => `${a.type}:${a.type === 'add' ? a.repository.name : a.name}`
    )
    expect(actionTypes).toContain('add:add-me')
    expect(actionTypes).toContain('remove:remove-me')
    expect(actionTypes).toContain('reclone:reclone-me')
    expect(actionTypes).toContain('updateProvider:update-me')
  })

  test('prioritizes reclone over updateProvider when both branch and provider change', () => {
    const existing = new Map<string, Repository>([
      ['repo', createTestRepo('repo', { branch: 'old', agentProvider: 'old' })],
    ])
    const incoming = new Map<string, Repository>([
      ['repo', createTestRepo('repo', { branch: 'new', agentProvider: 'new' })],
    ])

    const actions = computeRepositoryReconciliation(existing, incoming)

    // Should only return reclone since branch takes priority
    expect(actions).toHaveLength(1)
    expect(actions[0].type).toBe('reclone')
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
      gitSshUrl: 'git@github.com:user/repo.git',
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
      gitSshUrl: 'invalid-ssh-url',
      url: 'https://example.com/test-repo',
      id: 2,
    }

    const promise = cloneRepository(repo, '/tmp/test-repo', spawn, context)

    // HTTPS clone fails
    const httpsProc = processes.get('git clone invalid-url /tmp/test-repo')
    const httpsStderr = (httpsProc as EventEmitter & { stderr: EventEmitter })
      .stderr
    httpsStderr?.emit('data', 'fatal: not a git repository')
    httpsProc?.emit('close', 128)

    // Wait for SSH fallback attempt
    await new Promise(resolve => setTimeout(resolve, 0))

    // SSH clone also fails
    const sshProc = processes.get('git clone invalid-ssh-url /tmp/test-repo')
    const sshStderr = (sshProc as EventEmitter & { stderr: EventEmitter })
      .stderr
    sshStderr?.emit('data', 'SSH authentication failed')
    sshProc?.emit('close', 128)

    const result = await promise
    expect(result).toBe(false)
    expect(context.stderrLines.join('\n')).toContain(
      'Failed to clone test-repo via SSH'
    )
  })

  test('handles spawn error', async () => {
    const { spawn, processes } = createMockSpawn()
    const context = createContextEmulator()
    const repo: Repository = {
      name: 'test-repo',
      gitUrl: 'url',
      gitSshUrl: 'ssh-url',
      url: 'https://example.com/test-repo',
      id: 3,
    }

    const promise = cloneRepository(repo, '/tmp/test-repo', spawn, context)

    // HTTPS clone fails with spawn error
    const httpsProc = processes.get('git clone url /tmp/test-repo')
    httpsProc?.emit('error', new Error('spawn failed'))

    // Wait for SSH fallback attempt
    await new Promise(resolve => setTimeout(resolve, 0))

    // SSH clone also fails
    const sshProc = processes.get('git clone ssh-url /tmp/test-repo')
    sshProc?.emit('error', new Error('SSH spawn failed'))

    const result = await promise
    expect(result).toBe(false)
    expect(context.stderrLines.join('\n')).toContain('SSH spawn failed')
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

  test('passes branch flag to git clone when branch is specified', async () => {
    const { spawn, calls, processes } = createMockSpawn()
    const context = createContextEmulator()
    const repo: Repository = {
      name: 'test-repo',
      gitUrl: 'https://github.com/user/repo.git',
      gitSshUrl: 'git@github.com:user/repo.git',
      url: 'https://example.com/test-repo',
      id: 7,
      branch: 'develop',
    }

    const promise = cloneRepository(repo, '/tmp/test-repo', spawn, context)

    const proc = processes.get(
      'git clone --branch develop https://github.com/user/repo.git /tmp/test-repo'
    )
    proc?.emit('close', 0)

    const result = await promise
    expect(result).toBe(true)
    expect(calls[0].command).toBe('git')
    expect(calls[0].spawnArguments).toEqual([
      'clone',
      '--branch',
      'develop',
      'https://github.com/user/repo.git',
      '/tmp/test-repo',
    ])
  })

  test('passes branch flag to SSH fallback when branch is specified', async () => {
    const { spawn, calls, processes } = createMockSpawn()
    const context = createContextEmulator()
    const repo: Repository = {
      name: 'test-repo',
      gitUrl: 'https://github.com/user/repo.git',
      gitSshUrl: 'git@github.com:user/repo.git',
      url: 'https://example.com/test-repo',
      id: 8,
      branch: 'feature/test',
    }

    const promise = cloneRepository(repo, '/tmp/test-repo', spawn, context)

    // Fail the HTTPS clone
    const httpsProc = processes.get(
      'git clone --branch feature/test https://github.com/user/repo.git /tmp/test-repo'
    )
    const httpsStderr = (httpsProc as EventEmitter & { stderr: EventEmitter })
      .stderr
    httpsStderr?.emit('data', 'authentication failed')
    httpsProc?.emit('close', 128)

    // Wait for SSH clone to be spawned
    await new Promise(resolve => setTimeout(resolve, 0))

    // Succeed the SSH clone
    const sshProc = processes.get(
      'git clone --branch feature/test git@github.com:user/repo.git /tmp/test-repo'
    )
    sshProc?.emit('close', 0)

    const result = await promise
    expect(result).toBe(true)
    expect(calls.length).toBe(2)
    expect(calls[1].spawnArguments).toEqual([
      'clone',
      '--branch',
      'feature/test',
      'git@github.com:user/repo.git',
      '/tmp/test-repo',
    ])
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
        gitSshUrl: 'ssh-repo',
        url: 'https://example.com/repo',
        id: 1,
      },
      path: '/tmp/repo',
      logBuffer: createLogBuffer(),
      lifecycle: { type: 'stopping' },
      agentStatus: 'idle' as const,
    }

    const repoDeps = createTestRepositoryDependencies({
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
        gitSshUrl: 'ssh-repo',
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
    const repoDeps = createTestRepositoryDependencies({
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
        gitSshUrl: 'git@example.com:repo.git',
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
    const repoDeps = createTestRepositoryDependencies({
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
        gitSshUrl: 'ssh-repo',
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

    const repoDeps = createTestRepositoryDependencies({
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
        gitSshUrl: 'ssh-repo',
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

    const repoDeps = createTestRepositoryDependencies({
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
        gitSshUrl: 'ssh-repo',
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
    const repoDeps = createTestRepositoryDependencies({
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
        gitSshUrl: 'ssh-repo',
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

    const repoDeps = createTestRepositoryDependencies({
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
        gitSshUrl: 'ssh-repo',
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

    const repoDeps = createTestRepositoryDependencies({
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
        gitSshUrl: 'ssh-repo',
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

    const repoDeps = createTestRepositoryDependencies({
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

describe('handleLoopFinished', () => {
  test('transitions stopping -> stopped', () => {
    const repoState: RepositoryState = {
      repository: {
        name: 'repo',
        gitUrl: 'repo',
        gitSshUrl: 'ssh-repo',
        url: 'https://example.com/repo',
        id: 1,
      },
      path: '/tmp/repo',
      logBuffer: createLogBuffer(),
      lifecycle: { type: 'stopping' },
      agentStatus: 'busy',
      wakeUp: () => {},
    }

    handleLoopFinished(repoState)

    expect(repoState.lifecycle.type).toBe('stopped')
    expect(repoState.agentStatus).toBe('idle')
    expect(repoState.wakeUp).toBeUndefined()
  })

  test('transitions non-stopping state to idle', () => {
    const repoState: RepositoryState = {
      repository: {
        name: 'repo',
        gitUrl: 'repo',
        gitSshUrl: 'ssh-repo',
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
      agentStatus: 'busy',
      wakeUp: () => {},
    }

    handleLoopFinished(repoState)

    expect(repoState.lifecycle.type).toBe('idle')
    expect(repoState.agentStatus).toBe('idle')
    expect(repoState.wakeUp).toBeUndefined()
  })
})

describe('createLoopCancel', () => {
  test('transitions running -> stopping', () => {
    const repoState: RepositoryState = {
      repository: {
        name: 'repo',
        gitUrl: 'repo',
        gitSshUrl: 'ssh-repo',
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
      agentStatus: 'idle',
    }

    const cancel = createLoopCancel(repoState)
    cancel()

    expect(repoState.lifecycle.type).toBe('stopping')
  })

  test('handles stop transition failure gracefully', () => {
    const repoState: RepositoryState = {
      repository: {
        name: 'repo',
        gitUrl: 'repo',
        gitSshUrl: 'ssh-repo',
        url: 'https://example.com/repo',
        id: 1,
      },
      path: '/tmp/repo',
      logBuffer: createLogBuffer(),
      lifecycle: { type: 'idle' },
      agentStatus: 'idle',
    }

    const cancel = createLoopCancel(repoState)
    // Stop from idle fails (ok: false), exercising the else branch
    cancel()

    // State should remain idle since transition failed
    expect(repoState.lifecycle.type).toBe('idle')
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
        gitSshUrl: 'ssh-repo',
        url: 'https://example.com/repo',
        id: 1,
      },
      path: '/tmp/repo',
      logBuffer: createLogBuffer(),
      lifecycle: { type: 'idle' },
      agentStatus: 'idle',
    }

    const repoDeps = createTestRepositoryDependencies({
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
        gitSshUrl: 'git@example.com:repo.git',
        url: 'https://example.com/repo',
        id: 1,
      },
      path: '/tmp/repo',
      logBuffer: createLogBuffer(),
      lifecycle: { type: 'stopping' }, // Not idle
      agentStatus: 'idle',
    }

    const repoDeps = createTestRepositoryDependencies({
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
        gitSshUrl: 'ssh-repo',
        url: 'https://example.com/repo',
        id: 1,
      },
      path: '/tmp/repo',
      logBuffer: createLogBuffer(),
      lifecycle: { type: 'idle' },
      agentStatus: 'idle',
    }

    let sleepResolve: (() => void) | undefined
    let sleepCalled = false
    const repoDeps = createTestRepositoryDependencies({
      spawn,
      fileSystem,
      sleep: () =>
        new Promise<void>(resolve => {
          sleepCalled = true
          sleepResolve = resolve
        }),
    })

    startRepositoryLoop(repoState, repoDeps)
    expect(repoState.lifecycle.type).toBe('running')

    // Wait for loop to reach sleep
    await waitFor(() => expect(sleepCalled).toBe(true))

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
        gitSshUrl: 'ssh-crash-repo',
        url: 'https://example.com/crash-repo',
        id: 1,
      },
      path: '/tmp/crash-repo',
      logBuffer: createLogBuffer(),
      lifecycle: { type: 'idle' },
      agentStatus: 'idle',
    }

    const repoDeps = createTestRepositoryDependencies({
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
        gitSshUrl: 'ssh-string-crash-repo',
        url: 'https://example.com/string-crash-repo',
        id: 1,
      },
      path: '/tmp/string-crash-repo',
      logBuffer: createLogBuffer(),
      lifecycle: { type: 'idle' },
      agentStatus: 'idle',
    }

    const repoDeps = createTestRepositoryDependencies({
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
    const repoDeps = createTestRepositoryDependencies({
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
    const repoDeps = createTestRepositoryDependencies({
      sleep: () => Promise.resolve(),
    })

    // Pre-populate manager with a repo that has no agentProvider
    manager.repositories.set('user/repo', {
      repository: {
        name: 'user/repo',
        gitUrl: 'https://github.com/user/repo.git',
        gitSshUrl: 'git@github.com:user/repo.git',
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
          gitSshUrl: 'git@github.com:user/repo.git',
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
          gitSshUrl: 'git@github.com:user/repo.git',
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
    const repoDeps = createTestRepositoryDependencies({
      sleep: () => Promise.resolve(),
    })

    manager.repositories.set('user/repo', {
      repository: {
        name: 'user/repo',
        gitUrl: 'https://github.com/user/repo.git',
        gitSshUrl: 'git@github.com:user/repo.git',
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
          gitSshUrl: 'git@github.com:user/repo.git',
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
    const repoDeps = createTestRepositoryDependencies({
      sleep: () => Promise.resolve(),
    })

    manager.repositories.set('user/repo', {
      repository: {
        name: 'user/repo',
        gitUrl: 'https://github.com/user/repo.git',
        gitSshUrl: 'git@github.com:user/repo.git',
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
          gitSshUrl: 'git@github.com:user/repo.git',
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

    const repoDeps = createTestRepositoryDependencies({
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
          gitSshUrl: 'git@github.com:user/repo1.git',
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
        gitSshUrl: 'ssh-old-repo',
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

    const repoDeps = createTestRepositoryDependencies({
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
        gitSshUrl: 'ssh-idle-repo',
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

    const repoDeps = createTestRepositoryDependencies({
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

  test('re-clones repository when branch changes', async () => {
    const context = createContextEmulator()
    const manager = createMockManager()
    const { spawn: manualSpawn, processes } = createMockSpawn()
    const { spawn: autoSpawn } = createAutoResolvingSpawn()

    const combinedSpawn = ((
      command: string,
      spawnArguments: string[],
      options?: unknown
    ) => {
      if (command === 'git' && spawnArguments[0] === 'clone') {
        return manualSpawn(command, spawnArguments, options as never)
      }
      return autoSpawn(command, spawnArguments, options as never)
    }) as RepositoryDependencies['spawn']

    // Pre-populate with a repo on the default branch
    manager.repositories.set('user/repo', {
      repository: {
        name: 'user/repo',
        gitUrl: 'https://github.com/user/repo.git',
        gitSshUrl: 'git@github.com:user/repo.git',
        url: 'https://example.com/user/repo',
        id: 1,
        branch: undefined,
      },
      path: '/tmp/user/repo',
      logBuffer: createLogBuffer(),
      lifecycle: { type: 'idle' },
      agentStatus: 'idle',
    } as RepositoryState)

    const repoDeps = createTestRepositoryDependencies({
      spawn: combinedSpawn,
      sleep: async () => {
        for (const repoState of manager.repositories.values()) {
          repoState.lifecycle = { type: 'stopping' }
        }
      },
    })

    // Send a repo list with same repo but different branch
    const handlePromise = handleRepositoryList(
      [
        {
          name: 'user/repo',
          gitUrl: 'https://github.com/user/repo.git',
          gitSshUrl: 'git@github.com:user/repo.git',
          url: 'https://example.com/user/repo',
          id: 1,
          branch: 'develop',
        },
      ],
      manager,
      repoDeps,
      context
    )

    // Wait for rm to be spawned (removal of existing repo)
    await new Promise(resolve => setTimeout(resolve, 0))
    const rmProc = processes.get('rm -rf /tmp/user/repo')
    rmProc?.emit('close', 0)

    // Wait for clone to be spawned with new branch
    await new Promise(resolve => setTimeout(resolve, 0))
    const cloneProc = processes.get(
      'git clone --branch develop https://github.com/user/repo.git /tmp/user/repo'
    )
    cloneProc?.emit('close', 0)

    // Wake the loop
    for (const repoState of manager.repositories.values()) {
      repoState.wakeUp?.()
    }

    await handlePromise

    expect(manager.repositories.size).toBe(1)
    expect(manager.repositories.get('user/repo')?.repository.branch).toBe(
      'develop'
    )
  })

  test('re-clones repository when branch changes to default', async () => {
    const context = createContextEmulator()
    const manager = createMockManager()
    const { spawn: manualSpawn, processes } = createMockSpawn()
    const { spawn: autoSpawn } = createAutoResolvingSpawn()

    const combinedSpawn = ((
      command: string,
      spawnArguments: string[],
      options?: unknown
    ) => {
      if (command === 'git' && spawnArguments[0] === 'clone') {
        return manualSpawn(command, spawnArguments, options as never)
      }
      return autoSpawn(command, spawnArguments, options as never)
    }) as RepositoryDependencies['spawn']

    // Pre-populate with a repo on a specific branch
    manager.repositories.set('user/repo', {
      repository: {
        name: 'user/repo',
        gitUrl: 'https://github.com/user/repo.git',
        gitSshUrl: 'git@github.com:user/repo.git',
        url: 'https://example.com/user/repo',
        id: 1,
        branch: 'develop',
      },
      path: '/tmp/user/repo',
      logBuffer: createLogBuffer(),
      lifecycle: { type: 'idle' },
      agentStatus: 'idle',
    } as RepositoryState)

    const repoDeps = createTestRepositoryDependencies({
      spawn: combinedSpawn,
      sleep: async () => {
        for (const repoState of manager.repositories.values()) {
          repoState.lifecycle = { type: 'stopping' }
        }
      },
    })

    // Send a repo list with same repo but no branch (default)
    const handlePromise = handleRepositoryList(
      [
        {
          name: 'user/repo',
          gitUrl: 'https://github.com/user/repo.git',
          gitSshUrl: 'git@github.com:user/repo.git',
          url: 'https://example.com/user/repo',
          id: 1,
        },
      ],
      manager,
      repoDeps,
      context
    )

    // Wait for rm to be spawned (removal of existing repo)
    await new Promise(resolve => setTimeout(resolve, 0))
    const rmProc = processes.get('rm -rf /tmp/user/repo')
    rmProc?.emit('close', 0)

    // Wait for clone to be spawned without branch
    await new Promise(resolve => setTimeout(resolve, 0))
    const cloneProc = processes.get(
      'git clone https://github.com/user/repo.git /tmp/user/repo'
    )
    cloneProc?.emit('close', 0)

    // Wake the loop
    for (const repoState of manager.repositories.values()) {
      repoState.wakeUp?.()
    }

    await handlePromise

    expect(manager.repositories.size).toBe(1)
    expect(
      manager.repositories.get('user/repo')?.repository.branch
    ).toBeUndefined()
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
        gitSshUrl: 'ssh-repo',
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
    const repoDeps = createTestRepositoryDependencies({
      spawn: ((command: string) => {
        if (command === 'git') cloneCalled = true
        return spawn(command, [], {})
      }) as RepositoryDependencies['spawn'],
    })

    await addRepository(
      {
        name: 'repo',
        gitUrl: 'repo',
        gitSshUrl: 'git@example.com:repo.git',
        url: 'https://example.com/repo',
        id: 1,
      },
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

    const repoDeps = createTestRepositoryDependencies({
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
        gitSshUrl: 'git@example.com:stale-repo.git',
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
    const repoDeps = createTestRepositoryDependencies({ spawn })

    const addPromise = addRepository(
      {
        name: 'fail-repo',
        gitUrl: 'bad-url',
        gitSshUrl: 'git@example.com:fail-repo.git',
        url: 'https://example.com/fail-repo',
        id: 2,
      },
      manager,
      repoDeps,
      context
    )

    await new Promise(resolve => setTimeout(resolve, 0))

    // HTTPS clone fails
    const httpsProc = processes.get('git clone bad-url /tmp/fail-repo')
    const httpsStderr = (httpsProc as EventEmitter & { stderr: EventEmitter })
      .stderr
    httpsStderr?.emit('data', 'clone error')
    httpsProc?.emit('close', 128)

    // Wait for SSH fallback attempt
    await new Promise(resolve => setTimeout(resolve, 0))

    // SSH clone also fails
    const sshProc = processes.get(
      'git clone git@example.com:fail-repo.git /tmp/fail-repo'
    )
    const sshStderr = (sshProc as EventEmitter & { stderr: EventEmitter })
      .stderr
    sshStderr?.emit('data', 'SSH clone error')
    sshProc?.emit('close', 128)

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
    const repoDeps = createTestRepositoryDependencies()

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
        gitSshUrl: 'ssh-running-repo',
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

    const repoDeps = createTestRepositoryDependencies({
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
        gitSshUrl: 'ssh-idle-repo',
        url: 'https://example.com/idle-repo',
        id: 1,
      },
      path: '/tmp/idle-repo',
      lifecycle: { type: 'stopping' }, // In stopping state (not idle, not running)
      logBuffer: createLogBuffer(),
      agentStatus: 'idle' as const,
    }
    manager.repositories.set('idle-repo', repoState)

    const repoDeps = createTestRepositoryDependencies({
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

  test('transitions starting repository to idle via stop action', async () => {
    const context = createContextEmulator()
    const manager = createMockManager()
    const { spawn, processes } = createMockSpawn()

    const repoState: RepositoryState = {
      repository: {
        name: 'starting-repo',
        gitUrl: 'starting-repo',
        gitSshUrl: 'ssh-starting-repo',
        url: 'https://example.com/starting-repo',
        id: 1,
      },
      path: '/tmp/starting-repo',
      lifecycle: { type: 'starting' },
      logBuffer: createLogBuffer(),
      agentStatus: 'idle' as const,
    }
    manager.repositories.set('starting-repo', repoState)

    const repoDeps = createTestRepositoryDependencies({
      spawn,
      sleep: () => Promise.resolve(),
    })

    const removePromise = removeRepositoryFromManager(
      'starting-repo',
      manager,
      repoDeps,
      context
    )

    await new Promise(resolve => setTimeout(resolve, 0))

    const rmProc = processes.get('rm -rf /tmp/starting-repo')
    rmProc?.emit('close', 0)

    await removePromise

    expect(manager.repositories.has('starting-repo')).toBe(false)
  })
})
