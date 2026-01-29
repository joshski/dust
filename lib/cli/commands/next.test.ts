import { describe, expect, test } from 'vitest'
import {
  createContextEmulator,
  createFileSystemEmulator,
  type FileSystemEmulator,
} from '../test-utilities'
import type { CommandContext, CommandDependencies } from '../types'
import { next } from './next'

function createDeps(
  ctx: CommandContext,
  fs: FileSystemEmulator
): CommandDependencies {
  return {
    arguments: [],
    context: ctx,
    fileSystem: fs,
    globScanner: fs,
    settings: { dustCommand: 'dust' },
  }
}

describe('next command', () => {
  test('fails if .dust directory not found', async () => {
    const ctx = createContextEmulator()
    const fs = createFileSystemEmulator()

    const result = await next(createDeps(ctx, fs))

    expect(result.exitCode).toBe(1)
    expect(ctx.stderrLines.join('\n')).toContain('.dust directory not found')
    expect(ctx.stderrLines.join('\n')).toContain('dust init')
  })

  test('returns empty output when no tasks directory exists', async () => {
    const ctx = createContextEmulator()
    const fs = createFileSystemEmulator({
      files: new Map([['/project/.dust/goals/goal.md', '# My Goal']]),
    })

    const result = await next(createDeps(ctx, fs))

    expect(result.exitCode).toBe(0)
    expect(ctx.stdoutLines).toHaveLength(0)
  })

  test('returns empty output when tasks directory is empty', async () => {
    const ctx = createContextEmulator()
    const fs = createFileSystemEmulator({
      existingPaths: new Set(['/project/.dust', '/project/.dust/tasks']),
    })

    const result = await next(createDeps(ctx, fs))

    expect(result.exitCode).toBe(0)
    expect(ctx.stdoutLines).toHaveLength(0)
  })

  test('lists tasks with no blockers section', async () => {
    const ctx = createContextEmulator()
    const fs = createFileSystemEmulator({
      files: new Map([
        ['/project/.dust/tasks/simple-task.md', '# Simple Task\n\nJust do it.'],
      ]),
    })

    const result = await next(createDeps(ctx, fs))

    expect(result.exitCode).toBe(0)
    expect(ctx.stdoutLines.join('\n')).toContain('Next tasks:')
    expect(ctx.stdoutLines.join('\n')).toContain('.dust/tasks/simple-task.md')
    expect(ctx.stdoutLines.join('\n')).toContain('Simple Task')
  })

  test('filters out tasks with incomplete blockers', async () => {
    const ctx = createContextEmulator()
    const fs = createFileSystemEmulator({
      files: new Map([
        [
          '/project/.dust/tasks/blocked-task.md',
          '# Blocked Task\n\n## Blocked by\n\n- [Blocker](blocker-task.md)',
        ],
        ['/project/.dust/tasks/blocker-task.md', '# Blocker Task\n\nDo first.'],
      ]),
    })

    const result = await next(createDeps(ctx, fs))

    expect(result.exitCode).toBe(0)
    const output = ctx.stdoutLines.join('\n')
    expect(output).toContain('.dust/tasks/blocker-task.md')
    expect(output).not.toContain('.dust/tasks/blocked-task.md')
  })

  test('includes tasks whose blockers are all completed (deleted)', async () => {
    const ctx = createContextEmulator()
    // The blocked-task references a blocker that no longer exists (completed)
    const fs = createFileSystemEmulator({
      files: new Map([
        [
          '/project/.dust/tasks/unblocked-task.md',
          '# Unblocked Task\n\n## Blocked by\n\n- [Completed Task](completed-task.md)',
        ],
      ]),
    })

    const result = await next(createDeps(ctx, fs))

    expect(result.exitCode).toBe(0)
    const output = ctx.stdoutLines.join('\n')
    expect(output).toContain('Next tasks:')
    expect(output).toContain('.dust/tasks/unblocked-task.md')
    expect(output).toContain('Unblocked Task')
  })

  test('handles tasks with (none) in blocked by section', async () => {
    const ctx = createContextEmulator()
    const fs = createFileSystemEmulator({
      files: new Map([
        [
          '/project/.dust/tasks/ready-task.md',
          '# Ready Task\n\n## Blocked by\n\n(none)',
        ],
      ]),
    })

    const result = await next(createDeps(ctx, fs))

    expect(result.exitCode).toBe(0)
    const output = ctx.stdoutLines.join('\n')
    expect(output).toContain('Next tasks:')
    expect(output).toContain('.dust/tasks/ready-task.md')
    expect(output).toContain('Ready Task')
  })

  test('shows task path without title if no heading exists', async () => {
    const ctx = createContextEmulator()
    const fs = createFileSystemEmulator({
      files: new Map([
        ['/project/.dust/tasks/no-title-task.md', 'This task has no heading'],
      ]),
    })

    const result = await next(createDeps(ctx, fs))

    expect(result.exitCode).toBe(0)
    const output = ctx.stdoutLines.join('\n')
    expect(output).toContain('.dust/tasks/no-title-task.md')
    // Should not have a dash separator without title
    expect(output).not.toContain('.dust/tasks/no-title-task.md -')
  })

  test('returns empty when all tasks are blocked', async () => {
    const ctx = createContextEmulator()
    const fs = createFileSystemEmulator({
      files: new Map([
        [
          '/project/.dust/tasks/task-a.md',
          '# Task A\n\n## Blocked by\n\n- [Task B](task-b.md)',
        ],
        [
          '/project/.dust/tasks/task-b.md',
          '# Task B\n\n## Blocked by\n\n- [Task A](task-a.md)',
        ],
      ]),
    })

    const result = await next(createDeps(ctx, fs))

    expect(result.exitCode).toBe(0)
    expect(ctx.stdoutLines).toHaveLength(0)
  })

  test('handles multiple blockers where some are complete', async () => {
    const ctx = createContextEmulator()
    // Blockers on the same line to ensure they're all captured
    const fs = createFileSystemEmulator({
      files: new Map([
        [
          '/project/.dust/tasks/multi-blocked.md',
          '# Multi Blocked\n\n## Blocked by\n\n- [Done](done.md), [Still Exists](still-exists.md)',
        ],
        ['/project/.dust/tasks/still-exists.md', '# Still Exists'],
      ]),
    })

    const result = await next(createDeps(ctx, fs))

    expect(result.exitCode).toBe(0)
    const output = ctx.stdoutLines.join('\n')
    // multi-blocked should NOT appear because still-exists.md still exists
    expect(output).not.toContain('.dust/tasks/multi-blocked.md')
    // still-exists should appear (no blockers)
    expect(output).toContain('.dust/tasks/still-exists.md')
  })

  test('lists multiple unblocked tasks sorted alphabetically', async () => {
    const ctx = createContextEmulator()
    const fs = createFileSystemEmulator({
      files: new Map([
        ['/project/.dust/tasks/zebra-task.md', '# Zebra Task'],
        ['/project/.dust/tasks/alpha-task.md', '# Alpha Task'],
        ['/project/.dust/tasks/middle-task.md', '# Middle Task'],
      ]),
    })

    const result = await next(createDeps(ctx, fs))

    expect(result.exitCode).toBe(0)
    const output = ctx.stdoutLines.join('\n')
    expect(output).toContain('.dust/tasks/alpha-task.md')
    expect(output).toContain('.dust/tasks/middle-task.md')
    expect(output).toContain('.dust/tasks/zebra-task.md')

    // Verify alphabetical order
    const alphaIndex = output.indexOf('.dust/tasks/alpha-task.md')
    const middleIndex = output.indexOf('.dust/tasks/middle-task.md')
    const zebraIndex = output.indexOf('.dust/tasks/zebra-task.md')
    expect(alphaIndex).toBeLessThan(middleIndex)
    expect(middleIndex).toBeLessThan(zebraIndex)
  })
})
