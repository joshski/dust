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

function createDeps(
  files: Map<string, string> = new Map()
): CommandDependencies {
  const ctx = createContextEmulator()
  const fs = createFileSystemEmulator({ files })
  return {
    arguments: [],
    context: ctx,
    fileSystem: fs,
    globScanner: fs,
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
    const deps = createDefaultDependencies()
    expect(typeof deps.spawn).toBe('function')
    expect(typeof deps.run).toBe('function')
    expect(typeof deps.sleep).toBe('function')
  })

  test('sleep function resolves after given time', async () => {
    const deps = createDefaultDependencies()
    // Use 0ms to avoid actual delay in tests
    await expect(deps.sleep(0)).resolves.toBeUndefined()
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
    const deps = createDeps()
    const result = await hasAvailableTasks(deps)
    expect(result).toBe(false)
  })

  test('returns true when tasks exist', async () => {
    const files = new Map([
      ['/project/.dust/tasks/task.md', '# Task\n\n## Blocked by\n\n(none)'],
    ])
    const deps = createDeps(files)
    const result = await hasAvailableTasks(deps)
    expect(result).toBe(true)
  })
})

describe('runOneIteration', () => {
  test('syncs with git pull', async () => {
    const deps = createDeps()
    let pullCalled = false
    const loopDeps: LoopDependencies = {
      spawn: () => {
        pullCalled = true
        return createMockSpawn(0)()
      },
      run: async () => {},
      sleep: async () => {},
    }

    await runOneIteration(deps, loopDeps)
    expect(pullCalled).toBe(true)
  })

  test('logs git pull failures', async () => {
    const deps = createDeps()
    const ctx = deps.context as ReturnType<typeof createContextEmulator>
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

    await runOneIteration(deps, loopDeps)
    expect(ctx.stdoutLines.join('\n')).toContain('git pull skipped')
  })

  test('returns no_tasks when no tasks available', async () => {
    const deps = createDeps()
    const loopDeps: LoopDependencies = {
      spawn: createMockSpawn(),
      run: async () => {},
      sleep: async () => {},
    }

    const result = await runOneIteration(deps, loopDeps)
    expect(result).toBe('no_tasks')
  })

  test('invokes Claude when tasks are available', async () => {
    const files = new Map([
      ['/project/.dust/tasks/task.md', '# Task\n\n## Blocked by\n\n(none)'],
    ])
    const deps = createDeps(files)
    let claudeCalled = false
    const loopDeps: LoopDependencies = {
      spawn: createMockSpawn(),
      run: async () => {
        claudeCalled = true
      },
      sleep: async () => {},
    }

    const result = await runOneIteration(deps, loopDeps)
    expect(claudeCalled).toBe(true)
    expect(result).toBe('ran_claude')
  })

  test('passes correct cwd to Claude run', async () => {
    const files = new Map([
      ['/project/.dust/tasks/task.md', '# Task\n\n## Blocked by\n\n(none)'],
    ])
    const deps = createDeps(files)
    let capturedCwd: string | undefined
    const loopDeps: LoopDependencies = {
      spawn: createMockSpawn(),
      run: async (_prompt, options) => {
        capturedCwd = options?.cwd
      },
      sleep: async () => {},
    }

    await runOneIteration(deps, loopDeps)
    expect(capturedCwd).toBe('/project')
  })

  test('handles Claude errors gracefully', async () => {
    const files = new Map([
      ['/project/.dust/tasks/task.md', '# Task\n\n## Blocked by\n\n(none)'],
    ])
    const deps = createDeps(files)
    const ctx = deps.context as ReturnType<typeof createContextEmulator>
    const loopDeps: LoopDependencies = {
      spawn: createMockSpawn(),
      run: async () => {
        throw new Error('Claude crashed')
      },
      sleep: async () => {},
    }

    const result = await runOneIteration(deps, loopDeps)
    expect(result).toBe('claude_error')
    expect(ctx.stderrLines.join('\n')).toContain('Claude exited with error')
    expect(ctx.stderrLines.join('\n')).toContain('Claude crashed')
  })

  test('handles non-Error throws from Claude', async () => {
    const files = new Map([
      ['/project/.dust/tasks/task.md', '# Task\n\n## Blocked by\n\n(none)'],
    ])
    const deps = createDeps(files)
    const ctx = deps.context as ReturnType<typeof createContextEmulator>
    const loopDeps: LoopDependencies = {
      spawn: createMockSpawn(),
      run: async () => {
        throw 'string error'
      },
      sleep: async () => {},
    }

    const result = await runOneIteration(deps, loopDeps)
    expect(result).toBe('claude_error')
    expect(ctx.stderrLines.join('\n')).toContain('string error')
  })
})

describe('loop', () => {
  test('outputs startup message', async () => {
    const deps = createDeps()
    const ctx = deps.context as ReturnType<typeof createContextEmulator>
    const loopDeps: LoopDependencies = {
      spawn: createMockSpawn(),
      run: async () => {},
      sleep: async () => {
        throw new LoopBreaker()
      },
    }

    try {
      await loop(deps, loopDeps)
    } catch (e) {
      if (!(e instanceof LoopBreaker)) throw e
    }

    expect(ctx.stdoutLines.join('\n')).toContain('Starting dust loop')
    expect(ctx.stdoutLines.join('\n')).toContain('Ctrl+C')
  })

  test('sleeps when no tasks available', async () => {
    const deps = createDeps()
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
      await loop(deps, loopDeps)
    } catch (e) {
      if (!(e instanceof LoopBreaker)) throw e
    }

    expect(sleepCalled).toBe(true)
  })

  test('does not sleep when tasks are available', async () => {
    const files = new Map([
      ['/project/.dust/tasks/task.md', '# Task\n\n## Blocked by\n\n(none)'],
    ])
    const deps = createDeps(files)
    let sleepCalled = false
    let runCount = 0
    const loopDeps: LoopDependencies = {
      spawn: createMockSpawn(),
      run: async () => {
        runCount++
        if (runCount >= 1) {
          files.clear() // Clear tasks so next iteration sleeps
        }
      },
      sleep: async () => {
        sleepCalled = true
        throw new LoopBreaker()
      },
    }

    try {
      await loop(deps, loopDeps)
    } catch (e) {
      if (!(e instanceof LoopBreaker)) throw e
    }

    // Sleep was called only after tasks were cleared
    expect(sleepCalled).toBe(true)
    expect(runCount).toBe(1)
  })
})
