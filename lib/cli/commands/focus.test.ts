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
})
