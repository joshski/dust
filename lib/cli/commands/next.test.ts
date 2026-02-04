import { describe, expect, test } from 'vitest'
import { createCommandDependencies } from '../../test/test-utilities'
import { next } from './next'

function output(context: { stdoutLines: string[] }) {
  return context.stdoutLines.join('\n')
}

describe('next command', () => {
  test('fails if .dust directory not found', async () => {
    const { context, dependencies } = createCommandDependencies()

    const result = await next(dependencies)

    expect(result.exitCode).toBe(1)
    expect(context.stderrLines.join('\n')).toContain('.dust directory not found')
    expect(context.stderrLines.join('\n')).toContain('dust init')
  })

  test('returns empty output when no tasks directory exists', async () => {
    const { context, dependencies } = createCommandDependencies({
      files: {
        project: {
          '.dust': {
            goals: { 'goal.md': '# My Goal' },
          },
        },
      },
    })

    const result = await next(dependencies)

    expect(result.exitCode).toBe(0)
    expect(context.stdoutLines).toHaveLength(0)
  })

  test('returns empty output when tasks directory is empty', async () => {
    const { context, dependencies } = createCommandDependencies({
      files: { project: { '.dust': { tasks: {} } } },
    })

    const result = await next(dependencies)

    expect(result.exitCode).toBe(0)
    expect(context.stdoutLines).toHaveLength(0)
  })

  test('lists tasks with no blockers section', async () => {
    const { context, dependencies } = createCommandDependencies({
      files: {
        project: {
          '.dust': {
            tasks: { 'simple-task.md': '# Simple Task\n\nJust do it.' },
          },
        },
      },
    })

    const result = await next(dependencies)

    expect(result.exitCode).toBe(0)
    expect(output(context)).toContain('📋 Next tasks')
    expect(output(context)).toContain('# Simple Task')
    expect(output(context)).toContain('.dust/tasks/simple-task.md')
    expect(output(context)).toContain('Just do it.')
  })

  test('filters out tasks with incomplete blockers', async () => {
    const { context, dependencies } = createCommandDependencies({
      files: {
        project: {
          '.dust': {
            tasks: {
              'blocked-task.md':
                '# Blocked Task\n\n## Blocked By\n\n- [Blocker](blocker-task.md)',
              'blocker-task.md': '# Blocker Task\n\nDo first.',
            },
          },
        },
      },
    })

    const result = await next(dependencies)

    expect(result.exitCode).toBe(0)
    expect(output(context)).toContain('.dust/tasks/blocker-task.md')
    expect(output(context)).not.toContain('.dust/tasks/blocked-task.md')
  })

  test('includes tasks whose blockers are all completed (deleted)', async () => {
    const { context, dependencies } = createCommandDependencies({
      files: {
        project: {
          '.dust': {
            tasks: {
              'unblocked-task.md':
                '# Unblocked Task\n\nThis task is now unblocked.\n\n## Blocked By\n\n- [Completed Task](completed-task.md)',
            },
          },
        },
      },
    })

    const result = await next(dependencies)

    expect(result.exitCode).toBe(0)
    expect(output(context)).toContain('📋 Next tasks')
    expect(output(context)).toContain('.dust/tasks/unblocked-task.md')
    expect(output(context)).toContain('This task is now unblocked.')
  })

  test('handles tasks with (none) in blocked by section', async () => {
    const { context, dependencies } = createCommandDependencies({
      files: {
        project: {
          '.dust': {
            tasks: {
              'ready-task.md':
                '# Ready Task\n\nThis task is ready to work on.\n\n## Blocked By\n\n(none)',
            },
          },
        },
      },
    })

    const result = await next(dependencies)

    expect(result.exitCode).toBe(0)
    expect(output(context)).toContain('📋 Next tasks')
    expect(output(context)).toContain('.dust/tasks/ready-task.md')
    expect(output(context)).toContain('This task is ready to work on.')
  })

  test('shows task path without title if no heading exists', async () => {
    const { context, dependencies } = createCommandDependencies({
      files: {
        project: {
          '.dust': {
            tasks: { 'no-title-task.md': 'This task has no heading' },
          },
        },
      },
    })

    const result = await next(dependencies)

    expect(result.exitCode).toBe(0)
    expect(output(context)).toContain('.dust/tasks/no-title-task.md')
    expect(output(context)).not.toContain('.dust/tasks/no-title-task.md -')
  })

  test('returns empty when all tasks are blocked', async () => {
    const { context, dependencies } = createCommandDependencies({
      files: {
        project: {
          '.dust': {
            tasks: {
              'task-a.md': '# Task A\n\n## Blocked By\n\n- [Task B](task-b.md)',
              'task-b.md': '# Task B\n\n## Blocked By\n\n- [Task A](task-a.md)',
            },
          },
        },
      },
    })

    const result = await next(dependencies)

    expect(result.exitCode).toBe(0)
    expect(context.stdoutLines).toHaveLength(0)
  })

  test('handles multiple blockers where some are complete', async () => {
    const { context, dependencies } = createCommandDependencies({
      files: {
        project: {
          '.dust': {
            tasks: {
              'multi-blocked.md':
                '# Multi Blocked\n\n## Blocked By\n\n- [Done](done.md), [Still Exists](still-exists.md)',
              'still-exists.md': '# Still Exists',
            },
          },
        },
      },
    })

    const result = await next(dependencies)

    expect(result.exitCode).toBe(0)
    expect(output(context)).not.toContain('.dust/tasks/multi-blocked.md')
    expect(output(context)).toContain('.dust/tasks/still-exists.md')
  })

  test('lists multiple unblocked tasks sorted alphabetically', async () => {
    const { context, dependencies } = createCommandDependencies({
      files: {
        project: {
          '.dust': {
            tasks: {
              'zebra-task.md': '# Zebra Task',
              'alpha-task.md': '# Alpha Task',
              'middle-task.md': '# Middle Task',
            },
          },
        },
      },
    })

    const result = await next(dependencies)

    expect(result.exitCode).toBe(0)
    expect(output(context)).toContain('.dust/tasks/alpha-task.md')
    expect(output(context)).toContain('.dust/tasks/middle-task.md')
    expect(output(context)).toContain('.dust/tasks/zebra-task.md')

    const alphaIndex = output(context).indexOf('.dust/tasks/alpha-task.md')
    const middleIndex = output(context).indexOf('.dust/tasks/middle-task.md')
    const zebraIndex = output(context).indexOf('.dust/tasks/zebra-task.md')
    expect(alphaIndex).toBeLessThan(middleIndex)
    expect(middleIndex).toBeLessThan(zebraIndex)
  })
})
