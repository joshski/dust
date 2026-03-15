import { EventEmitter } from 'node:events'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import type { EventMessage } from '../agent-events'
import {
  asChildProcessStub,
  createContextEmulator,
  createFileSystemEmulator,
  restoreEnv,
  stubEnv,
} from '../test/test-utilities'
import type { CommandDependencies } from '../cli/types'
import type { LoopDependencies } from './iteration'
import type { PostEventFn } from './wire-events'
import { runLoop } from './loop'

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

describe('runLoop', () => {
  beforeEach(() => {
    stubEnv('DUST_UNATTENDED', undefined)
  })

  afterEach(() => {
    restoreEnv()
  })

  test('refuses to run when DUST_UNATTENDED is set', async () => {
    stubEnv('DUST_UNATTENDED', '1')
    const dependencies = createDependencies()
    const context = dependencies.context as ReturnType<
      typeof createContextEmulator
    >
    const result = await runLoop(dependencies, createLoopDeps())
    expect(result.exitCode).toBe(1)
    expect(context.stderrLines.join('\n')).toContain(
      'dust loop cannot run inside an unattended session'
    )
  })

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
      await runLoop(dependencies, loopDeps)
    } catch (e) {
      if (!(e instanceof LoopBreaker)) throw e
    }

    expect(context.stdoutLines.join('\n')).toContain(
      'Starting dust loop claude (max 3 iterations)'
    )
    expect(context.stdoutLines.join('\n')).toContain('Ctrl+C')
  })

  test('sleeps when no tasks available', async () => {
    const dependencies = createDependencies()
    let sleepCalled = false
    let sleepMs: number | null = null
    const loopDeps = createLoopDeps({
      sleep: async ms => {
        sleepCalled = true
        sleepMs = ms
        throw new LoopBreaker()
      },
    })

    try {
      await runLoop(dependencies, loopDeps)
    } catch (e) {
      if (!(e instanceof LoopBreaker)) throw e
    }

    expect(sleepCalled).toBe(true)
    expect(sleepMs).toBe(1000)
  })

  test('prints sleep dots on a single line and starts next loop output on a new line', async () => {
    const dependencies = createDependencies({
      project: {
        '.dust': {
          tasks: {},
        },
      },
    })
    const fileSystem = dependencies.fileSystem as ReturnType<
      typeof createFileSystemEmulator
    >
    const context = dependencies.context as ReturnType<
      typeof createContextEmulator
    >
    dependencies.arguments = ['1']

    const sleepCalls: number[] = []
    let runCount = 0

    const loopDeps = createLoopDeps({
      run: async () => {
        runCount++
      },
      sleep: async ms => {
        sleepCalls.push(ms)
        if (sleepCalls.length === 1) {
          fileSystem.files.set(
            '/project/.dust/tasks/task.md',
            '# Task\n\n## Blocked By\n\n(none)\n\n## Definition of Done\n\n- Done'
          )
        }
      },
    })

    const result = await runLoop(dependencies, loopDeps)

    expect(result.exitCode).toBe(0)
    expect(runCount).toBe(1)
    expect(sleepCalls.length).toBeGreaterThan(0)
    expect(sleepCalls.every(ms => ms === 1000)).toBe(true)

    const dotsLine = '.'.repeat(sleepCalls.length)
    const dotsLineIndex = context.stdoutLines.indexOf(dotsLine)
    expect(dotsLineIndex).toBeGreaterThanOrEqual(0)
    expect(context.stdoutLines).not.toContain('.')
    expect(context.stdoutLines[dotsLineIndex + 1]).toBe('')
    expect(context.stdoutLines[dotsLineIndex + 2]).toBe('Syncing with remote')
  })

  test('falls back to line output when stdoutInline is unavailable', async () => {
    const dependencies = createDependencies({
      project: {
        '.dust': {
          tasks: {},
        },
      },
    })
    const fileSystem = dependencies.fileSystem as ReturnType<
      typeof createFileSystemEmulator
    >
    const context = dependencies.context as ReturnType<
      typeof createContextEmulator
    >

    dependencies.context = {
      cwd: context.cwd,
      stdout: context.stdout,
      stderr: context.stderr,
    }
    dependencies.arguments = ['1']

    const sleepCalls: number[] = []
    let runCount = 0

    const loopDeps = createLoopDeps({
      run: async () => {
        runCount++
      },
      sleep: async ms => {
        sleepCalls.push(ms)
        if (sleepCalls.length === 1) {
          fileSystem.files.set(
            '/project/.dust/tasks/task.md',
            '# Task\n\n## Blocked By\n\n(none)\n\n## Definition of Done\n\n- Done'
          )
        }
      },
    })

    const result = await runLoop(dependencies, loopDeps)

    expect(result.exitCode).toBe(0)
    expect(runCount).toBe(1)
    expect(sleepCalls.length).toBeGreaterThan(0)
    expect(context.stdoutLines).toContain('.')
  })

  test('does not sleep when tasks are available', async () => {
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

    await runLoop(dependencies, loopDeps)

    expect(sleepCalled).toBe(false)
    expect(runCount).toBe(1)
  })

  test('exits after max iterations', async () => {
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

    const result = await runLoop(dependencies, loopDeps)

    expect(runCount).toBe(3)
    expect(result.exitCode).toBe(0)
    expect(context.stdoutLines.join('\n')).toContain(
      'Reached max iterations (3)'
    )
  })

  test('sleep iterations do not count toward max', async () => {
    const dependencies = createDependencies({
      project: {
        '.dust': {
          tasks: {},
        },
      },
    })
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
            '# Task\n\n## Blocked By\n\n(none)\n\n## Definition of Done\n\n- Done'
          )
        }
      },
    })

    const result = await runLoop(dependencies, loopDeps)

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
          tasks: {
            'task.md':
              '# Task\n\n## Blocked By\n\n(none)\n\n## Definition of Done\n\n- Done',
          },
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

    await runLoop(dependencies, loopDeps)

    expect(runCount).toBe(10)
    expect(context.stdoutLines.join('\n')).toContain('max 10 iterations')
  })

  test('outputs formatted agent-session-ended error message when Claude fails', async () => {
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
    const context = dependencies.context as ReturnType<
      typeof createContextEmulator
    >
    const loopDeps = createLoopDeps({
      run: async () => {
        throw new Error('Claude crashed')
      },
    })

    await runLoop(dependencies, loopDeps)

    expect(context.stdoutLines.join('\n')).toContain(
      'Agent session ended (error: Claude crashed)'
    )
  })

  test('outputs formatted sync_skipped message when git pull fails', async () => {
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
        return asChildProcessStub(proc)
      }) as LoopDependencies['spawn'],
      run: async () => {},
    })

    await runLoop(dependencies, loopDeps)

    expect(context.stdoutLines.join('\n')).toContain(
      'Note: git pull skipped (no remote configured)'
    )
  })

  test('posts events with types when eventsUrl is configured in settings', async () => {
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

    await runLoop(dependencies, loopDeps)

    // Only agent session events are posted (loop.* events are filtered out)
    expect(postedEvents.length).toBeGreaterThan(0)
    expect(postedEvents[0].url).toBe('http://example.com/events')
    expect(postedEvents[0].payload.sequence).toBe(1)
    expect(postedEvents[0].payload.event.type).toBe('agent-session-started')
    expect((postedEvents[0].payload.event as { title?: string }).title).toBe(
      'Task'
    )

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
          tasks: {
            'task.md':
              '# Task\n\n## Blocked By\n\n(none)\n\n## Definition of Done\n\n- Done',
          },
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

    await runLoop(dependencies, loopDeps)

    expect(postCalled).toBe(false)
  })

  test('logs error to stderr when event POST fails', async () => {
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

    await runLoop(dependencies, loopDeps)
    await Promise.resolve()
    await Promise.resolve()

    expect(context.stderrLines.join('\n')).toContain('Event POST failed')
    expect(context.stderrLines.join('\n')).toContain('Network timeout')
  })

  test('handles non-Error throws from event POST', async () => {
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

    await runLoop(dependencies, loopDeps)
    await Promise.resolve()
    await Promise.resolve()

    expect(context.stderrLines.join('\n')).toContain('Event POST failed')
    expect(context.stderrLines.join('\n')).toContain('string error from POST')
  })

  test('does not emit raw events when eventsUrl is not configured', async () => {
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
    dependencies.settings = {
      dustCommand: 'dust',
    }
    let capturedOnRawEvent: unknown = 'not-set'
    const loopDeps = createLoopDeps({
      run: async (_prompt, options) => {
        capturedOnRawEvent = (options as { onRawEvent?: unknown })?.onRawEvent
      },
    })

    await runLoop(dependencies, loopDeps)

    expect(capturedOnRawEvent).toBeUndefined()
  })

  test('includes dust-generated agentSessionId on all events from first event', async () => {
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

    await runLoop(dependencies, loopDeps)

    // All events should have the same dust-generated agentSessionId
    expect(postedEvents.length).toBeGreaterThan(0)
    const agentSessionId = postedEvents[0].payload.agentSessionId
    expect(agentSessionId).toBeDefined()
    for (const event of postedEvents) {
      expect(event.payload.agentSessionId).toBe(agentSessionId)
    }
  })

  test('generates different agentSessionId for each iteration', async () => {
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
    dependencies.arguments = ['2']
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

    await runLoop(dependencies, loopDeps)

    // Find agent-session-started events (there should be 2, one per iteration)
    const sessionStartedEvents = postedEvents.filter(
      e => e.payload.event.type === 'agent-session-started'
    )
    expect(sessionStartedEvents).toHaveLength(2)

    // Both should have agentSessionId (dust-generated UUID)
    expect(sessionStartedEvents[0].payload.agentSessionId).toBeDefined()
    expect(sessionStartedEvents[1].payload.agentSessionId).toBeDefined()

    // They should be different UUIDs
    expect(sessionStartedEvents[0].payload.agentSessionId).not.toBe(
      sessionStartedEvents[1].payload.agentSessionId
    )

    // agent-session-ended events should have the same agentSessionId as their corresponding started event
    const sessionEndedEvents = postedEvents.filter(
      e => e.payload.event.type === 'agent-session-ended'
    )
    expect(sessionEndedEvents).toHaveLength(2)
    expect(sessionEndedEvents[0].payload.agentSessionId).toBe(
      sessionStartedEvents[0].payload.agentSessionId
    )
    expect(sessionEndedEvents[1].payload.agentSessionId).toBe(
      sessionStartedEvents[1].payload.agentSessionId
    )
  })

  test('emits raw events automatically when eventsUrl is configured', async () => {
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

    await runLoop(dependencies, loopDeps)

    // Verify raw events were posted as agent-event type
    const claudeEvents = postedEvents.filter(
      e => e.payload.event.type === 'agent-event'
    )
    expect(claudeEvents.length).toBe(1)
    expect(
      (claudeEvents[0].payload.event as { rawEvent: Record<string, unknown> })
        .rawEvent
    ).toEqual({ type: 'text_delta', text: 'Hello' })

    // Verify raw events are NOT output to console (formatAgentEvent returns null)
    expect(context.stdoutLines.join('\n')).not.toContain('text_delta')
    expect(context.stdoutLines.join('\n')).not.toContain('raw_event')
  })

  test('detects Docker mode when .dust/Dockerfile exists', async () => {
    const originalToken = process.env.CLAUDE_CODE_OAUTH_TOKEN
    process.env.CLAUDE_CODE_OAUTH_TOKEN = 'test-token'

    const dependencies = createDependencies({
      project: {
        '.dust': {
          Dockerfile: 'FROM node:20',
          tasks: {
            'task.md':
              '# Task\n\n## Blocked By\n\n(none)\n\n## Definition of Done\n\n- Done',
          },
        },
      },
    })
    dependencies.arguments = ['1']
    const context = dependencies.context as ReturnType<
      typeof createContextEmulator
    >
    const loopDeps = createLoopDeps({
      run: async () => {},
      dockerDeps: {
        existsSync: (p: string) => p === '/project/.dust/Dockerfile',
        homedir: () => '/home/user',
        spawn: createMockSpawn(0),
      },
    })

    await runLoop(dependencies, loopDeps)

    expect(context.stdoutLines.join('\n')).toContain(
      'Docker mode: found .dust/Dockerfile'
    )
    expect(context.stdoutLines.join('\n')).toContain('Building Docker image')
    expect(context.stdoutLines.join('\n')).toContain(
      'Docker image dust-agent-project ready'
    )

    if (originalToken === undefined) delete process.env.CLAUDE_CODE_OAUTH_TOKEN
    else process.env.CLAUDE_CODE_OAUTH_TOKEN = originalToken
  })

  test('returns error when CLAUDE_CODE_OAUTH_TOKEN is not set in Docker mode', async () => {
    const originalToken = process.env.CLAUDE_CODE_OAUTH_TOKEN
    delete process.env.CLAUDE_CODE_OAUTH_TOKEN

    const dependencies = createDependencies({
      project: {
        '.dust': {
          Dockerfile: 'FROM node:20',
          tasks: {
            'task.md':
              '# Task\n\n## Blocked By\n\n(none)\n\n## Definition of Done\n\n- Done',
          },
        },
      },
    })
    dependencies.arguments = ['1']
    const context = dependencies.context as ReturnType<
      typeof createContextEmulator
    >
    const loopDeps = createLoopDeps({
      run: async () => {},
      dockerDeps: {
        existsSync: (p: string) => p === '/project/.dust/Dockerfile',
        homedir: () => '/home/user',
        spawn: createMockSpawn(0),
      },
    })

    const result = await runLoop(dependencies, loopDeps)

    expect(result.exitCode).toBe(1)
    expect(context.stderrLines.join('\n')).toContain('CLAUDE_CODE_OAUTH_TOKEN')

    if (originalToken === undefined) delete process.env.CLAUDE_CODE_OAUTH_TOKEN
    else process.env.CLAUDE_CODE_OAUTH_TOKEN = originalToken
  })

  test('returns error when Docker not available', async () => {
    const dependencies = createDependencies({
      project: {
        '.dust': {
          Dockerfile: 'FROM node:20',
        },
      },
    })
    dependencies.arguments = ['1']
    const context = dependencies.context as ReturnType<
      typeof createContextEmulator
    >
    const loopDeps = createLoopDeps({
      dockerDeps: {
        existsSync: (p: string) => p === '/project/.dust/Dockerfile',
        homedir: () => '/home/user',
        spawn: createMockSpawn(1), // Docker --version fails
      },
    })

    const result = await runLoop(dependencies, loopDeps)

    expect(result.exitCode).toBe(1)
    expect(context.stderrLines.join('\n')).toContain('Docker not available')
  })

  test('returns error when Docker build fails', async () => {
    const dependencies = createDependencies({
      project: {
        '.dust': {
          Dockerfile: 'FROM node:20',
        },
      },
    })
    dependencies.arguments = ['1']
    const context = dependencies.context as ReturnType<
      typeof createContextEmulator
    >
    let dockerCallCount = 0
    const loopDeps = createLoopDeps({
      dockerDeps: {
        existsSync: (p: string) => p === '/project/.dust/Dockerfile',
        homedir: () => '/home/user',
        spawn: (() => {
          dockerCallCount++
          // First call is docker --version (success), second is docker build (fail)
          if (dockerCallCount === 1) {
            return createMockChildProcess(0)
          }
          const proc = new EventEmitter() as EventEmitter & {
            stdout: EventEmitter | null
            stderr: EventEmitter
          }
          proc.stdout = null
          proc.stderr = new EventEmitter()
          setTimeout(() => {
            proc.stderr.emit(
              'data',
              Buffer.from('Build error: invalid Dockerfile')
            )
            proc.emit('close', 1)
          }, 0)
          return asChildProcessStub(proc)
        }) as LoopDependencies['spawn'],
      },
    })

    const result = await runLoop(dependencies, loopDeps)

    expect(result.exitCode).toBe(1)
    expect(context.stdoutLines.join('\n')).toContain('Docker error:')
    expect(context.stderrLines.join('\n')).toContain('Docker build failed')
  })
})

describe('integration: HTTP event posting', () => {
  beforeEach(() => {
    stubEnv('DUST_UNATTENDED', undefined)
  })

  afterEach(() => {
    restoreEnv()
  })

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
            tasks: {
              'task.md':
                '# Task\n\n## Blocked By\n\n(none)\n\n## Definition of Done\n\n- Done',
            },
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

      await runLoop(dependencies, loopDeps)

      // Yield to I/O until events arrive (including raw events)
      const hasExpectedEvents = () =>
        receivedEvents.some(e => e.event.type === 'agent-session-ended') &&
        receivedEvents.some(e => e.event.type === 'agent-event')
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

      // Verify agent-event was received
      const claudeEvent = receivedEvents.find(
        e => e.event.type === 'agent-event'
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
      expect((sessionStarted?.event as { title?: string }).title).toBe('Task')
      expect(sessionStarted?.agentSessionId).toBeDefined()
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
