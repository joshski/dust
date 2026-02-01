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
  DEFAULT_REVIEW_TYPES,
  type GitRunner,
  getGitHubActionsEnvironment,
  githubActionsCheck,
  type ReviewType,
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

// Valid task content that passes markdown linting
const VALID_GOALS_TASK = `# Review Goals

Review the goals hierarchy.

## Goals

(none)

## Blocked by

(none)

## Definition of done

- [ ] Task item
`

// Single review type for focused testing
const GOALS_REVIEW_TYPE: ReviewType = {
  name: 'goals',
  taskPath: '.dust/tasks/review-goals.md',
  templateName: 'review-goals',
  commitPattern: '.dust/goals/',
  threshold: 20,
  commitMessage: 'Add task: Review Goals',
}

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
        getEnv,
        []
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
        getEnv,
        [GOALS_REVIEW_TYPE]
      )

      expect(result.exitCode).toBe(1)
      // Should not attempt to create review task when checks fail
      expect(gitRunner.calls).toHaveLength(0)
    })
  })

  describe('review task creation with commit patterns', () => {
    test('creates task when matching commits exceed threshold', async () => {
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
        'log --diff-filter=D --format=%H -1 -- .dust/tasks/review-goals.md': {
          exitCode: 0,
          output: 'abc123',
        },
        'rev-list --count abc123..HEAD -- .dust/goals/': {
          exitCode: 0,
          output: '25',
        },
        'add .dust/tasks/review-goals.md': { exitCode: 0, output: '' },
        'commit -m Add task: Review Goals': { exitCode: 0, output: '' },
        push: { exitCode: 0, output: '' },
      })
      const getEnv = () => ({ refName: 'main', eventName: 'push' })

      const result = await githubActionsCheck(
        createDependencies(context, fileSystem, settings),
        bufferedRunner,
        gitRunner,
        getEnv,
        [GOALS_REVIEW_TYPE]
      )

      expect(result.exitCode).toBe(0)
      expect(
        fileSystem.writtenFiles.has('/project/.dust/tasks/review-goals.md')
      ).toBe(true)
      expect(context.stdoutLines).toContain('Created review tasks: goals')
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
              'review-goals.md': VALID_GOALS_TASK,
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
        getEnv,
        [GOALS_REVIEW_TYPE]
      )

      expect(result.exitCode).toBe(0)
      // Should not check commit history when file exists
      expect(gitRunner.calls).toHaveLength(0)
    })

    test('does not create task when matching commits below threshold', async () => {
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
        'log --diff-filter=D --format=%H -1 -- .dust/tasks/review-goals.md': {
          exitCode: 0,
          output: 'abc123',
        },
        'rev-list --count abc123..HEAD -- .dust/goals/': {
          exitCode: 0,
          output: '15',
        },
      })
      const getEnv = () => ({ refName: 'main', eventName: 'push' })

      const result = await githubActionsCheck(
        createDependencies(context, fileSystem, settings),
        bufferedRunner,
        gitRunner,
        getEnv,
        [GOALS_REVIEW_TYPE]
      )

      expect(result.exitCode).toBe(0)
      expect(
        fileSystem.writtenFiles.has('/project/.dust/tasks/review-goals.md')
      ).toBe(false)
    })

    test('counts all matching commits when task was never deleted', async () => {
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
        'log --diff-filter=D --format=%H -1 -- .dust/tasks/review-goals.md': {
          exitCode: 0,
          output: '', // No deletion found
        },
        'rev-list --count HEAD -- .dust/goals/': { exitCode: 0, output: '50' },
        'add .dust/tasks/review-goals.md': { exitCode: 0, output: '' },
        'commit -m Add task: Review Goals': { exitCode: 0, output: '' },
        push: { exitCode: 0, output: '' },
      })
      const getEnv = () => ({ refName: 'main', eventName: 'push' })

      const result = await githubActionsCheck(
        createDependencies(context, fileSystem, settings),
        bufferedRunner,
        gitRunner,
        getEnv,
        [GOALS_REVIEW_TYPE]
      )

      expect(result.exitCode).toBe(0)
      expect(
        fileSystem.writtenFiles.has('/project/.dust/tasks/review-goals.md')
      ).toBe(true)
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
        getEnv,
        [GOALS_REVIEW_TYPE]
      )

      expect(result.exitCode).toBe(0)
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
        getEnv,
        [GOALS_REVIEW_TYPE]
      )

      expect(result.exitCode).toBe(0)
      expect(gitRunner.calls).toHaveLength(0)
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
        getEnv,
        [GOALS_REVIEW_TYPE]
      )

      expect(result.exitCode).toBe(0)
      expect(gitRunner.calls).toHaveLength(0)
    })
  })

  describe('multiple review types', () => {
    test('creates multiple tasks when multiple thresholds exceeded', async () => {
      const context = createContextEmulator()
      const settings: DustSettings = {
        dustCommand: 'dust',
        checks: [{ name: 'lint', command: 'npm run lint' }],
      }
      const fileSystem = createFileSystemEmulator()
      const bufferedRunner = createMockBufferedRunner({
        'npm run lint': { exitCode: 0, output: '' },
      })
      const reviewTypes: ReviewType[] = [
        { ...GOALS_REVIEW_TYPE },
        {
          name: 'ideas',
          taskPath: '.dust/tasks/review-ideas.md',
          templateName: 'review-ideas',
          commitPattern: '.dust/ideas/',
          threshold: 20,
          commitMessage: 'Add task: Review Ideas',
        },
      ]
      const gitRunner = createMockGitRunner({
        // Goals review
        'log --diff-filter=D --format=%H -1 -- .dust/tasks/review-goals.md': {
          exitCode: 0,
          output: '',
        },
        'rev-list --count HEAD -- .dust/goals/': { exitCode: 0, output: '25' },
        'add .dust/tasks/review-goals.md': { exitCode: 0, output: '' },
        'commit -m Add task: Review Goals': { exitCode: 0, output: '' },
        // Ideas review
        'log --diff-filter=D --format=%H -1 -- .dust/tasks/review-ideas.md': {
          exitCode: 0,
          output: '',
        },
        'rev-list --count HEAD -- .dust/ideas/': { exitCode: 0, output: '30' },
        'add .dust/tasks/review-ideas.md': { exitCode: 0, output: '' },
        'commit -m Add task: Review Ideas': { exitCode: 0, output: '' },
        push: { exitCode: 0, output: '' },
      })
      const getEnv = () => ({ refName: 'main', eventName: 'push' })

      const result = await githubActionsCheck(
        createDependencies(context, fileSystem, settings),
        bufferedRunner,
        gitRunner,
        getEnv,
        reviewTypes
      )

      expect(result.exitCode).toBe(0)
      expect(
        fileSystem.writtenFiles.has('/project/.dust/tasks/review-goals.md')
      ).toBe(true)
      expect(
        fileSystem.writtenFiles.has('/project/.dust/tasks/review-ideas.md')
      ).toBe(true)
      expect(context.stdoutLines).toContain(
        'Created review tasks: goals, ideas'
      )
    })

    test('only creates tasks for review types exceeding threshold', async () => {
      const context = createContextEmulator()
      const settings: DustSettings = {
        dustCommand: 'dust',
        checks: [{ name: 'lint', command: 'npm run lint' }],
      }
      const fileSystem = createFileSystemEmulator()
      const bufferedRunner = createMockBufferedRunner({
        'npm run lint': { exitCode: 0, output: '' },
      })
      const reviewTypes: ReviewType[] = [
        { ...GOALS_REVIEW_TYPE },
        {
          name: 'ideas',
          taskPath: '.dust/tasks/review-ideas.md',
          templateName: 'review-ideas',
          commitPattern: '.dust/ideas/',
          threshold: 20,
          commitMessage: 'Add task: Review Ideas',
        },
      ]
      const gitRunner = createMockGitRunner({
        // Goals review - above threshold
        'log --diff-filter=D --format=%H -1 -- .dust/tasks/review-goals.md': {
          exitCode: 0,
          output: '',
        },
        'rev-list --count HEAD -- .dust/goals/': { exitCode: 0, output: '25' },
        'add .dust/tasks/review-goals.md': { exitCode: 0, output: '' },
        'commit -m Add task: Review Goals': { exitCode: 0, output: '' },
        // Ideas review - below threshold
        'log --diff-filter=D --format=%H -1 -- .dust/tasks/review-ideas.md': {
          exitCode: 0,
          output: '',
        },
        'rev-list --count HEAD -- .dust/ideas/': { exitCode: 0, output: '10' },
        push: { exitCode: 0, output: '' },
      })
      const getEnv = () => ({ refName: 'main', eventName: 'push' })

      const result = await githubActionsCheck(
        createDependencies(context, fileSystem, settings),
        bufferedRunner,
        gitRunner,
        getEnv,
        reviewTypes
      )

      expect(result.exitCode).toBe(0)
      expect(
        fileSystem.writtenFiles.has('/project/.dust/tasks/review-goals.md')
      ).toBe(true)
      expect(
        fileSystem.writtenFiles.has('/project/.dust/tasks/review-ideas.md')
      ).toBe(false)
      expect(context.stdoutLines).toContain('Created review tasks: goals')
    })

    test('skips review types where task already exists', async () => {
      const context = createContextEmulator()
      const settings: DustSettings = {
        dustCommand: 'dust',
        checks: [{ name: 'lint', command: 'npm run lint' }],
      }
      const fileSystem = createFileSystemEmulator({
        project: {
          '.dust': {
            tasks: {
              'review-goals.md': VALID_GOALS_TASK, // Already exists
            },
          },
        },
      })
      const bufferedRunner = createMockBufferedRunner({
        'npm run lint': { exitCode: 0, output: '' },
      })
      const reviewTypes: ReviewType[] = [
        { ...GOALS_REVIEW_TYPE },
        {
          name: 'ideas',
          taskPath: '.dust/tasks/review-ideas.md',
          templateName: 'review-ideas',
          commitPattern: '.dust/ideas/',
          threshold: 20,
          commitMessage: 'Add task: Review Ideas',
        },
      ]
      const gitRunner = createMockGitRunner({
        // Ideas review only (goals skipped)
        'log --diff-filter=D --format=%H -1 -- .dust/tasks/review-ideas.md': {
          exitCode: 0,
          output: '',
        },
        'rev-list --count HEAD -- .dust/ideas/': { exitCode: 0, output: '25' },
        'add .dust/tasks/review-ideas.md': { exitCode: 0, output: '' },
        'commit -m Add task: Review Ideas': { exitCode: 0, output: '' },
        push: { exitCode: 0, output: '' },
      })
      const getEnv = () => ({ refName: 'main', eventName: 'push' })

      const result = await githubActionsCheck(
        createDependencies(context, fileSystem, settings),
        bufferedRunner,
        gitRunner,
        getEnv,
        reviewTypes
      )

      expect(result.exitCode).toBe(0)
      // Should not have checked goals (file exists)
      expect(
        gitRunner.calls.some(c =>
          c.gitArgs.join(' ').includes('review-goals.md')
        )
      ).toBe(false)
      expect(context.stdoutLines).toContain('Created review tasks: ideas')
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
        'log --diff-filter=D --format=%H -1 -- .dust/tasks/review-goals.md': {
          exitCode: 0,
          output: '',
        },
        'rev-list --count HEAD -- .dust/goals/': { exitCode: 0, output: '25' },
        'add .dust/tasks/review-goals.md': {
          exitCode: 1,
          output: 'fatal: pathspec error',
        },
      })
      const getEnv = () => ({ refName: 'main', eventName: 'push' })

      const result = await githubActionsCheck(
        createDependencies(context, fileSystem, settings),
        bufferedRunner,
        gitRunner,
        getEnv,
        [GOALS_REVIEW_TYPE]
      )

      expect(result.exitCode).toBe(0)
      expect(context.stdoutLines.join('\n')).toContain(
        'Warning: Failed to stage goals review task'
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
        'log --diff-filter=D --format=%H -1 -- .dust/tasks/review-goals.md': {
          exitCode: 0,
          output: '',
        },
        'rev-list --count HEAD -- .dust/goals/': { exitCode: 0, output: '25' },
        'add .dust/tasks/review-goals.md': { exitCode: 0, output: '' },
        'commit -m Add task: Review Goals': {
          exitCode: 1,
          output: 'nothing to commit',
        },
      })
      const getEnv = () => ({ refName: 'main', eventName: 'push' })

      const result = await githubActionsCheck(
        createDependencies(context, fileSystem, settings),
        bufferedRunner,
        gitRunner,
        getEnv,
        [GOALS_REVIEW_TYPE]
      )

      expect(result.exitCode).toBe(0)
      expect(context.stdoutLines.join('\n')).toContain(
        'Warning: Failed to commit goals review task'
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
        'log --diff-filter=D --format=%H -1 -- .dust/tasks/review-goals.md': {
          exitCode: 0,
          output: '',
        },
        'rev-list --count HEAD -- .dust/goals/': { exitCode: 0, output: '25' },
        'add .dust/tasks/review-goals.md': { exitCode: 0, output: '' },
        'commit -m Add task: Review Goals': { exitCode: 0, output: '' },
        push: { exitCode: 1, output: 'permission denied' },
      })
      const getEnv = () => ({ refName: 'main', eventName: 'push' })

      const result = await githubActionsCheck(
        createDependencies(context, fileSystem, settings),
        bufferedRunner,
        gitRunner,
        getEnv,
        [GOALS_REVIEW_TYPE]
      )

      expect(result.exitCode).toBe(0)
      expect(context.stdoutLines.join('\n')).toContain(
        'Warning: Failed to push review tasks'
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
        getEnv,
        [GOALS_REVIEW_TYPE]
      )

      expect(result.exitCode).toBe(0)
      expect(context.stdoutLines.join('\n')).toContain(
        'Warning: Could not check goals commit history: Git operation failed unexpectedly'
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
        getEnv,
        [GOALS_REVIEW_TYPE]
      )

      expect(result.exitCode).toBe(0)
      expect(context.stdoutLines.join('\n')).toContain(
        'Warning: Could not check goals commit history: string error message'
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
        'log --diff-filter=D --format=%H -1 -- .dust/tasks/review-goals.md': {
          exitCode: 0,
          output: 'abc123',
        },
        'rev-list --count abc123..HEAD -- .dust/goals/': {
          exitCode: 0,
          output: 'not-a-number',
        },
      })
      const getEnv = () => ({ refName: 'main', eventName: 'push' })

      const result = await githubActionsCheck(
        createDependencies(context, fileSystem, settings),
        bufferedRunner,
        gitRunner,
        getEnv,
        [GOALS_REVIEW_TYPE]
      )

      expect(result.exitCode).toBe(0)
      expect(
        fileSystem.writtenFiles.has('/project/.dust/tasks/review-goals.md')
      ).toBe(false)
    })
  })

  describe('DEFAULT_REVIEW_TYPES', () => {
    test('has expected review types defined', () => {
      expect(DEFAULT_REVIEW_TYPES).toHaveLength(3)
      expect(DEFAULT_REVIEW_TYPES.map(r => r.name)).toEqual([
        'goals',
        'ideas',
        'facts',
      ])
    })

    test('each review type has valid configuration', () => {
      for (const reviewType of DEFAULT_REVIEW_TYPES) {
        expect(reviewType.taskPath).toMatch(/^\.dust\/tasks\/review-\w+\.md$/)
        expect(reviewType.templateName).toMatch(/^review-\w+$/)
        expect(reviewType.commitPattern).toMatch(/^\.dust\/\w+\/$/)
        expect(reviewType.threshold).toBeGreaterThan(0)
        expect(reviewType.commitMessage).toMatch(/^Add task: Review \w+$/)
      }
    })
  })
})

describe('getGitHubActionsEnvironment', () => {
  afterEach(() => {
    restoreEnv()
  })

  test('reads environment variables', () => {
    const originalRefName = process.env.GITHUB_REF_NAME
    const originalEventName = process.env.GITHUB_EVENT_NAME

    process.env.GITHUB_REF_NAME = 'test-branch'
    process.env.GITHUB_EVENT_NAME = 'push'

    const env = getGitHubActionsEnvironment()

    expect(env.refName).toBe('test-branch')
    expect(env.eventName).toBe('push')

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
