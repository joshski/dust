import { EventEmitter } from 'node:events'
import { describe, expect, test } from 'vitest'
import { asChildProcessStub } from '../test-support/test-utilities'
import {
  createAuthHeader,
  extractGitEndpoint,
  type GitCredentialProxyDependencies,
  getGitCredentials,
  parseGitPath,
} from './git-credential-proxy'

function createMockSpawn(
  exitCode: number | null = 0,
  stdoutData?: string,
  stderrData?: string,
  errorToThrow?: Error
): GitCredentialProxyDependencies['spawn'] {
  return (() => {
    const proc = new EventEmitter() as EventEmitter & {
      stdin: EventEmitter & { write: () => void; end: () => void }
      stdout: EventEmitter
      stderr: EventEmitter
    }
    proc.stdin = Object.assign(new EventEmitter(), {
      write: () => {},
      end: () => {},
    })
    proc.stdout = new EventEmitter()
    proc.stderr = new EventEmitter()

    setTimeout(() => {
      if (stdoutData) {
        proc.stdout.emit('data', Buffer.from(stdoutData))
      }
      if (stderrData) {
        proc.stderr.emit('data', Buffer.from(stderrData))
      }
      if (errorToThrow) {
        proc.emit('error', errorToThrow)
      } else {
        proc.emit('close', exitCode)
      }
    }, 0)
    return asChildProcessStub(proc)
  }) as GitCredentialProxyDependencies['spawn']
}

describe('parseGitPath', () => {
  test('parses owner/repo format with github.com default', () => {
    const result = parseGitPath('/joshski/dust.git')
    expect(result).toEqual({
      host: 'github.com',
      owner: 'joshski',
      repo: 'dust',
    })
  })

  test('parses host/owner/repo format', () => {
    const result = parseGitPath('/gitlab.com/org/project.git')
    expect(result).toEqual({
      host: 'gitlab.com',
      owner: 'org',
      repo: 'project',
    })
  })

  test('handles paths extracted from info/refs endpoint', () => {
    // parseGitPath receives the basePath from extractGitEndpoint
    // For /joshski/dust.git/info/refs, extractGitEndpoint returns basePath: /joshski/dust.git
    const result = parseGitPath('/joshski/dust.git')
    expect(result).toEqual({
      host: 'github.com',
      owner: 'joshski',
      repo: 'dust',
    })
  })

  test('handles paths extracted from git-upload-pack endpoint', () => {
    // For /joshski/dust.git/git-upload-pack, extractGitEndpoint returns basePath: /joshski/dust.git
    const result = parseGitPath('/joshski/dust.git')
    expect(result).toEqual({
      host: 'github.com',
      owner: 'joshski',
      repo: 'dust',
    })
  })

  test('handles paths with explicit host', () => {
    const result = parseGitPath('/gitlab.com/joshski/dust.git')
    expect(result).toEqual({
      host: 'gitlab.com',
      owner: 'joshski',
      repo: 'dust',
    })
  })

  test('returns null for invalid paths', () => {
    expect(parseGitPath('/single')).toBeNull()
    expect(parseGitPath('/')).toBeNull()
    expect(parseGitPath('/a/b/c/d/e')).toBeNull()
  })

  test('handles paths without leading slash', () => {
    const result = parseGitPath('joshski/dust.git')
    expect(result).toEqual({
      host: 'github.com',
      owner: 'joshski',
      repo: 'dust',
    })
  })
})

describe('extractGitEndpoint', () => {
  test('extracts git-upload-pack endpoint', () => {
    const result = extractGitEndpoint('/joshski/dust.git/git-upload-pack')
    expect(result).toEqual({
      basePath: '/joshski/dust.git',
      endpoint: 'git-upload-pack',
    })
  })

  test('extracts git-receive-pack endpoint', () => {
    const result = extractGitEndpoint('/joshski/dust.git/git-receive-pack')
    expect(result).toEqual({
      basePath: '/joshski/dust.git',
      endpoint: 'git-receive-pack',
    })
  })

  test('extracts info/refs endpoint', () => {
    const result = extractGitEndpoint('/joshski/dust.git/info/refs')
    expect(result).toEqual({
      basePath: '/joshski/dust.git',
      endpoint: 'info/refs',
    })
  })

  test('extracts endpoint with host in path', () => {
    const result = extractGitEndpoint('/github.com/org/repo.git/info/refs')
    expect(result).toEqual({
      basePath: '/github.com/org/repo.git',
      endpoint: 'info/refs',
    })
  })

  test('returns null for non-git endpoints', () => {
    expect(extractGitEndpoint('/joshski/dust.git')).toBeNull()
    expect(extractGitEndpoint('/joshski/dust.git/other')).toBeNull()
  })
})

describe('getGitCredentials', () => {
  test('returns credentials when git credential fill succeeds', async () => {
    const dependencies: GitCredentialProxyDependencies = {
      spawn: createMockSpawn(
        0,
        'protocol=https\nhost=github.com\nusername=user\npassword=token123\n'
      ),
    }

    const result = await getGitCredentials('github.com', dependencies)
    expect(result).toEqual({
      username: 'user',
      password: 'token123',
    })
  })

  test('returns null when git credential fill fails', async () => {
    const dependencies: GitCredentialProxyDependencies = {
      spawn: createMockSpawn(1, '', 'error: no credential helper'),
    }

    const result = await getGitCredentials('github.com', dependencies)
    expect(result).toBeNull()
  })

  test('returns null when spawn throws error', async () => {
    const dependencies: GitCredentialProxyDependencies = {
      spawn: createMockSpawn(null, '', '', new Error('spawn ENOENT')),
    }

    const result = await getGitCredentials('github.com', dependencies)
    expect(result).toBeNull()
  })

  test('passes userHome as HOME env var when provided', async () => {
    let capturedOptions: import('node:child_process').SpawnOptions | undefined
    const spawn = ((
      _cmd: string,
      _args: string[],
      options: import('node:child_process').SpawnOptions
    ) => {
      capturedOptions = options
      const proc = new EventEmitter() as EventEmitter & {
        stdin: EventEmitter & { write: () => void; end: () => void }
        stdout: EventEmitter
        stderr: EventEmitter
      }
      proc.stdin = Object.assign(new EventEmitter(), {
        write: () => {},
        end: () => {},
      })
      proc.stdout = new EventEmitter()
      proc.stderr = new EventEmitter()
      setTimeout(() => {
        proc.stdout.emit('data', Buffer.from('username=user\npassword=token\n'))
        proc.emit('close', 0)
      }, 0)
      return asChildProcessStub(proc)
    }) as GitCredentialProxyDependencies['spawn']

    const dependencies: GitCredentialProxyDependencies = {
      spawn,
      userHome: '/real/home',
    }

    await getGitCredentials('github.com', dependencies)
    expect(capturedOptions?.env?.HOME).toBe('/real/home')
  })

  test('returns null when credentials are incomplete', async () => {
    const dependencies: GitCredentialProxyDependencies = {
      spawn: createMockSpawn(
        0,
        'protocol=https\nhost=github.com\nusername=user\n'
      ),
    }

    const result = await getGitCredentials('github.com', dependencies)
    expect(result).toBeNull()
  })
})

describe('createAuthHeader', () => {
  test('creates basic auth header with encoded credentials', () => {
    const result = createAuthHeader({ username: 'user', password: 'pass' })
    expect(result).toBe('Basic dXNlcjpwYXNz')
  })

  test('handles special characters in password', () => {
    const result = createAuthHeader({
      username: 'user',
      password: 'p@ss:word!',
    })
    // "user:p@ss:word!" base64 encoded
    expect(result).toBe('Basic dXNlcjpwQHNzOndvcmQh')
  })

  test('handles empty username', () => {
    const result = createAuthHeader({ username: '', password: 'token' })
    expect(result).toBe('Basic OnRva2Vu')
  })
})
