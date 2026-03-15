import { EventEmitter } from 'node:events'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import {
  asChildProcessStub,
  createContextEmulator,
  createFileSystemEmulator,
  restoreEnv,
  stubEnv,
} from '../../test/test-utilities'
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
    settings: { dustCommand: 'dust' },
  }
}

function createMockChildProcess(exitCode = 0) {
  const proc = new EventEmitter() as EventEmitter & {
    stdout: EventEmitter | null
    stderr: EventEmitter
  }
  proc.stdout = null
  proc.stderr = new EventEmitter()
  setTimeout(() => proc.emit('close', exitCode), 0)
  return asChildProcessStub(proc)
}

function createMockSpawn(pullExitCode = 0) {
  return (() =>
    createMockChildProcess(pullExitCode)) as LoopDependencies['spawn']
}

function createLoopDeps(
  overrides: Partial<LoopDependencies> = {}
): LoopDependencies {
  return {
    spawn: createMockSpawn(),
    run: async () => {},
    sleep: async () => {},
    postEvent: async () => {},
    ...overrides,
  }
}

describe('loopClaude', () => {
  beforeEach(() => {
    stubEnv('DUST_UNATTENDED', undefined)
  })

  afterEach(() => {
    restoreEnv()
  })

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
