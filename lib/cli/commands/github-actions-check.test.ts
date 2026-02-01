import type { ChildProcess } from 'node:child_process'
import { EventEmitter } from 'node:events'
import { afterEach, describe, expect, test } from 'vitest'
import {
  createContextEmulator,
  createFileSystemEmulator,
  type FileSystemEmulator,
  restoreEnv,
} from '../../test/test-utilities'
import type {
  CommandContext,
  CommandDependencies,
  DustSettings,
} from '../types'
import type { BufferedProcessRunner } from './check'
import {
  createGitRunner,
  type GitRunner,
  getGitHubActionsEnvironment,
  githubActionsCheck,
} from './github-actions-check'

function createMockBufferedRunner(
  results: Record<string, { exitCode: number; output: string }>
): BufferedProcessRunner {
  return {
    run: async command => {
      return results[command] ?? { exitCode: 0, output: '' }
    },
  }
}

function createMockGitRunner(
  results: Record<string, { exitCode: number; output: string }>
): GitRunner & { calls: Array<{ gitArgs: string[]; cwd: string }> } {
  const calls: Array<{ gitArgs: string[]; cwd: string }> = []
  return {
    run: async (gitArgs, cwd) => {
      calls.push({ gitArgs, cwd })
      const key = gitArgs.join(' ')
      return results[key] ?? { exitCode: 0, output: '' }
    },
    calls,
  }
}

function createDependencies(
  context: CommandContext,
  fileSystem: FileSystemEmulator,
  settings: DustSettings
): CommandDependencies {
  return {
    arguments: [],
    context,
    fileSystem,
    globScanner: fileSystem,
    settings,
  }
}

// Valid task content that passes markdown linting (title must match filename)
const VALID_TASK_CONTENT = `# Periodic Review

Review the .dust/ directory and create individual tasks for any maintenance needed.

## Goals

(none)

## Blocked by

(none)

## Definition of done

- [ ] Task item
`

describe('githubActionsCheck', () => {
  afterEach(() => {
    restoreEnv()
  })

  describe('runs all standard checks', () => {
    test('delegates to check command and returns result', async () => {
      const context = createContextEmulator()
      const settings: DustSettings = {
        dustCommand: 'dust',
        checks: [
          { name: 'lint', command: 'npm run lint' },
          { name: 'test', command: 'npm test' },
        ],
      }
      const fileSystem = createFileSystemEmulator()
      const bufferedRunner = createMockBufferedRunner({
        'npm run lint': { exitCode: 0, output: '' },
        'npm test': { exitCode: 0, output: '' },
      })
      const gitRunner = createMockGitRunner({})
      const getEnv = () => ({ refName: undefined, eventName: undefined })

      const result = await githubActionsCheck(
        createDependencies(context, fileSystem, settings),
        bufferedRunner,
        gitRunner,
        getEnv
      )

      expect(result.exitCode).toBe(0)
      expect(context.stdoutLines).toContain('✓ lint')
      expect(context.stdoutLines).toContain('✓ test')
      expect(context.stdoutLines).toContain('2/2 checks passed')
    })

    test('returns failure when checks fail', async () => {
      const context = createContextEmulator()
      const settings: DustSettings = {
        dustCommand: 'dust',
        checks: [{ name: 'test', command: 'npm test' }],
      }
      const fileSystem = createFileSystemEmulator()
      const bufferedRunner = createMockBufferedRunner({
        'npm test': { exitCode: 1, output: 'Test failed' },
      })
      const gitRunner = createMockGitRunner({})
      const getEnv = () => ({ refName: 'main', eventName: 'push' })

      const result = await githubActionsCheck(
        createDependencies(context, fileSystem, settings),
        bufferedRunner,
        gitRunner,
        getEnv
      )

      expect(result.exitCode).toBe(1)
      // Should not attempt to create health check task when checks fail
      expect(gitRunner.calls).toHaveLength(0)
    })
  })

  describe('health check task creation', () => {
    test('creates task when all conditions are met', async () => {
      const context = createContextEmulator()
      const settings: DustSettings = {
        dustCommand: 'dust',
        checks: [{ name: 'lint', command: 'npm run lint' }],
      }
      const fileSystem = createFileSystemEmulator()
      const bufferedRunner = createMockBufferedRunner({
        'npm run lint': { exitCode: 0, output: '' },
      })
      const gitRunner = createMockGitRunner({
        'log --diff-filter=D --format=%H -1 -- .dust/tasks/periodic-review.md':
          {
            exitCode: 0,
            output: 'abc123',
          },
        'rev-list --count abc123..HEAD': { exitCode: 0, output: '25' },
        'add .dust/tasks/periodic-review.md': { exitCode: 0, output: '' },
        'commit -m Add task: Periodic Review': {
          exitCode: 0,
          output: '',
        },
        push: { exitCode: 0, output: '' },
      })
      const getEnv = () => ({ refName: 'main', eventName: 'push' })

      const result = await githubActionsCheck(
        createDependencies(context, fileSystem, settings),
        bufferedRunner,
        gitRunner,
        getEnv
      )

      expect(result.exitCode).toBe(0)
      expect(
        fileSystem.writtenFiles.has('/project/.dust/tasks/periodic-review.md')
      ).toBe(true)
      expect(context.stdoutLines).toContain('Created periodic review task')
    })

    test('does not create task when file already exists', async () => {
      const context = createContextEmulator()
      const settings: DustSettings = {
        dustCommand: 'dust',
        checks: [{ name: 'lint', command: 'npm run lint' }],
      }
      const fileSystem = createFileSystemEmulator({
        project: {
          '.dust': {
            tasks: {
              'periodic-review.md': VALID_TASK_CONTENT,
            },
          },
        },
      })
      const bufferedRunner = createMockBufferedRunner({
        'npm run lint': { exitCode: 0, output: '' },
      })
      const gitRunner = createMockGitRunner({})
      const getEnv = () => ({ refName: 'main', eventName: 'push' })

      const result = await githubActionsCheck(
        createDependencies(context, fileSystem, settings),
        bufferedRunner,
        gitRunner,
        getEnv
      )

      expect(result.exitCode).toBe(0)
      // Should not check commit history when file exists
      expect(gitRunner.calls).toHaveLength(0)
      expect(
        fileSystem.writtenFiles.has('/project/.dust/tasks/periodic-review.md')
      ).toBe(false)
    })

    test('does not create task when fewer than 20 commits since deletion', async () => {
      const context = createContextEmulator()
      const settings: DustSettings = {
        dustCommand: 'dust',
        checks: [{ name: 'lint', command: 'npm run lint' }],
      }
      const fileSystem = createFileSystemEmulator()
      const bufferedRunner = createMockBufferedRunner({
        'npm run lint': { exitCode: 0, output: '' },
      })
      const gitRunner = createMockGitRunner({
        'log --diff-filter=D --format=%H -1 -- .dust/tasks/periodic-review.md':
          {
            exitCode: 0,
            output: 'abc123',
          },
        'rev-list --count abc123..HEAD': { exitCode: 0, output: '15' },
      })
      const getEnv = () => ({ refName: 'main', eventName: 'push' })

      const result = await githubActionsCheck(
        createDependencies(context, fileSystem, settings),
        bufferedRunner,
        gitRunner,
        getEnv
      )

      expect(result.exitCode).toBe(0)
      expect(
        fileSystem.writtenFiles.has('/project/.dust/tasks/periodic-review.md')
      ).toBe(false)
    })

    test('does not create task when not on default branch', async () => {
      const context = createContextEmulator()
      const settings: DustSettings = {
        dustCommand: 'dust',
        checks: [{ name: 'lint', command: 'npm run lint' }],
      }
      const fileSystem = createFileSystemEmulator()
      const bufferedRunner = createMockBufferedRunner({
        'npm run lint': { exitCode: 0, output: '' },
      })
      const gitRunner = createMockGitRunner({})
      const getEnv = () => ({ refName: 'feature-branch', eventName: 'push' })

      const result = await githubActionsCheck(
        createDependencies(context, fileSystem, settings),
        bufferedRunner,
        gitRunner,
        getEnv
      )

      expect(result.exitCode).toBe(0)
      // Should not check anything when not on main branch
      expect(gitRunner.calls).toHaveLength(0)
    })

    test('behaves like dust check when not in GitHub Actions', async () => {
      const context = createContextEmulator()
      const settings: DustSettings = {
        dustCommand: 'dust',
        checks: [{ name: 'lint', command: 'npm run lint' }],
      }
      const fileSystem = createFileSystemEmulator()
      const bufferedRunner = createMockBufferedRunner({
        'npm run lint': { exitCode: 0, output: '' },
      })
      const gitRunner = createMockGitRunner({})
      const getEnv = () => ({ refName: undefined, eventName: undefined })

      const result = await githubActionsCheck(
        createDependencies(context, fileSystem, settings),
        bufferedRunner,
        gitRunner,
        getEnv
      )

      expect(result.exitCode).toBe(0)
      // Should not interact with git at all
      expect(gitRunner.calls).toHaveLength(0)
    })

    test('counts all commits when file was never deleted', async () => {
      const context = createContextEmulator()
      const settings: DustSettings = {
        dustCommand: 'dust',
        checks: [{ name: 'lint', command: 'npm run lint' }],
      }
      const fileSystem = createFileSystemEmulator()
      const bufferedRunner = createMockBufferedRunner({
        'npm run lint': { exitCode: 0, output: '' },
      })
      const gitRunner = createMockGitRunner({
        'log --diff-filter=D --format=%H -1 -- .dust/tasks/periodic-review.md':
          {
            exitCode: 0,
            output: '', // No deletion found
          },
        'rev-list --count HEAD': { exitCode: 0, output: '50' },
        'add .dust/tasks/periodic-review.md': { exitCode: 0, output: '' },
        'commit -m Add task: Periodic Review': {
          exitCode: 0,
          output: '',
        },
        push: { exitCode: 0, output: '' },
      })
      const getEnv = () => ({ refName: 'main', eventName: 'push' })

      const result = await githubActionsCheck(
        createDependencies(context, fileSystem, settings),
        bufferedRunner,
        gitRunner,
        getEnv
      )

      expect(result.exitCode).toBe(0)
      expect(
        fileSystem.writtenFiles.has('/project/.dust/tasks/periodic-review.md')
      ).toBe(true)
    })

    test('does not create task for pull request events', async () => {
      const context = createContextEmulator()
      const settings: DustSettings = {
        dustCommand: 'dust',
        checks: [{ name: 'lint', command: 'npm run lint' }],
      }
      const fileSystem = createFileSystemEmulator()
      const bufferedRunner = createMockBufferedRunner({
        'npm run lint': { exitCode: 0, output: '' },
      })
      const gitRunner = createMockGitRunner({})
      const getEnv = () => ({ refName: 'main', eventName: 'pull_request' })

      const result = await githubActionsCheck(
        createDependencies(context, fileSystem, settings),
        bufferedRunner,
        gitRunner,
        getEnv
      )

      expect(result.exitCode).toBe(0)
      // Should not interact with git for PR events
      expect(gitRunner.calls).toHaveLength(0)
    })
  })

  describe('error handling', () => {
    test('logs warning but does not fail when git add fails', async () => {
      const context = createContextEmulator()
      const settings: DustSettings = {
        dustCommand: 'dust',
        checks: [{ name: 'lint', command: 'npm run lint' }],
      }
      const fileSystem = createFileSystemEmulator()
      const bufferedRunner = createMockBufferedRunner({
        'npm run lint': { exitCode: 0, output: '' },
      })
      const gitRunner = createMockGitRunner({
        'log --diff-filter=D --format=%H -1 -- .dust/tasks/periodic-review.md':
          {
            exitCode: 0,
            output: '',
          },
        'rev-list --count HEAD': { exitCode: 0, output: '25' },
        'add .dust/tasks/periodic-review.md': {
          exitCode: 1,
          output: 'fatal: pathspec error',
        },
      })
      const getEnv = () => ({ refName: 'main', eventName: 'push' })

      const result = await githubActionsCheck(
        createDependencies(context, fileSystem, settings),
        bufferedRunner,
        gitRunner,
        getEnv
      )

      expect(result.exitCode).toBe(0)
      expect(context.stdoutLines.join('\n')).toContain(
        'Warning: Failed to stage review task'
      )
    })

    test('logs warning but does not fail when git commit fails', async () => {
      const context = createContextEmulator()
      const settings: DustSettings = {
        dustCommand: 'dust',
        checks: [{ name: 'lint', command: 'npm run lint' }],
      }
      const fileSystem = createFileSystemEmulator()
      const bufferedRunner = createMockBufferedRunner({
        'npm run lint': { exitCode: 0, output: '' },
      })
      const gitRunner = createMockGitRunner({
        'log --diff-filter=D --format=%H -1 -- .dust/tasks/periodic-review.md':
          {
            exitCode: 0,
            output: '',
          },
        'rev-list --count HEAD': { exitCode: 0, output: '25' },
        'add .dust/tasks/periodic-review.md': { exitCode: 0, output: '' },
        'commit -m Add task: Periodic Review': {
          exitCode: 1,
          output: 'nothing to commit',
        },
      })
      const getEnv = () => ({ refName: 'main', eventName: 'push' })

      const result = await githubActionsCheck(
        createDependencies(context, fileSystem, settings),
        bufferedRunner,
        gitRunner,
        getEnv
      )

      expect(result.exitCode).toBe(0)
      expect(context.stdoutLines.join('\n')).toContain(
        'Warning: Failed to commit review task'
      )
    })

    test('logs warning but does not fail when git push fails', async () => {
      const context = createContextEmulator()
      const settings: DustSettings = {
        dustCommand: 'dust',
        checks: [{ name: 'lint', command: 'npm run lint' }],
      }
      const fileSystem = createFileSystemEmulator()
      const bufferedRunner = createMockBufferedRunner({
        'npm run lint': { exitCode: 0, output: '' },
      })
      const gitRunner = createMockGitRunner({
        'log --diff-filter=D --format=%H -1 -- .dust/tasks/periodic-review.md':
          {
            exitCode: 0,
            output: '',
          },
        'rev-list --count HEAD': { exitCode: 0, output: '25' },
        'add .dust/tasks/periodic-review.md': { exitCode: 0, output: '' },
        'commit -m Add task: Periodic Review': {
          exitCode: 0,
          output: '',
        },
        push: { exitCode: 1, output: 'permission denied' },
      })
      const getEnv = () => ({ refName: 'main', eventName: 'push' })

      const result = await githubActionsCheck(
        createDependencies(context, fileSystem, settings),
        bufferedRunner,
        gitRunner,
        getEnv
      )

      expect(result.exitCode).toBe(0)
      expect(context.stdoutLines.join('\n')).toContain(
        'Warning: Failed to push review task'
      )
    })

    test('logs warning when git runner throws an exception', async () => {
      const context = createContextEmulator()
      const settings: DustSettings = {
        dustCommand: 'dust',
        checks: [{ name: 'lint', command: 'npm run lint' }],
      }
      const fileSystem = createFileSystemEmulator()
      const bufferedRunner = createMockBufferedRunner({
        'npm run lint': { exitCode: 0, output: '' },
      })
      // Create a git runner that throws an exception
      const throwingGitRunner: GitRunner = {
        run: async () => {
          throw new Error('Git operation failed unexpectedly')
        },
      }
      const getEnv = () => ({ refName: 'main', eventName: 'push' })

      const result = await githubActionsCheck(
        createDependencies(context, fileSystem, settings),
        bufferedRunner,
        throwingGitRunner,
        getEnv
      )

      expect(result.exitCode).toBe(0)
      expect(context.stdoutLines.join('\n')).toContain(
        'Warning: Could not check commit history: Git operation failed unexpectedly'
      )
    })

    test('logs warning when non-Error exception is thrown', async () => {
      const context = createContextEmulator()
      const settings: DustSettings = {
        dustCommand: 'dust',
        checks: [{ name: 'lint', command: 'npm run lint' }],
      }
      const fileSystem = createFileSystemEmulator()
      const bufferedRunner = createMockBufferedRunner({
        'npm run lint': { exitCode: 0, output: '' },
      })
      // Create a git runner that throws a non-Error value
      const throwingGitRunner: GitRunner = {
        run: async () => {
          throw 'string error message'
        },
      }
      const getEnv = () => ({ refName: 'main', eventName: 'push' })

      const result = await githubActionsCheck(
        createDependencies(context, fileSystem, settings),
        bufferedRunner,
        throwingGitRunner,
        getEnv
      )

      expect(result.exitCode).toBe(0)
      expect(context.stdoutLines.join('\n')).toContain(
        'Warning: Could not check commit history: string error message'
      )
    })

    test('handles non-numeric commit count output gracefully', async () => {
      const context = createContextEmulator()
      const settings: DustSettings = {
        dustCommand: 'dust',
        checks: [{ name: 'lint', command: 'npm run lint' }],
      }
      const fileSystem = createFileSystemEmulator()
      const bufferedRunner = createMockBufferedRunner({
        'npm run lint': { exitCode: 0, output: '' },
      })
      const gitRunner = createMockGitRunner({
        'log --diff-filter=D --format=%H -1 -- .dust/tasks/periodic-review.md':
          {
            exitCode: 0,
            output: 'abc123',
          },
        'rev-list --count abc123..HEAD': {
          exitCode: 0,
          output: 'not-a-number', // Invalid output
        },
      })
      const getEnv = () => ({ refName: 'main', eventName: 'push' })

      const result = await githubActionsCheck(
        createDependencies(context, fileSystem, settings),
        bufferedRunner,
        gitRunner,
        getEnv
      )

      // Should return 0 for invalid output, which is < 20, so no task creation
      expect(result.exitCode).toBe(0)
      expect(
        fileSystem.writtenFiles.has('/project/.dust/tasks/periodic-review.md')
      ).toBe(false)
    })

    test('handles non-numeric commit count when file never deleted', async () => {
      const context = createContextEmulator()
      const settings: DustSettings = {
        dustCommand: 'dust',
        checks: [{ name: 'lint', command: 'npm run lint' }],
      }
      const fileSystem = createFileSystemEmulator()
      const bufferedRunner = createMockBufferedRunner({
        'npm run lint': { exitCode: 0, output: '' },
      })
      const gitRunner = createMockGitRunner({
        'log --diff-filter=D --format=%H -1 -- .dust/tasks/periodic-review.md':
          {
            exitCode: 0,
            output: '', // No deletion found
          },
        'rev-list --count HEAD': {
          exitCode: 0,
          output: 'invalid-count', // Invalid output
        },
      })
      const getEnv = () => ({ refName: 'main', eventName: 'push' })

      const result = await githubActionsCheck(
        createDependencies(context, fileSystem, settings),
        bufferedRunner,
        gitRunner,
        getEnv
      )

      // Should return 0 for invalid output, which is < 20, so no task creation
      expect(result.exitCode).toBe(0)
      expect(
        fileSystem.writtenFiles.has('/project/.dust/tasks/periodic-review.md')
      ).toBe(false)
    })
  })
})

describe('getGitHubActionsEnvironment', () => {
  afterEach(() => {
    restoreEnv()
  })

  test('reads environment variables', () => {
    // Save original values
    const originalRefName = process.env.GITHUB_REF_NAME
    const originalEventName = process.env.GITHUB_EVENT_NAME

    // Set test values
    process.env.GITHUB_REF_NAME = 'test-branch'
    process.env.GITHUB_EVENT_NAME = 'push'

    const env = getGitHubActionsEnvironment()

    expect(env.refName).toBe('test-branch')
    expect(env.eventName).toBe('push')

    // Restore original values
    if (originalRefName === undefined) {
      delete process.env.GITHUB_REF_NAME
    } else {
      process.env.GITHUB_REF_NAME = originalRefName
    }
    if (originalEventName === undefined) {
      delete process.env.GITHUB_EVENT_NAME
    } else {
      process.env.GITHUB_EVENT_NAME = originalEventName
    }
  })
})

describe('createGitRunner', () => {
  test('captures stdout and stderr', async () => {
    const mockProc = new EventEmitter() as EventEmitter & {
      stdout: EventEmitter
      stderr: EventEmitter
    }
    mockProc.stdout = new EventEmitter()
    mockProc.stderr = new EventEmitter()

    const mockSpawn = () => mockProc as unknown as ChildProcess
    const runner = createGitRunner(mockSpawn)

    const promise = runner.run(['status'], '/project')
    mockProc.stdout.emit('data', Buffer.from('stdout output\n'))
    mockProc.stderr.emit('data', Buffer.from('stderr output\n'))
    mockProc.emit('close', 0)

    const result = await promise
    expect(result.exitCode).toBe(0)
    expect(result.output).toBe('stdout output\nstderr output')
  })

  test('resolves with exit code from close event', async () => {
    const mockProc = new EventEmitter() as EventEmitter & {
      stdout: EventEmitter
      stderr: EventEmitter
    }
    mockProc.stdout = new EventEmitter()
    mockProc.stderr = new EventEmitter()

    const mockSpawn = () => mockProc as unknown as ChildProcess
    const runner = createGitRunner(mockSpawn)

    const promise = runner.run(['log'], '/project')
    mockProc.emit('close', 42)

    const result = await promise
    expect(result.exitCode).toBe(42)
  })

  test('resolves with 1 when close event has null code', async () => {
    const mockProc = new EventEmitter() as EventEmitter & {
      stdout: EventEmitter
      stderr: EventEmitter
    }
    mockProc.stdout = new EventEmitter()
    mockProc.stderr = new EventEmitter()

    const mockSpawn = () => mockProc as unknown as ChildProcess
    const runner = createGitRunner(mockSpawn)

    const promise = runner.run(['diff'], '/project')
    mockProc.emit('close', null)

    const result = await promise
    expect(result.exitCode).toBe(1)
  })

  test('resolves with 1 on error', async () => {
    const mockProc = new EventEmitter() as EventEmitter & {
      stdout: EventEmitter
      stderr: EventEmitter
    }
    mockProc.stdout = new EventEmitter()
    mockProc.stderr = new EventEmitter()

    const mockSpawn = () => mockProc as unknown as ChildProcess
    const runner = createGitRunner(mockSpawn)

    const promise = runner.run(['push'], '/project')
    mockProc.emit('error', new Error('spawn failed'))

    const result = await promise
    expect(result.exitCode).toBe(1)
    expect(result.output).toBe('spawn failed')
  })

  test('handles null stdout and stderr gracefully', async () => {
    const mockProc = new EventEmitter() as EventEmitter & {
      stdout: null
      stderr: null
    }
    mockProc.stdout = null
    mockProc.stderr = null

    const mockSpawn = () => mockProc as unknown as ChildProcess
    const runner = createGitRunner(mockSpawn)

    const promise = runner.run(['version'], '/project')
    mockProc.emit('close', 0)

    const result = await promise
    expect(result.exitCode).toBe(0)
    expect(result.output).toBe('')
  })
})
