import { describe, expect, test } from 'vitest'
import {
  createContextEmulator,
  createFileSystemEmulator,
  type FileSystemEmulator,
} from '../../test/test-utilities'
import type { CommandContext, CommandDependencies } from '../types'
import { migrate } from './migrate'

function createDependencies(
  context: CommandContext,
  fileSystem: FileSystemEmulator
): CommandDependencies {
  return {
    arguments: [],
    context,
    fileSystem,
    globScanner: fileSystem,
    settings: { dustCommand: 'dust' },
  }
}

describe('migrate command', () => {
  test('fails if .dust directory does not exist', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {},
    })

    const result = await migrate(createDependencies(context, fileSystem))

    expect(result.exitCode).toBe(1)
    expect(context.stderrLines.join('\n')).toContain(
      '.dust directory not found'
    )
  })

  test('reports already migrated if principles exists and goals does not', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          principles: {
            'principle.md': '# Test Principle',
          },
        },
      },
    })

    const result = await migrate(createDependencies(context, fileSystem))

    expect(result.exitCode).toBe(0)
    expect(context.stdoutLines.join('\n')).toContain('Already migrated')
  })

  test('creates principles directory if neither goals nor principles exist', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          tasks: {},
        },
      },
    })

    const result = await migrate(createDependencies(context, fileSystem))

    expect(result.exitCode).toBe(0)
    expect(context.stdoutLines.join('\n')).toContain(
      'No .dust/goals/ directory found'
    )
    expect(fileSystem.createdDirs).toContain('/project/.dust/principles')
  })

  test('renames goals directory to principles', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          goals: {
            'my-goal.md':
              '# My Goal\n\nDescription.\n\n## Parent Goal\n\n- (none)\n\n## Sub-Goals\n\n- (none)\n',
          },
        },
      },
    })

    const result = await migrate(createDependencies(context, fileSystem))

    expect(result.exitCode).toBe(0)
    expect(context.stdoutLines.join('\n')).toContain('Migration complete')
    // The file should now exist at the new path
    expect(fileSystem.exists('/project/.dust/principles/my-goal.md')).toBe(true)
    expect(fileSystem.exists('/project/.dust/goals/my-goal.md')).toBe(false)
  })

  test('updates goal terminology in markdown files', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          goals: {
            'principle.md':
              '# Principle\n\nDescription.\n\n## Parent Goal\n\n- (none)\n\n## Sub-Goals\n\n- (none)\n',
          },
          tasks: {
            'task.md':
              '# Task\n\nDescription.\n\n## Goals\n\n- [Link](../goals/principle.md)\n\n## Blocked By\n\n- (none)\n\n## Definition of Done\n\n- Done\n',
          },
        },
      },
    })

    const result = await migrate(createDependencies(context, fileSystem))

    expect(result.exitCode).toBe(0)

    // Check that the task file was updated
    const taskContent = await fileSystem.readFile(
      '/project/.dust/tasks/task.md'
    )
    expect(taskContent).toContain('## Principles')
    expect(taskContent).toContain('../principles/principle.md')
    expect(taskContent).not.toContain('## Goals')
    expect(taskContent).not.toContain('../goals/')

    // Check that the principle file was updated
    const principleContent = await fileSystem.readFile(
      '/project/.dust/principles/principle.md'
    )
    expect(principleContent).toContain('## Parent Principle')
    expect(principleContent).toContain('## Sub-Principles')
    expect(principleContent).not.toContain('## Parent Goal')
    expect(principleContent).not.toContain('## Sub-Goals')
  })

  test('reports number of updated files', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          goals: {
            'principle.md':
              '# Principle\n\nDescription.\n\n## Parent Goal\n\n- (none)\n\n## Sub-Goals\n\n- (none)\n',
          },
          tasks: {
            'task.md':
              '# Task\n\nDescription.\n\n## Goals\n\n- [Link](../goals/principle.md)\n\n## Blocked By\n\n- (none)\n\n## Definition of Done\n\n- Done\n',
          },
        },
      },
    })

    const result = await migrate(createDependencies(context, fileSystem))

    expect(result.exitCode).toBe(0)
    const output = context.stdoutLines.join('\n')
    expect(output).toContain('Updated 2 markdown file(s)')
  })

  test('does not report updated files when no content changes are needed', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          goals: {
            // This file has already-correct terminology (somehow)
            'principle.md': '# Principle\n\nDescription.\n',
          },
        },
      },
    })

    const result = await migrate(createDependencies(context, fileSystem))

    expect(result.exitCode).toBe(0)
    const output = context.stdoutLines.join('\n')
    expect(output).toContain('Migration complete')
    expect(output).not.toContain('Updated')
  })

  test('handles scan error gracefully by returning empty files', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          goals: {
            'principle.md': '# Principle\n\n## Parent Goal\n',
          },
        },
      },
    })
    // Simulate scan error after rename
    fileSystem.scan = (_dir: string): AsyncIterable<string> => ({
      [Symbol.asyncIterator]: () => ({
        async next() {
          const error = new Error('ENOENT') as NodeJS.ErrnoException
          error.code = 'ENOENT'
          throw error
        },
      }),
    })

    const result = await migrate(createDependencies(context, fileSystem))

    // Should still succeed since file was renamed
    expect(result.exitCode).toBe(0)
  })

  test('rethrows non-ENOENT scan errors', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          goals: {
            'principle.md': '# Principle\n\n## Parent Goal\n',
          },
        },
      },
    })
    // Simulate a non-ENOENT scan error
    fileSystem.scan = (_dir: string): AsyncIterable<string> => ({
      [Symbol.asyncIterator]: () => ({
        async next(): Promise<IteratorResult<string>> {
          throw new Error('Permission denied')
        },
      }),
    })

    await expect(
      migrate(createDependencies(context, fileSystem))
    ).rejects.toThrow('Permission denied')
  })

  test('ignores non-markdown files during migration', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          goals: {
            'principle.md': '# Principle\n\n## Parent Goal\n',
          },
          config: {
            'settings.json': '{}',
          },
        },
      },
    })

    const result = await migrate(createDependencies(context, fileSystem))

    expect(result.exitCode).toBe(0)
    // Only the markdown file should be updated
    const output = context.stdoutLines.join('\n')
    expect(output).toContain('Updated 1 markdown file(s)')
  })
})
