import { describe, expect, test } from 'vitest'
import {
  createContextEmulator,
  createFileSystemEmulator,
  createTestRuntimeConfig,
  type FileSystemEmulator,
} from '../../test/test-utilities'
import type { CommandContext, CommandDependencies } from '../types'
import { facts, ideas, principles, tasks } from './type-list'

function createDependencies(
  context: CommandContext,
  fileSystem: FileSystemEmulator
): CommandDependencies {
  return {
    arguments: [],
    context,
    fileSystem,
    globScanner: fileSystem,
    runtime: createTestRuntimeConfig(),
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
          principles: { 'principle.md': '# My Principle' },
        },
      },
    })

    const result = await tasks(createDependencies(context, fileSystem))

    expect(result.exitCode).toBe(0)
    const output = context.stdoutLines.join('\n')
    expect(output).toContain('📋 Tasks')
    expect(output).toContain('My Task')
    expect(output).not.toContain('🎯 Principles')
  })
})

describe('principles command', () => {
  test('lists only principles', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          tasks: { 'task.md': '# My Task' },
          principles: { 'principle.md': '# My Principle' },
        },
      },
    })

    const result = await principles(createDependencies(context, fileSystem))

    expect(result.exitCode).toBe(0)
    const output = context.stdoutLines.join('\n')
    expect(output).toContain('🎯 Principles')
    // Compact format uses slug with .md extension
    expect(output).toContain('* principle.md')
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
          principles: { 'principle.md': '# My Principle' },
        },
      },
    })

    const result = await ideas(createDependencies(context, fileSystem))

    expect(result.exitCode).toBe(0)
    const output = context.stdoutLines.join('\n')
    expect(output).toContain('💡 Ideas')
    expect(output).toContain('My Idea')
    expect(output).not.toContain('🎯 Principles')
  })
})

describe('facts command', () => {
  test('lists only facts', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.dust': {
          facts: { 'fact.md': '# My Fact' },
          principles: { 'principle.md': '# My Principle' },
        },
      },
    })

    const result = await facts(createDependencies(context, fileSystem))

    expect(result.exitCode).toBe(0)
    const output = context.stdoutLines.join('\n')
    expect(output).toContain('📄 Facts')
    expect(output).toContain('My Fact')
    expect(output).not.toContain('🎯 Principles')
  })
})
