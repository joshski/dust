import { describe, expect, test } from 'vitest'
import {
  createContextEmulator,
  createFileSystemEmulator,
  type FileSystemEmulator,
} from '../../test/test-utilities'
import type { CommandContext, CommandDependencies } from '../types'
import { facts, goals, ideas, tasks } from './type-list'

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

describe('tasks command', () => {
  test('lists only tasks', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          tasks: { 'task.md': '# My Task' },
          goals: { 'goal.md': '# My Goal' },
        },
      },
    })

    const result = await tasks(createDependencies(context, fileSystem))

    expect(result.exitCode).toBe(0)
    const output = context.stdoutLines.join('\n')
    expect(output).toContain('📋 Tasks')
    expect(output).toContain('My Task')
    expect(output).not.toContain('🎯 Goals')
  })
})

describe('goals command', () => {
  test('lists only goals', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          tasks: { 'task.md': '# My Task' },
          goals: { 'goal.md': '# My Goal' },
        },
      },
    })

    const result = await goals(createDependencies(context, fileSystem))

    expect(result.exitCode).toBe(0)
    const output = context.stdoutLines.join('\n')
    expect(output).toContain('🎯 Goals')
    expect(output).toContain('My Goal')
    expect(output).not.toContain('📋 Tasks')
  })
})

describe('ideas command', () => {
  test('lists only ideas', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          ideas: { 'idea.md': '# My Idea' },
          goals: { 'goal.md': '# My Goal' },
        },
      },
    })

    const result = await ideas(createDependencies(context, fileSystem))

    expect(result.exitCode).toBe(0)
    const output = context.stdoutLines.join('\n')
    expect(output).toContain('💡 Ideas')
    expect(output).toContain('My Idea')
    expect(output).not.toContain('🎯 Goals')
  })
})

describe('facts command', () => {
  test('lists only facts', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          facts: { 'fact.md': '# My Fact' },
          goals: { 'goal.md': '# My Goal' },
        },
      },
    })

    const result = await facts(createDependencies(context, fileSystem))

    expect(result.exitCode).toBe(0)
    const output = context.stdoutLines.join('\n')
    expect(output).toContain('📄 Facts')
    expect(output).toContain('My Fact')
    expect(output).not.toContain('🎯 Goals')
  })
})
