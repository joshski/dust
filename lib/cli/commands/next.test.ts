import { describe, expect, test } from 'vitest'
import {
  createContextEmulator,
  createFileSystemEmulator,
  type FileSystemEmulator,
} from '../../test/test-utilities'
import type { CommandContext, CommandDependencies } from '../types'
import { findUnblockedTasks, next } from './next'

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

describe('next command', () => {
  test('fails if .dust directory not found', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator()

    const result = await next(createDependencies(context, fileSystem))

    expect(result.exitCode).toBe(1)
    expect(context.stderrLines.join('\n')).toContain(
      '.dust directory not found'
    )
    expect(context.stderrLines.join('\n')).toContain('dust init')
  })

  test('returns empty output when no tasks directory exists', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          principles: { 'principle.md': '# My Principle' },
        },
      },
    })

    const result = await next(createDependencies(context, fileSystem))

    expect(result.exitCode).toBe(0)
    expect(context.stdoutLines).toHaveLength(0)
  })

  test('returns empty output when tasks directory is empty', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: { '.dust': { tasks: {} } },
    })

    const result = await next(createDependencies(context, fileSystem))

    expect(result.exitCode).toBe(0)
    expect(context.stdoutLines).toHaveLength(0)
  })

  test('lists tasks with no blockers section', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          tasks: { 'simple-task.md': '# Simple Task\n\nJust do it.' },
        },
      },
    })

    const result = await next(createDependencies(context, fileSystem))

    expect(result.exitCode).toBe(0)
    const output = context.stdoutLines.join('\n')
    expect(output).toContain('📋 Next tasks')
    expect(output).toContain('# Simple Task')
    expect(output).toContain('.dust/tasks/simple-task.md')
    expect(output).toContain('Just do it.')
  })

  test('filters out tasks with incomplete blockers', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          tasks: {
            'blocked-task.md':
              '# Blocked Task\n\n## Blocked By\n\n- [Blocker](blocker-task.md)',
            'blocker-task.md': '# Blocker Task\n\nDo first.',
          },
        },
      },
    })

    const result = await next(createDependencies(context, fileSystem))

    expect(result.exitCode).toBe(0)
    const output = context.stdoutLines.join('\n')
    expect(output).toContain('.dust/tasks/blocker-task.md')
    expect(output).not.toContain('.dust/tasks/blocked-task.md')
  })

  test('includes tasks whose blockers are all completed (deleted)', async () => {
    const context = createContextEmulator()
    // The blocked-task references a blocker that no longer exists (completed)
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          tasks: {
            'unblocked-task.md':
              '# Unblocked Task\n\nThis task is now unblocked.\n\n## Blocked By\n\n- [Completed Task](completed-task.md)',
          },
        },
      },
    })

    const result = await next(createDependencies(context, fileSystem))

    expect(result.exitCode).toBe(0)
    const output = context.stdoutLines.join('\n')
    expect(output).toContain('📋 Next tasks')
    expect(output).toContain('.dust/tasks/unblocked-task.md')
    expect(output).toContain('This task is now unblocked.')
  })

  test('handles tasks with (none) in blocked by section', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          tasks: {
            'ready-task.md':
              '# Ready Task\n\nThis task is ready to work on.\n\n## Blocked By\n\n(none)',
          },
        },
      },
    })

    const result = await next(createDependencies(context, fileSystem))

    expect(result.exitCode).toBe(0)
    const output = context.stdoutLines.join('\n')
    expect(output).toContain('📋 Next tasks')
    expect(output).toContain('.dust/tasks/ready-task.md')
    expect(output).toContain('This task is ready to work on.')
  })

  test('shows task path without title if no heading exists', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          tasks: { 'no-title-task.md': 'This task has no heading' },
        },
      },
    })

    const result = await next(createDependencies(context, fileSystem))

    expect(result.exitCode).toBe(0)
    const output = context.stdoutLines.join('\n')
    expect(output).toContain('.dust/tasks/no-title-task.md')
    // Should not have a dash separator without title
    expect(output).not.toContain('.dust/tasks/no-title-task.md -')
  })

  test('returns empty when all tasks are blocked', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          tasks: {
            'task-a.md': '# Task A\n\n## Blocked By\n\n- [Task B](task-b.md)',
            'task-b.md': '# Task B\n\n## Blocked By\n\n- [Task A](task-a.md)',
          },
        },
      },
    })

    const result = await next(createDependencies(context, fileSystem))

    expect(result.exitCode).toBe(0)
    expect(context.stdoutLines).toHaveLength(0)
  })

  test('handles multiple blockers where some are complete', async () => {
    const context = createContextEmulator()
    // Blockers on the same line to ensure they're all captured
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          tasks: {
            'multi-blocked.md':
              '# Multi Blocked\n\n## Blocked By\n\n- [Done](done.md), [Still Exists](still-exists.md)',
            'still-exists.md': '# Still Exists',
          },
        },
      },
    })

    const result = await next(createDependencies(context, fileSystem))

    expect(result.exitCode).toBe(0)
    const output = context.stdoutLines.join('\n')
    // multi-blocked should NOT appear because still-exists.md still exists
    expect(output).not.toContain('.dust/tasks/multi-blocked.md')
    // still-exists should appear (no blockers)
    expect(output).toContain('.dust/tasks/still-exists.md')
  })

  test('getFileCreationTime returns 0 for unknown paths', () => {
    const fileSystem = createFileSystemEmulator()
    expect(fileSystem.getFileCreationTime('/nonexistent')).toBe(0)
  })

  test('uses custom directoryFileSorter when provided', async () => {
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          tasks: {
            'a-task.md': '# A Task',
            'b-task.md': '# B Task',
            'c-task.md': '# C Task',
          },
        },
      },
    })

    const reverseSorter = async (_dir: string, files: string[]) =>
      [...files].reverse()

    const result = await findUnblockedTasks(
      '/project',
      fileSystem,
      reverseSorter
    )

    expect(result.tasks.map(t => t.title)).toEqual([
      'C Task',
      'B Task',
      'A Task',
    ])
  })

  test('lists multiple unblocked tasks sorted by creation time (FIFO)', async () => {
    const context = createContextEmulator()
    // Files are inserted in this order: zebra, alpha, middle
    // so they should appear in that order (FIFO), not alphabetically
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          tasks: {
            'zebra-task.md': '# Zebra Task',
            'alpha-task.md': '# Alpha Task',
            'middle-task.md': '# Middle Task',
          },
        },
      },
    })

    const result = await next(createDependencies(context, fileSystem))

    expect(result.exitCode).toBe(0)
    const output = context.stdoutLines.join('\n')
    expect(output).toContain('.dust/tasks/zebra-task.md')
    expect(output).toContain('.dust/tasks/alpha-task.md')
    expect(output).toContain('.dust/tasks/middle-task.md')

    // Verify FIFO order (creation time order, not alphabetical)
    const zebraIndex = output.indexOf('.dust/tasks/zebra-task.md')
    const alphaIndex = output.indexOf('.dust/tasks/alpha-task.md')
    const middleIndex = output.indexOf('.dust/tasks/middle-task.md')
    expect(zebraIndex).toBeLessThan(alphaIndex)
    expect(alphaIndex).toBeLessThan(middleIndex)
  })
})

describe('next command event emission', () => {
  test('emits tasks-listed event with unblocked tasks', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          tasks: {
            'first-task.md': '# First Task',
            'second-task.md': '# Second Task',
          },
        },
      },
    })

    await next(createDependencies(context, fileSystem))

    expect(context.emittedEvents).toHaveLength(1)
    expect(context.emittedEvents[0]).toEqual({
      type: 'tasks-listed',
      tasks: [
        {
          path: '.dust/tasks/first-task.md',
          title: 'First Task',
          blockedBy: [],
        },
        {
          path: '.dust/tasks/second-task.md',
          title: 'Second Task',
          blockedBy: [],
        },
      ],
    })
  })

  test('emits tasks-listed event with filename as title when no heading exists', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          tasks: {
            'no-title-task.md': 'This task has no heading',
          },
        },
      },
    })

    await next(createDependencies(context, fileSystem))

    expect(context.emittedEvents).toHaveLength(1)
    expect(context.emittedEvents[0]).toEqual({
      type: 'tasks-listed',
      tasks: [
        {
          path: '.dust/tasks/no-title-task.md',
          title: 'no-title-task',
          blockedBy: [],
        },
      ],
    })
  })

  test('emits empty tasks-listed event when no tasks exist', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          tasks: {},
        },
      },
    })

    await next(createDependencies(context, fileSystem))

    expect(context.emittedEvents).toHaveLength(1)
    expect(context.emittedEvents[0]).toEqual({
      type: 'tasks-listed',
      tasks: [],
    })
  })

  test('does not emit tasks-listed event when .dust directory is missing', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator()

    await next(createDependencies(context, fileSystem))

    expect(context.emittedEvents).toHaveLength(0)
  })

  test('only includes unblocked tasks in event', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          tasks: {
            'blocked-task.md':
              '# Blocked Task\n\n## Blocked By\n\n- [Blocker](blocker-task.md)',
            'blocker-task.md': '# Blocker Task\n\nDo first.',
          },
        },
      },
    })

    await next(createDependencies(context, fileSystem))

    expect(context.emittedEvents).toHaveLength(1)
    expect(context.emittedEvents[0]).toEqual({
      type: 'tasks-listed',
      tasks: [
        {
          path: '.dust/tasks/blocker-task.md',
          title: 'Blocker Task',
          blockedBy: [],
        },
      ],
    })
  })

  test('event matches rendered output', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          tasks: {
            'my-task.md': '# My Task\n\nDo this thing.',
          },
        },
      },
    })

    await next(createDependencies(context, fileSystem))

    const output = context.stdoutLines.join('\n')
    expect(output).toContain('# My Task')
    expect(output).toContain('.dust/tasks/my-task.md')

    expect(context.emittedEvents[0]).toEqual({
      type: 'tasks-listed',
      tasks: [
        { path: '.dust/tasks/my-task.md', title: 'My Task', blockedBy: [] },
      ],
    })
  })
})
