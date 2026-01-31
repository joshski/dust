import { describe, expect, test } from 'vitest'
import {
  createContextEmulator,
  createFileSystemEmulator,
  type FileSystemEmulator,
} from '../../test/test-utilities'
import type { CommandContext, CommandDependencies } from '../types'
import { list } from './list'

function createDependencies(
  context: CommandContext,
  fileSystem: FileSystemEmulator,
  commandArguments: string[] = []
): CommandDependencies {
  return {
    arguments: commandArguments,
    context,
    fileSystem,
    globScanner: fileSystem,
    settings: { dustCommand: 'dust' },
  }
}

describe('list command', () => {
  test('fails if .dust not found', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator()

    const result = await list(createDependencies(context, fileSystem))

    expect(result.exitCode).toBe(1)
    expect(context.stderrLines.join('\n')).toContain(
      '.dust directory not found'
    )
  })

  test('lists all types when no argument given', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          goals: { 'goal.md': '# My Goal' },
          ideas: { 'idea.md': '# My Idea' },
          tasks: { 'task.md': '# My Task' },
          facts: { 'fact.md': '# My Fact' },
        },
      },
    })

    const result = await list(createDependencies(context, fileSystem))

    expect(result.exitCode).toBe(0)
    const output = context.stdoutLines.join('\n')
    expect(output).toContain('🎯 Goals')
    expect(output).toContain('💡 Ideas')
    expect(output).toContain('📋 Tasks')
    expect(output).toContain('📄 Facts')
  })

  test('lists only specified type', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          goals: { 'goal.md': '# My Goal' },
          ideas: { 'idea.md': '# My Idea' },
        },
      },
    })

    const result = await list(
      createDependencies(context, fileSystem, ['goals'])
    )

    expect(result.exitCode).toBe(0)
    const output = context.stdoutLines.join('\n')
    expect(output).toContain('🎯 Goals')
    expect(output).not.toContain('💡 Ideas')
  })

  test('shows relative path and opening sentence', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          goals: {
            'my-goal.md': '# My Goal Title\n\nThis is the opening sentence.',
          },
        },
      },
    })

    await list(createDependencies(context, fileSystem, ['goals']))

    const output = context.stdoutLines.join('\n')
    expect(output).toContain('.dust/goals/my-goal.md')
    expect(output).toContain('This is the opening sentence.')
  })

  test('shows only file name if no title', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          goals: { 'my-goal.md': 'No heading here' },
        },
      },
    })

    await list(createDependencies(context, fileSystem, ['goals']))

    const output = context.stdoutLines.join('\n')
    expect(output).toContain('my-goal')
  })

  test('rejects invalid type', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          goals: { 'g.md': '' },
        },
      },
    })

    const result = await list(
      createDependencies(context, fileSystem, ['invalid'])
    )

    expect(result.exitCode).toBe(1)
    expect(context.stderrLines.join('\n')).toContain('Invalid type')
  })

  test('shows valid types on error', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          goals: { 'g.md': '' },
        },
      },
    })

    await list(createDependencies(context, fileSystem, ['invalid']))

    const output = context.stderrLines.join('\n')
    expect(output).toContain('tasks')
    expect(output).toContain('ideas')
    expect(output).toContain('goals')
    expect(output).toContain('facts')
  })

  test('skips type directories that do not exist', async () => {
    const context = createContextEmulator()
    // Only goals directory exists, tasks/ideas/facts do not
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          goals: { 'my-goal.md': '# My Goal' },
        },
      },
    })

    const result = await list(createDependencies(context, fileSystem))

    expect(result.exitCode).toBe(0)
    const output = context.stdoutLines.join('\n')
    expect(output).toContain('🎯 Goals')
    expect(output).toContain('My Goal')
    // Other types should not appear because their directories don't exist
    expect(output).not.toContain('📋 Tasks')
    expect(output).not.toContain('💡 Ideas')
    expect(output).not.toContain('📄 Facts')
  })

  test('skips type directories with no markdown files', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          goals: { 'my-goal.md': '# My Goal' },
          ideas: {},
        },
      },
    })

    const result = await list(createDependencies(context, fileSystem))

    expect(result.exitCode).toBe(0)
    const output = context.stdoutLines.join('\n')
    expect(output).toContain('🎯 Goals')
    // ideas exists but has no .md files, so should not be listed
    expect(output).not.toContain('💡 Ideas')
  })

  test('shows "No tasks found." when listing tasks and none exist', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          goals: { 'my-goal.md': '# My Goal' },
        },
      },
    })

    const result = await list(
      createDependencies(context, fileSystem, ['tasks'])
    )

    expect(result.exitCode).toBe(0)
    const output = context.stdoutLines.join('\n')
    expect(output).toContain('📋 Tasks')
    expect(output).toContain('No tasks found.')
  })

  test('shows "No ideas found." when listing ideas and none exist', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          ideas: {},
        },
      },
    })

    const result = await list(
      createDependencies(context, fileSystem, ['ideas'])
    )

    expect(result.exitCode).toBe(0)
    const output = context.stdoutLines.join('\n')
    expect(output).toContain('💡 Ideas')
    expect(output).toContain('No ideas found.')
  })

  test('shows type explanation for tasks', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          tasks: { 'task.md': '# My Task' },
        },
      },
    })

    await list(createDependencies(context, fileSystem, ['tasks']))

    const output = context.stdoutLines.join('\n')
    expect(output).toContain(
      'Tasks are detailed work plans with dependencies and completion criteria'
    )
  })

  test('shows type explanation for ideas', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          ideas: { 'idea.md': '# My Idea' },
        },
      },
    })

    await list(createDependencies(context, fileSystem, ['ideas']))

    const output = context.stdoutLines.join('\n')
    expect(output).toContain('Ideas are future feature notes and proposals')
  })

  test('shows type explanation for goals', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          goals: { 'goal.md': '# My Goal' },
        },
      },
    })

    await list(createDependencies(context, fileSystem, ['goals']))

    const output = context.stdoutLines.join('\n')
    expect(output).toContain(
      'Goals are mission statements and guiding principles'
    )
  })

  test('shows type explanation for facts', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          facts: { 'fact.md': '# My Fact' },
        },
      },
    })

    await list(createDependencies(context, fileSystem, ['facts']))

    const output = context.stdoutLines.join('\n')
    expect(output).toContain('Facts are current state documentation')
  })

  test('shows type explanation even when no items exist', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          tasks: {},
        },
      },
    })

    await list(createDependencies(context, fileSystem, ['tasks']))

    const output = context.stdoutLines.join('\n')
    expect(output).toContain(
      'Tasks are detailed work plans with dependencies and completion criteria'
    )
    expect(output).toContain('No tasks found.')
  })
})
