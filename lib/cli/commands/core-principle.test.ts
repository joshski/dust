import { describe, expect, test } from 'vitest'
import { createTestRuntimeConfig } from '../../test-support/test-utilities'
import type {
  CommandContext,
  CommandDependencies,
  FileSystem,
  GlobScanner,
} from '../types'
import { corePrinciple } from './core-principle'

function createMockContext(): CommandContext & {
  stdoutLines: string[]
  stderrLines: string[]
} {
  const stdoutLines: string[] = []
  const stderrLines: string[] = []
  return {
    cwd: '/project',
    stdout: stdoutLines.push.bind(stdoutLines),
    stderr: stderrLines.push.bind(stderrLines),
    stdoutLines,
    stderrLines,
  }
}

function createMockFileSystem(): FileSystem {
  return {
    exists: () => false,
    isDirectory: () => false,
    getFileCreationTime: () => 0,
    readFile: async () => '',
    writeFile: async () => {},
    mkdir: async () => {},
    readdir: async () => [],
    chmod: async () => {},
    rename: async () => {},
  }
}

function createMockGlob(): GlobScanner {
  return {
    scan: async function* () {
      // Empty by default
    },
  }
}

function createDependencies(
  context: CommandContext,
  commandArguments: string[] = []
): CommandDependencies {
  return {
    arguments: commandArguments,
    context,
    fileSystem: createMockFileSystem(),
    globScanner: createMockGlob(),
    runtime: createTestRuntimeConfig(),
    settings: { dustCommand: 'dust' },
  }
}

describe('core principle command', () => {
  test('returns error when no principle name provided', async () => {
    const context = createMockContext()

    const result = await corePrinciple(createDependencies(context, []))

    expect(result.exitCode).toBe(1)
    expect(context.stderrLines.join('\n')).toContain('Missing principle name')
    expect(context.stderrLines.join('\n')).toContain(
      'Usage: dust core principle <name>'
    )
  })

  test('returns error when principle not found', async () => {
    const context = createMockContext()

    const result = await corePrinciple(
      createDependencies(context, ['nonexistent-principle'])
    )

    expect(result.exitCode).toBe(1)
    expect(context.stderrLines.join('\n')).toContain(
      'Core principle "nonexistent-principle" not found'
    )
  })

  test('displays principle content when found', async () => {
    const context = createMockContext()

    // Use a principle we know exists in bundled core principles
    const result = await corePrinciple(
      createDependencies(context, ['unsurprising-ux'])
    )

    expect(result.exitCode).toBe(0)
    expect(context.stdoutLines.length).toBe(1)
    expect(context.stdoutLines[0]).toContain('# Unsurprising UX')
  })

  test('displays different principle when requested', async () => {
    const context = createMockContext()

    // Test with another core principle
    const result = await corePrinciple(
      createDependencies(context, ['batteries-included'])
    )

    expect(result.exitCode).toBe(0)
    expect(context.stdoutLines.length).toBe(1)
    expect(context.stdoutLines[0]).toContain('# Batteries Included')
  })
})
