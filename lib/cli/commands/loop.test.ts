import { EventEmitter } from 'node:events'
import { describe, expect, test } from 'vitest'
import {
  createContextEmulator,
  createFileSystemEmulator,
} from '../test-utilities'
import type { CommandDependencies } from '../types'
import {
  createDefaultDependencies,
  gitPull,
  hasAvailableTasks,
  type LoopDependencies,
  loop,
  runOneIteration,
} from './loop'

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

function createMockSpawn(pullExitCode = 0) {
  return () => {
    const proc = new EventEmitter() as EventEmitter & {
      stdout: EventEmitter | null
      stderr: EventEmitter
    }
    proc.stdout = null
    proc.stderr = new EventEmitter()
    setTimeout(() => proc.emit('close', pullExitCode), 0)
    return proc
  }
}

class LoopBreaker extends Error {
  constructor() {
    super('Loop broken for testing')
  }
}

describe('createDefaultDependencies', () => {
  test('returns object with spawn, run, and sleep functions', () => {
    const loopDependencies = createDefaultDependencies()
    expect(typeof loopDependencies.spawn).toBe('function')
    expect(typeof loopDependencies.run).toBe('function')
    expect(typeof loopDependencies.sleep).toBe('function')
  })

  test('sleep function resolves after given time', async () => {
    const loopDependencies = createDefaultDependencies()
    // Use 0ms to avoid actual delay in tests
    await expect(loopDependencies.sleep(0)).resolves.toBeUndefined()
  })
})

describe('gitPull', () => {
  test('returns success on exit code 0', async () => {
    const spawn = createMockSpawn(0)
    const result = await gitPull('/project', spawn)
    expect(result.success).toBe(true)
  })

  test('returns failure with stderr on non-zero exit', async () => {
    const spawn = () => {
      const proc = new EventEmitter() as EventEmitter & {
        stdout: EventEmitter | null
        stderr: EventEmitter
      }
      proc.stdout = null
      proc.stderr = new EventEmitter()
      setTimeout(() => {
        proc.stderr.emit('data', Buffer.from('fatal: not a git repository'))
        proc.emit('close', 128)
      }, 0)
      return proc
    }
    const result = await gitPull('/project', spawn)
    expect(result.success).toBe(false)
    expect(result.message).toContain('fatal: not a git repository')
  })

  test('returns default message when stderr is empty', async () => {
    const spawn = createMockSpawn(1)
    const result = await gitPull('/project', spawn)
    expect(result.success).toBe(false)
    expect(result.message).toBe('git pull failed')
  })

  test('handles spawn errors', async () => {
    const spawn = () => {
      const proc = new EventEmitter() as EventEmitter & {
        stdout: EventEmitter | null
        stderr: EventEmitter
      }
      proc.stdout = null
      proc.stderr = new EventEmitter()
      setTimeout(() => proc.emit('error', new Error('spawn ENOENT')), 0)
      return proc
    }
    const result = await gitPull('/project', spawn)
    expect(result.success).toBe(false)
    expect(result.message).toBe('spawn ENOENT')
  })
})

describe('hasAvailableTasks', () => {
  test('returns false when no tasks exist', async () => {
    const dependencies = createDependencies()
    const result = await hasAvailableTasks(dependencies)
    expect(result).toBe(false)
  })

  test('returns true when tasks exist', async () => {
    const dependencies = createDependencies({
      project: {
        '.dust': {
          tasks: { 'task.md': '# Task\n\n## Blocked by\n\n(none)' },
        },
      },
    })
    const result = await hasAvailableTasks(dependencies)
    expect(result).toBe(true)
  })
})

describe('runOneIteration', () => {
  test('syncs with git pull', async () => {
    const dependencies = createDependencies()
    let pullCalled = false
    const loopDeps: LoopDependencies = {
      spawn: () => {
        pullCalled = true
        return createMockSpawn(0)()
      },
      run: async () => {},
      sleep: async () => {},
    }

    await runOneIteration(dependencies, loopDeps)
    expect(pullCalled).toBe(true)
  })

  test('logs git pull failures', async () => {
    const dependencies = createDependencies()
    const context = dependencies.context as ReturnType<
      typeof createContextEmulator
    >
    const loopDeps: LoopDependencies = {
      spawn: () => {
        const proc = new EventEmitter() as ReturnType<typeof createMockSpawn>
        proc.stdout = null
        proc.stderr = new EventEmitter()
        setTimeout(() => {
          proc.stderr.emit('data', Buffer.from('no remote'))
          proc.emit('close', 1)
        }, 0)
        return proc
      },
      run: async () => {},
      sleep: async () => {},
    }

    await runOneIteration(dependencies, loopDeps)
    expect(context.stdoutLines.join('\n')).toContain('git pull skipped')
  })

  test('returns no_tasks when no tasks available', async () => {
    const dependencies = createDependencies()
    const loopDeps: LoopDependencies = {
      spawn: createMockSpawn(),
      run: async () => {},
      sleep: async () => {},
    }

    const result = await runOneIteration(dependencies, loopDeps)
    expect(result).toBe('no_tasks')
  })

  test('invokes Claude when tasks are available', async () => {
    const dependencies = createDependencies({
      project: {
        '.dust': {
          tasks: { 'task.md': '# Task\n\n## Blocked by\n\n(none)' },
        },
      },
    })
    let claudeCalled = false
    const loopDeps: LoopDependencies = {
      spawn: createMockSpawn(),
      run: async () => {
        claudeCalled = true
      },
      sleep: async () => {},
    }

    const result = await runOneIteration(dependencies, loopDeps)
    expect(claudeCalled).toBe(true)
    expect(result).toBe('ran_claude')
  })

  test('passes correct cwd to Claude run', async () => {
    const dependencies = createDependencies({
      project: {
        '.dust': {
          tasks: { 'task.md': '# Task\n\n## Blocked by\n\n(none)' },
        },
      },
    })
    let capturedCwd: string | undefined
    const loopDeps: LoopDependencies = {
      spawn: createMockSpawn(),
      run: async (_prompt, options) => {
        capturedCwd = options?.cwd
      },
      sleep: async () => {},
    }

    await runOneIteration(dependencies, loopDeps)
    expect(capturedCwd).toBe('/project')
  })

  test('handles Claude errors gracefully', async () => {
    const dependencies = createDependencies({
      project: {
        '.dust': {
          tasks: { 'task.md': '# Task\n\n## Blocked by\n\n(none)' },
        },
      },
    })
    const context = dependencies.context as ReturnType<
      typeof createContextEmulator
    >
    const loopDeps: LoopDependencies = {
      spawn: createMockSpawn(),
      run: async () => {
        throw new Error('Claude crashed')
      },
      sleep: async () => {},
    }

    const result = await runOneIteration(dependencies, loopDeps)
    expect(result).toBe('claude_error')
    expect(context.stderrLines.join('\n')).toContain('Claude exited with error')
    expect(context.stderrLines.join('\n')).toContain('Claude crashed')
  })

  test('handles non-Error throws from Claude', async () => {
    const dependencies = createDependencies({
      project: {
        '.dust': {
          tasks: { 'task.md': '# Task\n\n## Blocked by\n\n(none)' },
        },
      },
    })
    const context = dependencies.context as ReturnType<
      typeof createContextEmulator
    >
    const loopDeps: LoopDependencies = {
      spawn: createMockSpawn(),
      run: async () => {
        throw 'string error'
      },
      sleep: async () => {},
    }

    const result = await runOneIteration(dependencies, loopDeps)
    expect(result).toBe('claude_error')
    expect(context.stderrLines.join('\n')).toContain('string error')
  })
})

describe('loop', () => {
  test('outputs startup message', async () => {
    const dependencies = createDependencies()
    const context = dependencies.context as ReturnType<
      typeof createContextEmulator
    >
    const loopDeps: LoopDependencies = {
      spawn: createMockSpawn(),
      run: async () => {},
      sleep: async () => {
        throw new LoopBreaker()
      },
    }

    try {
      await loop(dependencies, loopDeps)
    } catch (e) {
      if (!(e instanceof LoopBreaker)) throw e
    }

    expect(context.stdoutLines.join('\n')).toContain('Starting dust loop')
    expect(context.stdoutLines.join('\n')).toContain('Ctrl+C')
  })

  test('sleeps when no tasks available', async () => {
    const dependencies = createDependencies()
    let sleepCalled = false
    const loopDeps: LoopDependencies = {
      spawn: createMockSpawn(),
      run: async () => {},
      sleep: async () => {
        sleepCalled = true
        throw new LoopBreaker()
      },
    }

    try {
      await loop(dependencies, loopDeps)
    } catch (e) {
      if (!(e instanceof LoopBreaker)) throw e
    }

    expect(sleepCalled).toBe(true)
  })

  test('does not sleep when tasks are available', async () => {
    const dependencies = createDependencies({
      project: {
        '.dust': {
          tasks: { 'task.md': '# Task\n\n## Blocked by\n\n(none)' },
        },
      },
    })
    const fileSystem = dependencies.fileSystem as ReturnType<
      typeof createFileSystemEmulator
    >
    let sleepCalled = false
    let runCount = 0
    const loopDeps: LoopDependencies = {
      spawn: createMockSpawn(),
      run: async () => {
        runCount++
        if (runCount >= 1) {
          // Clear tasks by deleting from the emulator's internal files map
          fileSystem.files.delete('/project/.dust/tasks/task.md')
        }
      },
      sleep: async () => {
        sleepCalled = true
        throw new LoopBreaker()
      },
    }

    try {
      await loop(dependencies, loopDeps)
    } catch (e) {
      if (!(e instanceof LoopBreaker)) throw e
    }

    // Sleep was called only after tasks were cleared
    expect(sleepCalled).toBe(true)
    expect(runCount).toBe(1)
  })
})
