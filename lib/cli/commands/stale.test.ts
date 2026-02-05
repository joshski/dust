import { describe, expect, test } from 'vitest'
import {
  createContextEmulator,
  createFileSystemEmulator,
  type FileSystemEmulator,
  stripAnsi,
} from '../../test/test-utilities'
import type { CommandContext, CommandDependencies } from '../types'
import { type GitLogRunner, stale } from './stale'

function createDependencies(
  context: CommandContext,
  fileSystem: FileSystemEmulator,
  settings: Record<string, unknown> = {}
): CommandDependencies {
  return {
    arguments: [],
    context,
    fileSystem,
    globScanner: fileSystem,
    settings: { dustCommand: 'dust', ...settings },
  }
}

function createGitLogRunnerStub(
  commitsSinceMap: Record<string, number | null> = {}
): GitLogRunner {
  return {
    commitCount: async () => 100,
    lastCommitTouching: async (_cwd: string, filePath: string) => {
      if (filePath in commitsSinceMap) {
        return commitsSinceMap[filePath]
      }
      return 0
    },
  }
}

describe('stale command', () => {
  test('fails if .dust directory not found', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator()

    const result = await stale(createDependencies(context, fileSystem))

    expect(result.exitCode).toBe(1)
    expect(context.stderrLines.join('\n')).toContain(
      '.dust directory not found'
    )
    expect(context.stderrLines.join('\n')).toContain('dust init')
  })

  test('reports no ideas directory', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: { '.dust': { goals: {} } },
    })

    const result = await stale(createDependencies(context, fileSystem))

    expect(result.exitCode).toBe(0)
    expect(context.stdoutLines.join('\n')).toContain(
      'No ideas directory found.'
    )
  })

  test('reports no ideas when directory is empty', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: { '.dust': { ideas: {} } },
    })

    const result = await stale(createDependencies(context, fileSystem))

    expect(result.exitCode).toBe(0)
    expect(context.stdoutLines.join('\n')).toContain('No ideas found.')
  })

  test('reports no stale ideas when all are recent', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          ideas: { 'fresh-idea.md': '# Fresh Idea\n\nJust added.' },
        },
      },
    })
    const gitRunner = createGitLogRunnerStub({
      '.dust/ideas/fresh-idea.md': 5,
    })

    const result = await stale(
      createDependencies(context, fileSystem),
      gitRunner
    )

    expect(result.exitCode).toBe(0)
    expect(context.stdoutLines.join('\n')).toContain('No stale ideas found.')
  })

  test('lists ideas unchanged for 50+ commits', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          ideas: {
            'old-idea.md': '# Old Idea\n\nThis has been here a while.',
            'fresh-idea.md': '# Fresh Idea\n\nJust added.',
          },
        },
      },
    })
    const gitRunner = createGitLogRunnerStub({
      '.dust/ideas/old-idea.md': 75,
      '.dust/ideas/fresh-idea.md': 5,
    })

    const result = await stale(
      createDependencies(context, fileSystem),
      gitRunner
    )

    expect(result.exitCode).toBe(0)
    const output = stripAnsi(context.stdoutLines.join('\n'))
    expect(output).toContain('1 stale idea')
    expect(output).toContain('Old Idea')
    expect(output).toContain('75 commits ago')
    expect(output).toContain('.dust/ideas/old-idea.md')
    expect(output).not.toContain('Fresh Idea')
    expect(output).toContain('promote to a task, refine, or delete')
  })

  test('respects configurable threshold from settings', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          ideas: {
            'idea-a.md': '# Idea A',
            'idea-b.md': '# Idea B',
          },
        },
      },
    })
    const gitRunner = createGitLogRunnerStub({
      '.dust/ideas/idea-a.md': 15,
      '.dust/ideas/idea-b.md': 5,
    })

    const result = await stale(
      createDependencies(context, fileSystem, { staleThreshold: 10 }),
      gitRunner
    )

    expect(result.exitCode).toBe(0)
    const output = stripAnsi(context.stdoutLines.join('\n'))
    expect(output).toContain('1 stale idea')
    expect(output).toContain('Idea A')
    expect(output).not.toContain('Idea B')
  })

  test('handles ideas with no git history', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          ideas: { 'untracked-idea.md': '# Untracked Idea' },
        },
      },
    })
    const gitRunner = createGitLogRunnerStub({
      '.dust/ideas/untracked-idea.md': null,
    })

    const result = await stale(
      createDependencies(context, fileSystem),
      gitRunner
    )

    expect(result.exitCode).toBe(0)
    expect(context.stdoutLines.join('\n')).toContain('No stale ideas found.')
  })

  test('pluralizes correctly for multiple stale ideas', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          ideas: {
            'old-a.md': '# Old A',
            'old-b.md': '# Old B',
          },
        },
      },
    })
    const gitRunner = createGitLogRunnerStub({
      '.dust/ideas/old-a.md': 60,
      '.dust/ideas/old-b.md': 80,
    })

    const result = await stale(
      createDependencies(context, fileSystem),
      gitRunner
    )

    expect(result.exitCode).toBe(0)
    const output = stripAnsi(context.stdoutLines.join('\n'))
    expect(output).toContain('2 stale ideas')
  })

  test('uses filename when idea has no title', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          ideas: { 'no-title.md': 'Just some text without a heading.' },
        },
      },
    })
    const gitRunner = createGitLogRunnerStub({
      '.dust/ideas/no-title.md': 100,
    })

    const result = await stale(
      createDependencies(context, fileSystem),
      gitRunner
    )

    expect(result.exitCode).toBe(0)
    const output = stripAnsi(context.stdoutLines.join('\n'))
    expect(output).toContain('no-title')
  })

  test('ideas at exactly the threshold are included', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          ideas: { 'borderline.md': '# Borderline Idea' },
        },
      },
    })
    const gitRunner = createGitLogRunnerStub({
      '.dust/ideas/borderline.md': 50,
    })

    const result = await stale(
      createDependencies(context, fileSystem),
      gitRunner
    )

    expect(result.exitCode).toBe(0)
    const output = stripAnsi(context.stdoutLines.join('\n'))
    expect(output).toContain('Borderline Idea')
  })
})
