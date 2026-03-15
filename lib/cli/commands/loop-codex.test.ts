import { EventEmitter } from 'node:events'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import {
  asChildProcessStub,
  createContextEmulator,
  createFileSystemEmulator,
  restoreEnv,
  stubEnv,
} from '../../test/test-utilities'
import type { CommandDependencies } from '../types'
import type { LoopDependencies } from './loop'
import { createCodexDependencies, loopCodex } from './loop-codex'

const VALID_TASK_CONTENT = `# Task

## Blocked By

(none)

## Definition of Done

- [ ] Done`

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

describe('createCodexDependencies', () => {
  test('returns dependencies with agentType codex', () => {
    const dependencies = createCodexDependencies()
    expect(dependencies.agentType).toBe('codex')
    expect(typeof dependencies.run).toBe('function')
    expect(typeof dependencies.spawn).toBe('function')
    expect(typeof dependencies.sleep).toBe('function')
    expect(typeof dependencies.postEvent).toBe('function')
  })

  test('allows overriding run while keeping agentType codex', () => {
    const customRun = async () => {}
    const dependencies = createCodexDependencies({ run: customRun })
    expect(dependencies.run).toBe(customRun)
    expect(dependencies.agentType).toBe('codex')
  })
})

describe('loopCodex', () => {
  beforeEach(() => {
    stubEnv('DUST_UNATTENDED', undefined)
  })

  afterEach(() => {
    restoreEnv()
  })

  test('uses codex agentType in startup message', async () => {
    const dependencies = createDependencies()
    dependencies.arguments = ['1']
    const context = dependencies.context as ReturnType<
      typeof createContextEmulator
    >

    class LoopBreaker extends Error {}
    const loopDeps = createLoopDeps({
      sleep: async () => {
        throw new LoopBreaker()
      },
    })

    try {
      await loopCodex(dependencies, loopDeps)
    } catch (e) {
      if (!(e instanceof LoopBreaker)) throw e
    }

    expect(context.stdoutLines.join('\n')).toContain('Starting dust loop codex')
  })

  test('emits agent-session-started with agentType codex', async () => {
    const dependencies = createDependencies({
      project: {
        '.dust': {
          tasks: { 'task.md': VALID_TASK_CONTENT },
        },
      },
    })
    dependencies.arguments = ['1']
    const context = dependencies.context as ReturnType<
      typeof createContextEmulator
    >
    const loopDeps = createLoopDeps({
      run: async () => {},
    })

    await loopCodex(dependencies, loopDeps)

    expect(context.stdoutLines.join('\n')).toContain('Starting Codex: Task')
  })

  test('uses Codex agent name in error messages', async () => {
    const dependencies = createDependencies({
      project: {
        '.dust': {
          tasks: { 'task.md': VALID_TASK_CONTENT },
        },
      },
    })
    dependencies.arguments = ['1']
    const context = dependencies.context as ReturnType<
      typeof createContextEmulator
    >
    const loopDeps = createLoopDeps({
      run: async () => {
        throw new Error('Codex crashed')
      },
    })

    await loopCodex(dependencies, loopDeps)

    expect(context.stderrLines.join('\n')).toContain('Codex exited with error')
  })

  test('injects codex run by default', async () => {
    const dependencies = createDependencies({
      project: {
        '.dust': {
          tasks: { 'task.md': VALID_TASK_CONTENT },
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

    await loopCodex(dependencies, loopDeps)
    expect(runCalled).toBe(true)
  })
})
