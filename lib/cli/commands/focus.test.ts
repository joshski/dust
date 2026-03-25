import { describe, expect, test } from 'vitest'
import {
  createContextEmulator,
  createFileSystemEmulator,
  createTestRuntimeConfig,
} from '../../test/test-utilities'
import type { CommandDependencies } from '../types'
import { buildImplementationInstructions, focus } from './focus'

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
    runtime: createTestRuntimeConfig(),
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
      runtime: createTestRuntimeConfig(),
      settings: { dustCommand: 'dust' },
    }

    await focus(dependencies)
    const output = context.stdoutLines.join('\n')

    expect(output).toContain('🎯 Focus: my task')
    // With hooks installed, there should be no "check before committing" step
    expect(output).not.toContain('check` before committing')
  })
})

describe('buildImplementationInstructions', () => {
  test('includes idea file deletion instruction for regular tasks', () => {
    const result = buildImplementationInstructions(
      'dust',
      false,
      'Add login',
      undefined,
      undefined,
      undefined,
      'refine'
    )

    expect(result).toContain('Deletion of the idea file that spawned this task')
  })

  test('omits idea file deletion instruction for implement type tasks', () => {
    const result = buildImplementationInstructions(
      'dust',
      false,
      'Add login feature',
      undefined,
      undefined,
      undefined,
      'implement'
    )

    expect(result).not.toContain(
      'Deletion of the idea file that spawned this task'
    )
  })

  test('includes idea file deletion instruction when no task type provided', () => {
    const result = buildImplementationInstructions('dust', false)

    expect(result).toContain('Deletion of the idea file that spawned this task')
  })

  test('includes install step when installCommand is provided', () => {
    const result = buildImplementationInstructions(
      'dust',
      false,
      'Add feature',
      undefined,
      'bun install'
    )

    expect(result).toContain('1. Run `bun install` to install dependencies')
    expect(result).toContain('2. Run `dust check`')
  })

  test('omits install step when installCommand is undefined', () => {
    const result = buildImplementationInstructions(
      'dust',
      false,
      'Add feature',
      undefined,
      undefined
    )

    expect(result).not.toContain('install dependencies')
    expect(result).toContain('1. Run `dust check`')
  })

  test('omits install and initial check when skipPreflightSteps is true', () => {
    const result = buildImplementationInstructions(
      'dust',
      false,
      'Add feature',
      undefined,
      'bun install',
      true
    )

    expect(result).not.toContain('install dependencies')
    expect(result).not.toContain('Run `dust check` to verify')
    expect(result).toContain('1. Implement the task')
    expect(result).toContain('check` passed before this session started')
  })

  test('preserves pre-commit check when skipPreflightSteps is true and hooks not installed', () => {
    const result = buildImplementationInstructions(
      'dust',
      false,
      'Add feature',
      undefined,
      'bun install',
      true
    )

    expect(result).toContain('`dust check` before committing')
  })

  test('skipPreflightSteps with hooks installed omits all check steps', () => {
    const result = buildImplementationInstructions(
      'dust',
      true,
      'Add feature',
      undefined,
      'bun install',
      true
    )

    expect(result).not.toContain('install dependencies')
    expect(result).not.toContain('Run `dust check` to verify')
    expect(result).not.toContain('`dust check` before committing')
    expect(result).toContain('check` passed before this session started')
    expect(result).toContain('1. Implement the task')
  })
})
