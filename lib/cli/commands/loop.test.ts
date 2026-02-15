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
  createEventPoster,
  type DustWireEvent,
  type EmitFn,
  type EventMessage,
  formatEvent,
  gitPull,
  hasAvailableTasks,
  type LoopDependencies,
  loopClaude,
  type PostEventFn,
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

function createStubEmit(): EmitFn & { events: DustWireEvent[] } {
  const events: DustWireEvent[] = []
  const emit: EmitFn = (event: DustWireEvent) => {
    events.push(event)
  }
  return Object.assign(emit, { events })
}

describe('createDefaultDependencies', () => {
  test('returns object with spawn, run, sleep, and postEvent functions', () => {
    const loopDependencies = createDefaultDependencies()
    expect(typeof loopDependencies.spawn).toBe('function')
    expect(typeof loopDependencies.run).toBe('function')
    expect(typeof loopDependencies.sleep).toBe('function')
    expect(typeof loopDependencies.postEvent).toBe('function')
  })

  test('sleep function resolves after given time', async () => {
    const loopDependencies = createDefaultDependencies()
    // Use 0ms to avoid actual delay in tests
    await expect(loopDependencies.sleep(0)).resolves.toBeUndefined()
  })
})

describe('createEventPoster', () => {
  const testSessionId = 'test-session-123'

  test('does not post when eventsUrl is undefined', async () => {
    let postCalled = false
    const postEvent = async () => {
      postCalled = true
    }
    const emit = createEventPoster(
      undefined,
      testSessionId,
      postEvent,
      () => {}
    )
    emit({ type: 'loop.syncing' })
    await Promise.resolve()
    expect(postCalled).toBe(false)
  })

  test('does not post loop.* events (only agent session events)', async () => {
    const postedEvents: EventMessage[] = []
    const postEvent = async (_url: string, payload: EventMessage) => {
      postedEvents.push(payload)
    }
    const emit = createEventPoster(
      'http://example.com',
      testSessionId,
      postEvent,
      () => {}
    )
    emit({ type: 'loop.syncing' })
    emit({ type: 'loop.started', maxIterations: 5 })
    await Promise.resolve()
    expect(postedEvents).toHaveLength(0)
  })

  test('posts agent session events with sessionId, sequence number and timestamp', async () => {
    const postedEvents: EventMessage[] = []
    const postEvent = async (_url: string, payload: EventMessage) => {
      postedEvents.push(payload)
    }
    const emit = createEventPoster(
      'http://example.com',
      testSessionId,
      postEvent,
      () => {}
    )
    emit({ type: 'claude.started' })
    emit({ type: 'claude.ended', success: true })
    await Promise.resolve()
    expect(postedEvents).toHaveLength(2)
    expect(postedEvents[0].sequence).toBe(1)
    expect(postedEvents[0].sessionId).toBe(testSessionId)
    expect(postedEvents[0].event.type).toBe('agent-session-started')
    expect(postedEvents[1].sequence).toBe(2)
    expect(postedEvents[1].sessionId).toBe(testSessionId)
    expect(postedEvents[1].event.type).toBe('agent-session-ended')
  })

  test('includes ISO timestamp in posted events', async () => {
    const postedEvents: EventMessage[] = []
    const postEvent = async (_url: string, payload: EventMessage) => {
      postedEvents.push(payload)
    }
    const emit = createEventPoster(
      'http://example.com',
      testSessionId,
      postEvent,
      () => {}
    )
    emit({ type: 'claude.started' })
    await Promise.resolve()
    expect(postedEvents[0].timestamp).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/
    )
  })

  test('includes agentSessionId for all agent events when getter returns a value', async () => {
    const postedEvents: EventMessage[] = []
    const postEvent = async (_url: string, payload: EventMessage) => {
      postedEvents.push(payload)
    }
    const emit = createEventPoster(
      'http://example.com',
      testSessionId,
      postEvent,
      () => {},
      () => 'claude-session-abc'
    )
    emit({ type: 'claude.started' })
    emit({ type: 'claude.ended', success: true })
    await Promise.resolve()

    // All agent events should have agentSessionId
    expect(postedEvents[0].agentSessionId).toBe('claude-session-abc')
    expect(postedEvents[1].agentSessionId).toBe('claude-session-abc')
  })

  test('does not include agentSessionId when getter returns undefined', async () => {
    const postedEvents: EventMessage[] = []
    const postEvent = async (_url: string, payload: EventMessage) => {
      postedEvents.push(payload)
    }
    const emit = createEventPoster(
      'http://example.com',
      testSessionId,
      postEvent,
      () => {},
      () => undefined
    )
    emit({ type: 'claude.started' })
    await Promise.resolve()

    expect(postedEvents[0].agentSessionId).toBeUndefined()
  })

  test('calls onError when post fails', async () => {
    const errors: unknown[] = []
    const postEvent = async () => {
      throw new Error('Network error')
    }
    const emit = createEventPoster(
      'http://example.com',
      testSessionId,
      postEvent,
      (error: unknown) => {
        errors.push(error)
      }
    )
    emit({ type: 'claude.started' })
    await Promise.resolve()
    await Promise.resolve()
    expect(errors).toHaveLength(1)
    expect((errors[0] as Error).message).toBe('Network error')
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
    if (!result.success) {
      expect(result.message).toContain('fatal: not a git repository')
    }
  })

  test('returns default message when stderr is empty', async () => {
    const spawn = createMockSpawn(1)
    const result = await gitPull('/project', spawn)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.message).toBe('git pull failed')
    }
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
    if (!result.success) {
      expect(result.message).toBe('spawn ENOENT')
    }
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
          tasks: { 'task.md': '# Task\n\n## Blocked By\n\n(none)' },
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
    const loopDeps = createLoopDeps({
      spawn: (() => {
        pullCalled = true
        return createMockChildProcess(0)
      }) as LoopDependencies['spawn'],
    })
    const emit = createStubEmit()

    await runOneIteration(dependencies, loopDeps, emit)
    expect(pullCalled).toBe(true)
  })

  test('spawns Claude to resolve git pull failures and emits events', async () => {
    const dependencies = createDependencies()
    let claudePrompt: string | undefined
    const loopDeps = createLoopDeps({
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
    })
    const emit = createStubEmit()

    const result = await runOneIteration(dependencies, loopDeps, emit)
    expect(result).toBe('resolved_pull_conflict')
    expect(claudePrompt).toContain('merge conflict')
    expect(claudePrompt).toContain('git pull failed')

    // Check events
    const syncSkippedEvent = emit.events.find(
      event => event.type === 'loop.sync_skipped'
    )
    expect(syncSkippedEvent).toBeDefined()
    const claudeStarted = emit.events.find(
      event => event.type === 'claude.started'
    )
    const claudeEnded = emit.events.find(event => event.type === 'claude.ended')
    expect(claudeStarted).toBeDefined()
    expect(claudeEnded).toBeDefined()
    expect((claudeEnded as { success: boolean } | undefined)?.success).toBe(
      true
    )
  })

  test('handles Claude failure when resolving git pull conflict', async () => {
    const dependencies = createDependencies()
    const context = dependencies.context as ReturnType<
      typeof createContextEmulator
    >
    const loopDeps = createLoopDeps({
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
    })
    const emit = createStubEmit()

    const result = await runOneIteration(dependencies, loopDeps, emit)
    // Should still return no_tasks and continue the loop
    expect(result).toBe('no_tasks')
    expect(context.stderrLines.join('\n')).toContain(
      'Claude failed to resolve git pull conflict'
    )

    // Check claude.ended event with error
    const claudeEnded = emit.events.find(event => event.type === 'claude.ended')
    expect(claudeEnded).toBeDefined()
    expect((claudeEnded as { success: boolean } | undefined)?.success).toBe(
      false
    )
  })

  test('handles non-Error throws from Claude when resolving git pull conflict', async () => {
    const dependencies = createDependencies()
    const context = dependencies.context as ReturnType<
      typeof createContextEmulator
    >
    const loopDeps = createLoopDeps({
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
    })
    const emit = createStubEmit()

    const result = await runOneIteration(dependencies, loopDeps, emit)
    expect(result).toBe('no_tasks')
    expect(context.stderrLines.join('\n')).toContain('string error')
  })

  test('returns no_tasks when no tasks available', async () => {
    const dependencies = createDependencies()
    const loopDeps = createLoopDeps()
    const emit = createStubEmit()

    const result = await runOneIteration(dependencies, loopDeps, emit)
    expect(result).toBe('no_tasks')
  })

  test('invokes Claude when tasks are available', async () => {
    const dependencies = createDependencies({
      project: {
        '.dust': {
          tasks: { 'task.md': '# Task\n\n## Blocked By\n\n(none)' },
        },
      },
    })
    let claudeCalled = false
    const loopDeps = createLoopDeps({
      run: async () => {
        claudeCalled = true
      },
    })
    const emit = createStubEmit()

    const result = await runOneIteration(dependencies, loopDeps, emit)
    expect(claudeCalled).toBe(true)
    expect(result).toBe('ran_claude')
  })

  test('sends entry prompt with install, agent, and next commands', async () => {
    const dependencies = createDependencies({
      project: {
        '.dust': {
          tasks: { 'task.md': '# Task\n\n## Blocked By\n\n(none)' },
        },
      },
    })
    dependencies.settings = {
      dustCommand: 'bunx dust',
      installCommand: 'bun install',
    }
    let capturedPrompt: string | undefined
    const loopDeps = createLoopDeps({
      run: async prompt => {
        capturedPrompt = prompt
      },
    })
    const emit = createStubEmit()

    await runOneIteration(dependencies, loopDeps, emit)
    expect(capturedPrompt).toBe(
      'Run `bun install && bunx dust agent && bunx dust pick task` and follow the instructions.'
    )
  })

  test('uses default install command when not set in settings', async () => {
    const dependencies = createDependencies({
      project: {
        '.dust': {
          tasks: { 'task.md': '# Task\n\n## Blocked By\n\n(none)' },
        },
      },
    })
    let capturedPrompt: string | undefined
    const loopDeps = createLoopDeps({
      run: async prompt => {
        capturedPrompt = prompt
      },
    })
    const emit = createStubEmit()

    await runOneIteration(dependencies, loopDeps, emit)
    expect(capturedPrompt).toBe(
      'Run `npm install && dust agent && dust pick task` and follow the instructions.'
    )
  })

  test('passes correct cwd to Claude run', async () => {
    const dependencies = createDependencies({
      project: {
        '.dust': {
          tasks: { 'task.md': '# Task\n\n## Blocked By\n\n(none)' },
        },
      },
    })
    let capturedCwd: string | undefined
    const loopDeps = createLoopDeps({
      run: async (_prompt, options) => {
        // Options is now RunOptions with spawnOptions inside
        const runOptions = options as { spawnOptions?: { cwd?: string } }
        capturedCwd = runOptions?.spawnOptions?.cwd
      },
    })
    const emit = createStubEmit()

    await runOneIteration(dependencies, loopDeps, emit)
    expect(capturedCwd).toBe('/project')
  })

  test('passes DUST_UNATTENDED env var to Claude', async () => {
    const dependencies = createDependencies({
      project: {
        '.dust': {
          tasks: { 'task.md': '# Task\n\n## Blocked By\n\n(none)' },
        },
      },
    })
    let capturedEnv: Record<string, string> | undefined
    const loopDeps = createLoopDeps({
      run: async (_prompt, options) => {
        const runOptions = options as {
          spawnOptions?: { env?: Record<string, string> }
        }
        capturedEnv = runOptions?.spawnOptions?.env
      },
    })
    const emit = createStubEmit()

    await runOneIteration(dependencies, loopDeps, emit, {})

    expect(capturedEnv).toBeDefined()
    expect(capturedEnv?.DUST_UNATTENDED).toBe('1')
  })

  test('handles Claude errors gracefully', async () => {
    const dependencies = createDependencies({
      project: {
        '.dust': {
          tasks: { 'task.md': '# Task\n\n## Blocked By\n\n(none)' },
        },
      },
    })
    const context = dependencies.context as ReturnType<
      typeof createContextEmulator
    >
    const loopDeps = createLoopDeps({
      run: async () => {
        throw new Error('Claude crashed')
      },
    })
    const emit = createStubEmit()

    const result = await runOneIteration(dependencies, loopDeps, emit)
    expect(result).toBe('claude_error')
    expect(context.stderrLines.join('\n')).toContain('Claude exited with error')
    expect(context.stderrLines.join('\n')).toContain('Claude crashed')
  })

  test('handles non-Error throws from Claude', async () => {
    const dependencies = createDependencies({
      project: {
        '.dust': {
          tasks: { 'task.md': '# Task\n\n## Blocked By\n\n(none)' },
        },
      },
    })
    const context = dependencies.context as ReturnType<
      typeof createContextEmulator
    >
    const loopDeps = createLoopDeps({
      run: async () => {
        throw 'string error'
      },
    })
    const emit = createStubEmit()

    const result = await runOneIteration(dependencies, loopDeps, emit)
    expect(result).toBe('claude_error')
    expect(context.stderrLines.join('\n')).toContain('string error')
  })

  test('emits claude.started and claude.ended events', async () => {
    const dependencies = createDependencies({
      project: {
        '.dust': {
          tasks: { 'task.md': '# Task\n\n## Blocked By\n\n(none)' },
        },
      },
    })
    const loopDeps = createLoopDeps({
      run: async () => {},
    })
    const emit = createStubEmit()

    await runOneIteration(dependencies, loopDeps, emit)

    const startedEvent = emit.events.find(
      event => event.type === 'claude.started'
    )
    const endedEvent = emit.events.find(event => event.type === 'claude.ended')
    expect(startedEvent).toBeDefined()
    expect(startedEvent?.type).toBe('claude.started')
    expect(endedEvent).toBeDefined()
    expect(endedEvent?.type).toBe('claude.ended')
    expect((endedEvent as { success: boolean } | undefined)?.success).toBe(true)
  })

  test('emits claude.ended with error message on failure', async () => {
    const dependencies = createDependencies({
      project: {
        '.dust': {
          tasks: { 'task.md': '# Task\n\n## Blocked By\n\n(none)' },
        },
      },
    })
    const loopDeps = createLoopDeps({
      run: async () => {
        throw new Error('Claude crashed')
      },
    })
    const emit = createStubEmit()

    await runOneIteration(dependencies, loopDeps, emit)

    const endedEvent = emit.events.find(event => event.type === 'claude.ended')
    expect(endedEvent).toBeDefined()
    expect((endedEvent as { success: boolean } | undefined)?.success).toBe(
      false
    )
    expect((endedEvent as { error: string } | undefined)?.error).toBe(
      'Claude crashed'
    )
  })

  test('passes onRawEvent callback to Claude run when provided', async () => {
    const dependencies = createDependencies({
      project: {
        '.dust': {
          tasks: { 'task.md': '# Task\n\n## Blocked By\n\n(none)' },
        },
      },
    })
    const emit = createStubEmit()
    const rawEvents: Record<string, unknown>[] = []

    const loopDeps = createLoopDeps({
      run: async (_prompt, options) => {
        // Check if onRawEvent is passed in RunOptions format and call it
        const onRawEvent = (
          options as { onRawEvent?: (e: Record<string, unknown>) => void }
        )?.onRawEvent
        if (onRawEvent) {
          // Invoke the callback with a test event
          onRawEvent({ type: 'text_delta', text: 'Hello' })
        }
      },
    })

    await runOneIteration(dependencies, loopDeps, emit, {
      onRawEvent: rawEvent => rawEvents.push(rawEvent),
    })

    // Verify the raw event was received by the callback
    expect(rawEvents).toHaveLength(1)
    expect(rawEvents[0]).toEqual({
      type: 'text_delta',
      text: 'Hello',
    })
  })

  test('does not pass onRawEvent callback when not provided', async () => {
    const dependencies = createDependencies({
      project: {
        '.dust': {
          tasks: { 'task.md': '# Task\n\n## Blocked By\n\n(none)' },
        },
      },
    })
    const emit = createStubEmit()
    let capturedOnRawEvent: unknown = 'not-set'

    const loopDeps = createLoopDeps({
      run: async (_prompt, options) => {
        capturedOnRawEvent = (options as { onRawEvent?: unknown })?.onRawEvent
      },
    })

    await runOneIteration(dependencies, loopDeps, emit)

    expect(capturedOnRawEvent).toBeUndefined()
  })
})

describe('formatEvent', () => {
  test('returns null for claude.raw_event', () => {
    const result = formatEvent({
      type: 'claude.raw_event',
      rawEvent: { type: 'text_delta', text: 'Hello' },
    })
    expect(result).toBeNull()
  })

  test('returns null for loop.checking_tasks', () => {
    const result = formatEvent({ type: 'loop.checking_tasks' })
    expect(result).toBeNull()
  })

  test('returns string for other event types', () => {
    expect(formatEvent({ type: 'loop.syncing' })).toBe('🌍 Syncing with remote')
    expect(formatEvent({ type: 'loop.started', maxIterations: 5 })).toBe(
      '🔄 Starting dust loop claude (max 5 iterations)...'
    )
    expect(formatEvent({ type: 'claude.started' })).toBe(
      '🤖 Starting Claude...'
    )
  })

  test('returns no_tasks message with trailing newline', () => {
    const result = formatEvent({ type: 'loop.no_tasks' })
    expect(result).toBe('😴 No tasks available. Sleeping...\n')
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
    const loopDeps = createLoopDeps({
      sleep: async () => {
        throw new LoopBreaker()
      },
    })

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
    const loopDeps = createLoopDeps({
      sleep: async () => {
        sleepCalled = true
        throw new LoopBreaker()
      },
    })

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
          tasks: { 'task.md': '# Task\n\n## Blocked By\n\n(none)' },
        },
      },
    })
    dependencies.arguments = ['1']
    let sleepCalled = false
    let runCount = 0
    const loopDeps = createLoopDeps({
      run: async () => {
        runCount++
      },
      sleep: async () => {
        sleepCalled = true
      },
    })

    await loopClaude(dependencies, loopDeps)

    expect(sleepCalled).toBe(false)
    expect(runCount).toBe(1)
  })

  test('exits after max iterations', async () => {
    const dependencies = createDependencies({
      project: {
        '.dust': {
          tasks: { 'task.md': '# Task\n\n## Blocked By\n\n(none)' },
        },
      },
    })
    dependencies.arguments = ['3']
    const context = dependencies.context as ReturnType<
      typeof createContextEmulator
    >
    let runCount = 0
    const loopDeps = createLoopDeps({
      run: async () => {
        runCount++
      },
    })

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

    const loopDeps = createLoopDeps({
      run: async () => {
        runCount++
      },
      sleep: async () => {
        sleepCount++
        // After first sleep, add an unblocked task so Claude can run
        if (sleepCount === 1) {
          fileSystem.files.set(
            '/project/.dust/tasks/task.md',
            '# Task\n\n## Blocked By\n\n(none)'
          )
        }
      },
    })

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
          tasks: { 'task.md': '# Task\n\n## Blocked By\n\n(none)' },
        },
      },
    })
    const context = dependencies.context as ReturnType<
      typeof createContextEmulator
    >
    let runCount = 0
    const loopDeps = createLoopDeps({
      run: async () => {
        runCount++
      },
    })

    await loopClaude(dependencies, loopDeps)

    expect(runCount).toBe(10)
    expect(context.stdoutLines.join('\n')).toContain('max 10 iterations')
  })

  test('outputs formatted claude.ended error message when Claude fails', async () => {
    const dependencies = createDependencies({
      project: {
        '.dust': {
          tasks: { 'task.md': '# Task\n\n## Blocked By\n\n(none)' },
        },
      },
    })
    dependencies.arguments = ['1']
    const context = dependencies.context as ReturnType<
      typeof createContextEmulator
    >
    const loopDeps = createLoopDeps({
      run: async () => {
        throw new Error('Claude crashed')
      },
    })

    await loopClaude(dependencies, loopDeps)

    expect(context.stdoutLines.join('\n')).toContain(
      '🤖 Claude session ended (error: Claude crashed)'
    )
  })

  test('outputs formatted sync_skipped message when git pull fails', async () => {
    const dependencies = createDependencies({
      project: {
        '.dust': {
          tasks: { 'task.md': '# Task\n\n## Blocked By\n\n(none)' },
        },
      },
    })
    dependencies.arguments = ['1']
    const context = dependencies.context as ReturnType<
      typeof createContextEmulator
    >
    const loopDeps = createLoopDeps({
      spawn: (() => {
        const proc = new EventEmitter() as EventEmitter & {
          stdout: EventEmitter | null
          stderr: EventEmitter
        }
        proc.stdout = null
        proc.stderr = new EventEmitter()
        setTimeout(() => {
          proc.stderr.emit('data', Buffer.from('no remote configured'))
          proc.emit('close', 1)
        }, 0)
        return proc as unknown as ChildProcess
      }) as LoopDependencies['spawn'],
      run: async () => {},
    })

    await loopClaude(dependencies, loopDeps)

    expect(context.stdoutLines.join('\n')).toContain(
      'Note: git pull skipped (no remote configured)'
    )
  })

  test('posts events with types when eventsUrl is configured in settings', async () => {
    const dependencies = createDependencies({
      project: {
        '.dust': {
          tasks: { 'task.md': '# Task\n\n## Blocked By\n\n(none)' },
        },
      },
    })
    dependencies.arguments = ['1']
    dependencies.settings = {
      dustCommand: 'dust',
      eventsUrl: 'http://example.com/events',
    }
    const postedEvents: { url: string; payload: EventMessage }[] = []
    const loopDeps = createLoopDeps({
      run: async () => {},
      postEvent: async (url, payload) => {
        postedEvents.push({ url, payload })
      },
    })

    await loopClaude(dependencies, loopDeps)

    // Only agent session events are posted (loop.* events are filtered out)
    expect(postedEvents.length).toBeGreaterThan(0)
    expect(postedEvents[0].url).toBe('http://example.com/events')
    expect(postedEvents[0].payload.sequence).toBe(1)
    expect(postedEvents[0].payload.event.type).toBe('agent-session-started')

    const sessionEnded = postedEvents.find(
      event => event.payload.event.type === 'agent-session-ended'
    )
    expect(sessionEnded).toBeDefined()

    // Verify no loop.* events were posted
    const loopEvents = postedEvents.filter(event =>
      event.payload.event.type.startsWith('loop.')
    )
    expect(loopEvents).toHaveLength(0)
  })

  test('does not post events when eventsUrl is not configured', async () => {
    const dependencies = createDependencies({
      project: {
        '.dust': {
          tasks: { 'task.md': '# Task\n\n## Blocked By\n\n(none)' },
        },
      },
    })
    dependencies.arguments = ['1']
    let postCalled = false
    const loopDeps = createLoopDeps({
      run: async () => {},
      postEvent: async () => {
        postCalled = true
      },
    })

    await loopClaude(dependencies, loopDeps)

    expect(postCalled).toBe(false)
  })

  test('logs error to stderr when event POST fails', async () => {
    const dependencies = createDependencies({
      project: {
        '.dust': {
          tasks: { 'task.md': '# Task\n\n## Blocked By\n\n(none)' },
        },
      },
    })
    dependencies.arguments = ['1']
    dependencies.settings = {
      dustCommand: 'dust',
      eventsUrl: 'http://example.com/events',
    }
    const context = dependencies.context as ReturnType<
      typeof createContextEmulator
    >
    const loopDeps = createLoopDeps({
      run: async () => {},
      postEvent: async () => {
        throw new Error('Network timeout')
      },
    })

    await loopClaude(dependencies, loopDeps)
    await Promise.resolve()
    await Promise.resolve()

    expect(context.stderrLines.join('\n')).toContain('Event POST failed')
    expect(context.stderrLines.join('\n')).toContain('Network timeout')
  })

  test('handles non-Error throws from event POST', async () => {
    const dependencies = createDependencies({
      project: {
        '.dust': {
          tasks: { 'task.md': '# Task\n\n## Blocked By\n\n(none)' },
        },
      },
    })
    dependencies.arguments = ['1']
    dependencies.settings = {
      dustCommand: 'dust',
      eventsUrl: 'http://example.com/events',
    }
    const context = dependencies.context as ReturnType<
      typeof createContextEmulator
    >
    const loopDeps = createLoopDeps({
      run: async () => {},
      postEvent: async () => {
        throw 'string error from POST'
      },
    })

    await loopClaude(dependencies, loopDeps)
    await Promise.resolve()
    await Promise.resolve()

    expect(context.stderrLines.join('\n')).toContain('Event POST failed')
    expect(context.stderrLines.join('\n')).toContain('string error from POST')
  })

  test('does not emit raw events when eventsUrl is not configured', async () => {
    const dependencies = createDependencies({
      project: {
        '.dust': {
          tasks: { 'task.md': '# Task\n\n## Blocked By\n\n(none)' },
        },
      },
    })
    dependencies.arguments = ['1']
    dependencies.settings = {
      dustCommand: 'dust',
    }
    let capturedOnRawEvent: unknown = 'not-set'
    const loopDeps = createLoopDeps({
      run: async (_prompt, options) => {
        capturedOnRawEvent = (options as { onRawEvent?: unknown })?.onRawEvent
      },
    })

    await loopClaude(dependencies, loopDeps)

    expect(capturedOnRawEvent).toBeUndefined()
  })

  test('includes agentSessionId in events after session_id is extracted from a raw event', async () => {
    const dependencies = createDependencies({
      project: {
        '.dust': {
          tasks: { 'task.md': '# Task\n\n## Blocked By\n\n(none)' },
        },
      },
    })
    dependencies.arguments = ['1']
    dependencies.settings = {
      dustCommand: 'dust',
      eventsUrl: 'http://example.com/events',
    }
    const postedEvents: { url: string; payload: EventMessage }[] = []
    const loopDeps = createLoopDeps({
      run: async (_prompt, options) => {
        const onRawEvent = (
          options as { onRawEvent?: (e: Record<string, unknown>) => void }
        )?.onRawEvent
        if (onRawEvent) {
          // Simulate a result event with session_id
          onRawEvent({ type: 'stream_event', session_id: 'claude-session-xyz' })
        }
      },
      postEvent: async (url, payload) => {
        postedEvents.push({ url, payload })
      },
    })

    await loopClaude(dependencies, loopDeps)

    // agent-session-ended is emitted after run completes, so it should have the agentSessionId
    const sessionEnded = postedEvents.find(
      e => e.payload.event.type === 'agent-session-ended'
    )
    expect(sessionEnded?.payload.agentSessionId).toBe('claude-session-xyz')
  })

  test('resets agentSessionId between iterations', async () => {
    const dependencies = createDependencies({
      project: {
        '.dust': {
          tasks: { 'task.md': '# Task\n\n## Blocked By\n\n(none)' },
        },
      },
    })
    dependencies.arguments = ['2']
    dependencies.settings = {
      dustCommand: 'dust',
      eventsUrl: 'http://example.com/events',
    }
    const postedEvents: { url: string; payload: EventMessage }[] = []
    let runCount = 0
    const loopDeps = createLoopDeps({
      run: async (_prompt, options) => {
        runCount++
        const onRawEvent = (
          options as { onRawEvent?: (e: Record<string, unknown>) => void }
        )?.onRawEvent
        if (onRawEvent) {
          // Only emit session_id on first run
          if (runCount === 1) {
            onRawEvent({ type: 'stream_event', session_id: 'session-1' })
          }
          // Second run: no result event, so agentSessionId should be undefined
        }
      },
      postEvent: async (url, payload) => {
        postedEvents.push({ url, payload })
      },
    })

    await loopClaude(dependencies, loopDeps)

    // Find agent-session-started events (there should be 2, one per iteration)
    const sessionStartedEvents = postedEvents.filter(
      e => e.payload.event.type === 'agent-session-started'
    )
    expect(sessionStartedEvents).toHaveLength(2)

    // First iteration's agent-session-started won't have agentSessionId (it's emitted before run)
    expect(sessionStartedEvents[0].payload.agentSessionId).toBeUndefined()
    // Second iteration's agent-session-started also won't have it (reset between iterations)
    expect(sessionStartedEvents[1].payload.agentSessionId).toBeUndefined()

    // First iteration's agent-session-ended should have session-1
    const sessionEndedEvents = postedEvents.filter(
      e => e.payload.event.type === 'agent-session-ended'
    )
    expect(sessionEndedEvents).toHaveLength(2)
    expect(sessionEndedEvents[0].payload.agentSessionId).toBe('session-1')
    // Second iteration's agent-session-ended should NOT have agentSessionId
    expect(sessionEndedEvents[1].payload.agentSessionId).toBeUndefined()
  })

  test('emits raw events automatically when eventsUrl is configured', async () => {
    const dependencies = createDependencies({
      project: {
        '.dust': {
          tasks: { 'task.md': '# Task\n\n## Blocked By\n\n(none)' },
        },
      },
    })
    dependencies.arguments = ['1']
    dependencies.settings = {
      dustCommand: 'dust',
      eventsUrl: 'http://example.com/events',
    }
    const context = dependencies.context as ReturnType<
      typeof createContextEmulator
    >
    const postedEvents: { url: string; payload: EventMessage }[] = []
    const loopDeps = createLoopDeps({
      run: async (_prompt, options) => {
        // Simulate raw events from Claude by calling the callback
        const onRawEvent = (
          options as { onRawEvent?: (e: Record<string, unknown>) => void }
        )?.onRawEvent
        if (onRawEvent) {
          onRawEvent({ type: 'text_delta', text: 'Hello' })
        }
      },
      postEvent: async (url, payload) => {
        postedEvents.push({ url, payload })
      },
    })

    await loopClaude(dependencies, loopDeps)

    // Verify raw events were posted as claude-event type
    const claudeEvents = postedEvents.filter(
      e => e.payload.event.type === 'claude-event'
    )
    expect(claudeEvents.length).toBe(1)
    expect(
      (claudeEvents[0].payload.event as { rawEvent: Record<string, unknown> })
        .rawEvent
    ).toEqual({ type: 'text_delta', text: 'Hello' })

    // Verify raw events are NOT output to console (formatEvent returns null)
    expect(context.stdoutLines.join('\n')).not.toContain('text_delta')
    expect(context.stdoutLines.join('\n')).not.toContain('raw_event')
  })
})

describe('integration: HTTP event posting', () => {
  test('posts events to actual HTTP endpoint', async () => {
    const { createServer } = await import('node:http')

    // Create a mock HTTP server that collects posted events
    const receivedEvents: EventMessage[] = []
    const server = createServer((request, response) => {
      if (request.method === 'POST') {
        let body = ''
        request.on('data', chunk => {
          body += chunk.toString()
        })
        request.on('end', () => {
          receivedEvents.push(JSON.parse(body))
          response.writeHead(200)
          response.end()
        })
      }
    })

    // Start server on random available port
    await new Promise<void>(resolve => {
      server.listen(0, '127.0.0.1', resolve)
    })
    const address = server.address() as { port: number }
    const eventsUrl = `http://127.0.0.1:${address.port}/events`

    try {
      const dependencies = createDependencies({
        project: {
          '.dust': {
            tasks: { 'task.md': '# Task\n\n## Blocked By\n\n(none)' },
          },
        },
      })
      dependencies.arguments = ['1']
      dependencies.settings = {
        dustCommand: 'dust',
        eventsUrl,
      }

      // Use real postEvent (via fetch) to test HTTP integration
      const realPostEvent: PostEventFn = async (url, payload) => {
        await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }

      const loopDeps = createLoopDeps({
        postEvent: realPostEvent,
        run: async (_prompt, options) => {
          // Simulate raw events
          const onRawEvent = (
            options as { onRawEvent?: (e: Record<string, unknown>) => void }
          )?.onRawEvent
          if (onRawEvent) {
            onRawEvent({ type: 'text_delta', text: 'Integration test' })
          }
        },
      })

      await loopClaude(dependencies, loopDeps)

      // Yield to I/O until events arrive (including raw events)
      const hasExpectedEvents = () =>
        receivedEvents.some(e => e.event.type === 'agent-session-ended') &&
        receivedEvents.some(e => e.event.type === 'claude-event')
      for (let i = 0; i < 100 && !hasExpectedEvents(); i++) {
        await new Promise(resolve => setTimeout(resolve, 5))
      }

      // Verify events were received by the HTTP server
      expect(receivedEvents.length).toBeGreaterThan(0)

      // Verify event structure
      const firstEvent = receivedEvents[0]
      expect(firstEvent.sequence).toBe(1)
      expect(firstEvent.sessionId).toBeDefined()
      expect(firstEvent.timestamp).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/
      )
      expect(firstEvent.event.type).toBeDefined()

      // Verify claude-event was received
      const claudeEvent = receivedEvents.find(
        e => e.event.type === 'claude-event'
      )
      expect(claudeEvent).toBeDefined()
      expect(
        (claudeEvent?.event as { rawEvent: Record<string, unknown> }).rawEvent
      ).toEqual({
        type: 'text_delta',
        text: 'Integration test',
      })

      // Verify agent session events
      const sessionStarted = receivedEvents.find(
        e => e.event.type === 'agent-session-started'
      )
      const sessionEnded = receivedEvents.find(
        e => e.event.type === 'agent-session-ended'
      )
      expect(sessionStarted).toBeDefined()
      expect(sessionEnded).toBeDefined()

      // Verify no loop.* events were posted
      const loopEvents = receivedEvents.filter(e =>
        e.event.type.startsWith('loop.')
      )
      expect(loopEvents).toHaveLength(0)
    } finally {
      server.close()
    }
  })
})
