import type { ChildProcess } from 'node:child_process'
import { EventEmitter } from 'node:events'
import { describe, expect, test } from 'vitest'
import {
  createContextEmulator,
  createFileSystemEmulator,
} from '../../test/test-utilities'
import type { CommandDependencies } from '../types'
import {
  createDefaultDependencies,
  gitPull,
  hasAvailableTasks,
  type LoopDependencies,
  loopClaude,
  parseMaxIterations,
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

function createMockChildProcess(exitCode = 0) {
  const proc = new EventEmitter() as EventEmitter & {
    stdout: EventEmitter | null
    stderr: EventEmitter
  }
  proc.stdout = null
  proc.stderr = new EventEmitter()
  setTimeout(() => proc.emit('close', exitCode), 0)
  return proc as unknown as ChildProcess
}

function createMockSpawn(pullExitCode = 0) {
  return (() =>
    createMockChildProcess(pullExitCode)) as LoopDependencies['spawn']
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
    const spawn = (() => {
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
      return proc as unknown as ChildProcess
    }) as LoopDependencies['spawn']
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
    const spawn = (() => {
      const proc = new EventEmitter() as EventEmitter & {
        stdout: EventEmitter | null
        stderr: EventEmitter
      }
      proc.stdout = null
      proc.stderr = new EventEmitter()
      setTimeout(() => proc.emit('error', new Error('spawn ENOENT')), 0)
      return proc as unknown as ChildProcess
    }) as LoopDependencies['spawn']
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
      spawn: (() => {
        pullCalled = true
        return createMockChildProcess(0)
      }) as LoopDependencies['spawn'],
      run: async () => {},
      sleep: async () => {},
    }

    await runOneIteration(dependencies, loopDeps)
    expect(pullCalled).toBe(true)
  })

  test('spawns Claude to resolve git pull failures', async () => {
    const dependencies = createDependencies()
    const context = dependencies.context as ReturnType<
      typeof createContextEmulator
    >
    let claudePrompt: string | undefined
    const loopDeps: LoopDependencies = {
      spawn: (() => {
        const proc = new EventEmitter() as EventEmitter & {
          stdout: EventEmitter | null
          stderr: EventEmitter
        }
        proc.stdout = null
        proc.stderr = new EventEmitter()
        setTimeout(() => {
          proc.stderr.emit('data', Buffer.from('merge conflict'))
          proc.emit('close', 1)
        }, 0)
        return proc as unknown as ChildProcess
      }) as LoopDependencies['spawn'],
      run: async prompt => {
        claudePrompt = prompt
      },
      sleep: async () => {},
    }

    const result = await runOneIteration(dependencies, loopDeps)
    expect(result).toBe('resolved_pull_conflict')
    expect(context.stdoutLines.join('\n')).toContain('git pull failed')
    expect(context.stdoutLines.join('\n')).toContain(
      'Starting Claude to resolve'
    )
    expect(claudePrompt).toContain('merge conflict')
    expect(claudePrompt).toContain('git pull failed')
  })

  test('includes error message in Claude prompt for git pull failure', async () => {
    const dependencies = createDependencies()
    let claudePrompt: string | undefined
    const loopDeps: LoopDependencies = {
      spawn: (() => {
        const proc = new EventEmitter() as EventEmitter & {
          stdout: EventEmitter | null
          stderr: EventEmitter
        }
        proc.stdout = null
        proc.stderr = new EventEmitter()
        setTimeout(() => {
          proc.stderr.emit(
            'data',
            Buffer.from('CONFLICT (content): Merge conflict in file.txt')
          )
          proc.emit('close', 1)
        }, 0)
        return proc as unknown as ChildProcess
      }) as LoopDependencies['spawn'],
      run: async prompt => {
        claudePrompt = prompt
      },
      sleep: async () => {},
    }

    await runOneIteration(dependencies, loopDeps)
    expect(claudePrompt).toContain(
      'CONFLICT (content): Merge conflict in file.txt'
    )
  })

  test('continues loop after Claude resolves git pull conflict', async () => {
    const dependencies = createDependencies()
    const context = dependencies.context as ReturnType<
      typeof createContextEmulator
    >
    const loopDeps: LoopDependencies = {
      spawn: (() => {
        const proc = new EventEmitter() as EventEmitter & {
          stdout: EventEmitter | null
          stderr: EventEmitter
        }
        proc.stdout = null
        proc.stderr = new EventEmitter()
        setTimeout(() => {
          proc.stderr.emit('data', Buffer.from('conflict'))
          proc.emit('close', 1)
        }, 0)
        return proc as unknown as ChildProcess
      }) as LoopDependencies['spawn'],
      run: async () => {},
      sleep: async () => {},
    }

    await runOneIteration(dependencies, loopDeps)
    expect(context.stdoutLines.join('\n')).toContain(
      'Claude resolved the git pull conflict'
    )
    expect(context.stdoutLines.join('\n')).toContain('Continuing loop')
  })

  test('handles Claude failure when resolving git pull conflict', async () => {
    const dependencies = createDependencies()
    const context = dependencies.context as ReturnType<
      typeof createContextEmulator
    >
    const loopDeps: LoopDependencies = {
      spawn: (() => {
        const proc = new EventEmitter() as EventEmitter & {
          stdout: EventEmitter | null
          stderr: EventEmitter
        }
        proc.stdout = null
        proc.stderr = new EventEmitter()
        setTimeout(() => {
          proc.stderr.emit('data', Buffer.from('conflict'))
          proc.emit('close', 1)
        }, 0)
        return proc as unknown as ChildProcess
      }) as LoopDependencies['spawn'],
      run: async () => {
        throw new Error('Claude crashed')
      },
      sleep: async () => {},
    }

    const result = await runOneIteration(dependencies, loopDeps)
    // Should still return no_tasks and continue the loop
    expect(result).toBe('no_tasks')
    expect(context.stderrLines.join('\n')).toContain(
      'Claude failed to resolve git pull conflict'
    )
    expect(context.stdoutLines.join('\n')).toContain(
      'Continuing loop despite unresolved conflict'
    )
  })

  test('handles non-Error throws from Claude when resolving git pull conflict', async () => {
    const dependencies = createDependencies()
    const context = dependencies.context as ReturnType<
      typeof createContextEmulator
    >
    const loopDeps: LoopDependencies = {
      spawn: (() => {
        const proc = new EventEmitter() as EventEmitter & {
          stdout: EventEmitter | null
          stderr: EventEmitter
        }
        proc.stdout = null
        proc.stderr = new EventEmitter()
        setTimeout(() => {
          proc.stderr.emit('data', Buffer.from('conflict'))
          proc.emit('close', 1)
        }, 0)
        return proc as unknown as ChildProcess
      }) as LoopDependencies['spawn'],
      run: async () => {
        throw 'string error'
      },
      sleep: async () => {},
    }

    const result = await runOneIteration(dependencies, loopDeps)
    expect(result).toBe('no_tasks')
    expect(context.stderrLines.join('\n')).toContain('string error')
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

describe('parseMaxIterations', () => {
  test('returns default when no arguments', () => {
    expect(parseMaxIterations([])).toBe(10)
  })

  test('parses valid positive integer', () => {
    expect(parseMaxIterations(['5'])).toBe(5)
    expect(parseMaxIterations(['100'])).toBe(100)
  })

  test('returns default for invalid input', () => {
    expect(parseMaxIterations(['abc'])).toBe(10)
    expect(parseMaxIterations(['0'])).toBe(10)
    expect(parseMaxIterations(['-5'])).toBe(10)
  })
})

describe('loopClaude', () => {
  test('outputs startup message with max iterations', async () => {
    const dependencies = createDependencies()
    dependencies.arguments = ['3']
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
      await loopClaude(dependencies, loopDeps)
    } catch (e) {
      if (!(e instanceof LoopBreaker)) throw e
    }

    expect(context.stdoutLines.join('\n')).toContain(
      '🔄 Starting dust loop claude (max 3 iterations)'
    )
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
      await loopClaude(dependencies, loopDeps)
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
    dependencies.arguments = ['1']
    let sleepCalled = false
    let runCount = 0
    const loopDeps: LoopDependencies = {
      spawn: createMockSpawn(),
      run: async () => {
        runCount++
      },
      sleep: async () => {
        sleepCalled = true
      },
    }

    await loopClaude(dependencies, loopDeps)

    expect(sleepCalled).toBe(false)
    expect(runCount).toBe(1)
  })

  test('exits after max iterations', async () => {
    const dependencies = createDependencies({
      project: {
        '.dust': {
          tasks: { 'task.md': '# Task\n\n## Blocked by\n\n(none)' },
        },
      },
    })
    dependencies.arguments = ['3']
    const context = dependencies.context as ReturnType<
      typeof createContextEmulator
    >
    let runCount = 0
    const loopDeps: LoopDependencies = {
      spawn: createMockSpawn(),
      run: async () => {
        runCount++
      },
      sleep: async () => {},
    }

    const result = await loopClaude(dependencies, loopDeps)

    expect(runCount).toBe(3)
    expect(result.exitCode).toBe(0)
    expect(context.stdoutLines.join('\n')).toContain(
      '🏁 Reached max iterations (3)'
    )
  })

  test('sleep iterations do not count toward max', async () => {
    // Create two tasks - one blocked, one unblocked
    // The blocked task references the unblocked one, so completing unblocked task
    // would unblock the second one.
    // But for this test, we just want to verify sleeps don't count:
    // - Start with one blocked task (sleeps once)
    // - Add an unblocked task during sleep
    // - Claude runs twice
    const dependencies = createDependencies({
      project: {
        '.dust': {
          tasks: {
            // This task is blocked because it references a non-existent task
            // Actually no - blockers are only blocked if the referenced task EXISTS
            // So we need a different setup: just use an empty tasks dir
          },
        },
      },
    })
    // Remove the empty object from files since it's not a valid file
    const fileSystem = dependencies.fileSystem as ReturnType<
      typeof createFileSystemEmulator
    >
    dependencies.arguments = ['2']
    let sleepCount = 0
    let runCount = 0

    const loopDeps: LoopDependencies = {
      spawn: createMockSpawn(),
      run: async () => {
        runCount++
      },
      sleep: async () => {
        sleepCount++
        // After first sleep, add an unblocked task so Claude can run
        if (sleepCount === 1) {
          fileSystem.files.set(
            '/project/.dust/tasks/task.md',
            '# Task\n\n## Blocked by\n\n(none)'
          )
        }
      },
    }

    const result = await loopClaude(dependencies, loopDeps)

    // Should have slept at least once before unblocked tasks appeared
    expect(sleepCount).toBeGreaterThanOrEqual(1)
    // Should run exactly max iterations (2)
    expect(runCount).toBe(2)
    expect(result.exitCode).toBe(0)
  })

  test('uses default max iterations when not specified', async () => {
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
    let runCount = 0
    const loopDeps: LoopDependencies = {
      spawn: createMockSpawn(),
      run: async () => {
        runCount++
      },
      sleep: async () => {},
    }

    await loopClaude(dependencies, loopDeps)

    expect(runCount).toBe(10)
    expect(context.stdoutLines.join('\n')).toContain('max 10 iterations')
  })
})
