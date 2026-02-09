import { describe, expect, test } from 'vitest'
import {
  createContextEmulator,
  createFileSystemEmulator,
} from '../../test/test-utilities'
import type { CommandDependencies } from '../types'
import { focus } from './focus'

function createDependencies(
  commandArguments: string[] = []
): CommandDependencies & { context: ReturnType<typeof createContextEmulator> } {
  const context = createContextEmulator()
  const fileSystem = createFileSystemEmulator({})
  return {
    arguments: commandArguments,
    context,
    fileSystem,
    globScanner: fileSystem,
    settings: { dustCommand: 'dust' },
  }
}

describe('focus', () => {
  test('outputs error when no objective provided', async () => {
    const dependencies = createDependencies([])

    const result = await focus(dependencies)

    expect(result.exitCode).toBe(1)
    expect(dependencies.context.stderrLines.join('\n')).toContain(
      'Error: No objective provided'
    )
    expect(dependencies.context.stderrLines.join('\n')).toContain('Usage:')
  })

  test('outputs focus message with objective', async () => {
    const dependencies = createDependencies(['add', 'login', 'box'])

    const result = await focus(dependencies)

    expect(result.exitCode).toBe(0)
    expect(dependencies.context.stdoutLines.join('\n')).toContain(
      '🎯 Focus: add login box'
    )
  })

  test('handles single argument objective', async () => {
    const dependencies = createDependencies(['refactoring'])

    const result = await focus(dependencies)

    expect(result.exitCode).toBe(0)
    expect(dependencies.context.stdoutLines.join('\n')).toContain(
      '🎯 Focus: refactoring'
    )
  })

  test('includes implementation instructions after focus line', async () => {
    const dependencies = createDependencies(['add', 'logging'])

    await focus(dependencies)
    const output = dependencies.context.stdoutLines.join('\n')

    expect(output).toContain('🎯 Focus: add logging')
    expect(output).toContain('dust check')
    expect(output).toContain('Implement the task')
    expect(output).toContain('Create a single atomic commit')
    expect(output).toContain('Push your commit')
    expect(output).toContain('One task, one commit')
  })

  test('skips manual check step when hooks are installed', async () => {
    const context = createContextEmulator()
    const fileSystem = createFileSystemEmulator({
      project: {
        '.git': {
          hooks: {
            'pre-push':
              '#!/bin/sh\n# BEGIN DUST HOOK\ndust pre push\nif [ $? -ne 0 ]; then\n  exit 1\nfi\n# END DUST HOOK',
          },
        },
      },
    })
    const dependencies = {
      arguments: ['my', 'task'],
      context,
      fileSystem,
      globScanner: fileSystem,
      settings: { dustCommand: 'dust' },
    }

    await focus(dependencies)
    const output = context.stdoutLines.join('\n')

    expect(output).toContain('🎯 Focus: my task')
    // With hooks installed, there should be no "check before committing" step
    expect(output).not.toContain('check` before committing')
  })
})
