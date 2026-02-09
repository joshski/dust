import { describe, expect, test } from 'vitest'
import {
  createContextEmulator,
  createFileSystemEmulator,
  type FileSystemTree,
  stripAnsi,
} from '../../test/test-utilities'
import type { CommandDependencies } from '../types'
import { pickTask } from './pick-task'

function createDependencies(fileSystemTree: FileSystemTree = {}): {
  context: ReturnType<typeof createContextEmulator>
  dependencies: CommandDependencies
} {
  const context = createContextEmulator()
  const fileSystem = createFileSystemEmulator(fileSystemTree)
  return {
    context,
    dependencies: {
      arguments: [],
      context,
      fileSystem,
      globScanner: fileSystem,
      settings: { dustCommand: 'dust' },
    },
  }
}

describe('pick-task', () => {
  test('outputs Pick a Task heading and task list inline', async () => {
    const { context, dependencies } = createDependencies({
      project: {
        '.dust': {
          tasks: {
            'add-logging.md': '# Add Logging\n\nAdd structured logging.',
          },
        },
      },
    })

    const result = await pickTask(dependencies)
    const output = stripAnsi(context.stdoutLines.join('\n'))

    expect(result.exitCode).toBe(0)
    expect(output).toContain('Pick a Task')
    expect(output).toContain('# Add Logging')
    expect(output).toContain('.dust/tasks/add-logging.md')
    expect(output).toContain('dust focus')
  })

  test('lists multiple tasks inline', async () => {
    const { context, dependencies } = createDependencies({
      project: {
        '.dust': {
          tasks: {
            'task-a.md': '# Task A',
            'task-b.md': '# Task B',
          },
        },
      },
    })

    const result = await pickTask(dependencies)
    const output = stripAnsi(context.stdoutLines.join('\n'))

    expect(result.exitCode).toBe(0)
    expect(output).toContain('# Task A')
    expect(output).toContain('# Task B')
  })

  test('outputs error when .dust directory not found', async () => {
    const { context, dependencies } = createDependencies({
      project: {},
    })

    const result = await pickTask(dependencies)

    expect(result.exitCode).toBe(1)
    expect(context.stderrLines.join('\n')).toContain(
      '.dust directory not found'
    )
  })

  test('shows message when no tasks found', async () => {
    const { context, dependencies } = createDependencies({
      project: { '.dust': { tasks: {} } },
    })

    const result = await pickTask(dependencies)

    expect(result.exitCode).toBe(0)
    expect(context.stdoutLines.join('\n')).toContain('No unblocked tasks found')
  })

  test('instructs agent to run focus after picking', async () => {
    const { context, dependencies } = createDependencies({
      project: {
        '.dust': {
          tasks: { 'my-task.md': '# My Task\n\nDo the thing.' },
        },
      },
    })

    await pickTask(dependencies)
    const output = context.stdoutLines.join('\n')

    expect(output).toContain('dust focus "<task name>"')
  })
})
