import { describe, expect, test } from 'vitest'
import {
  asTestType,
  createContextEmulator,
  createFileSystemEmulator,
  createSpawnEmulator,
  createTestRuntimeConfig,
  createTestSessionConfig,
} from '../../test-support/test-utilities'
import type { LoopDependencies } from '../../loop/iteration'
import type { CommandDependencies } from '../types'
import { loopClaude } from './loop-claude'

function createDependencies(
  tree: Parameters<typeof createFileSystemEmulator>[0] = {}
): CommandDependencies {
  const context = createContextEmulator()
  const fileSystem = createFileSystemEmulator(tree)
  return {
    arguments: [],
    context,
    fileSystem,
    globScanner: fileSystem,
    runtime: createTestRuntimeConfig(),
    settings: { dustCommand: 'dust' },
  }
}

function createLoopDeps(
  overrides: Partial<LoopDependencies> = {}
): LoopDependencies {
  const { spawn } = createSpawnEmulator({ autoResolve: true })
  return {
    spawn: asTestType<LoopDependencies['spawn']>(spawn),
    run: async () => {},
    sleep: async () => {},
    postEvent: async () => {},
    session: createTestSessionConfig(),
    ...overrides,
  }
}

describe('loopClaude', () => {
  test('delegates to runLoop and returns result', async () => {
    const dependencies = createDependencies({
      project: {
        '.dust': {
          tasks: {
            'task.md':
              '# Task\n\n## Blocked By\n\n(none)\n\n## Definition of Done\n\n- Done',
          },
        },
      },
    })
    dependencies.arguments = ['1']
    let runCalled = false
    const loopDeps = createLoopDeps({
      run: async () => {
        runCalled = true
      },
    })

    const result = await loopClaude(dependencies, loopDeps)

    expect(runCalled).toBe(true)
    expect(result.exitCode).toBe(0)
  })
})
