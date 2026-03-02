import { describe, expect, test } from 'vitest'
import type { AgentSessionEvent } from '../agent-events'
import type { RunnerDependencies } from '../claude/run'
import type { SendEventFn } from './events'
import { createLogBuffer, getLogLines } from './log-buffer'
import type { RepositoryDependencies, RepositoryState } from './repository'
import {
  buildEventMessage,
  createAgentEventHandler,
  createBufferRun,
  createBufferStdoutSink,
  createCancelHandler,
  createLogCallbacks,
  createLoopEventHandler,
  createWakeUpHandler,
  flushAndLogMultiLine,
  type LoopState,
  noOpPostEvent,
  runRepositoryLoop,
  setupFallbackTimeout,
} from './repository-loop'

describe('createLogCallbacks', () => {
  test('stdout appends to log buffer with stdout stream', () => {
    const buffer = createLogBuffer()
    const callbacks = createLogCallbacks(buffer)

    callbacks.stdout('hello world')

    const lines = getLogLines(buffer)
    expect(lines).toHaveLength(1)
    expect(lines[0].text).toBe('hello world')
    expect(lines[0].stream).toBe('stdout')
  })

  test('stderr appends to log buffer with stderr stream', () => {
    const buffer = createLogBuffer()
    const callbacks = createLogCallbacks(buffer)

    callbacks.stderr('error message')

    const lines = getLogLines(buffer)
    expect(lines).toHaveLength(1)
    expect(lines[0].text).toBe('error message')
    expect(lines[0].stream).toBe('stderr')
  })

  test('multiple calls append multiple lines', () => {
    const buffer = createLogBuffer()
    const callbacks = createLogCallbacks(buffer)

    callbacks.stdout('line 1')
    callbacks.stderr('error 1')
    callbacks.stdout('line 2')

    const lines = getLogLines(buffer)
    expect(lines).toHaveLength(3)
    expect(lines.map(l => l.text)).toEqual(['line 1', 'error 1', 'line 2'])
    expect(lines.map(l => l.stream)).toEqual(['stdout', 'stderr', 'stdout'])
  })
})

describe('flushAndLogMultiLine', () => {
  test('logs text as single line when no partial and no newlines', () => {
    const buffer = createLogBuffer()

    const result = flushAndLogMultiLine('', 'hello', buffer)

    expect(result).toBe('')
    const lines = getLogLines(buffer)
    expect(lines).toHaveLength(1)
    expect(lines[0].text).toBe('hello')
  })

  test('flushes partial line before logging new text', () => {
    const buffer = createLogBuffer()

    const result = flushAndLogMultiLine('pending', 'new text', buffer)

    expect(result).toBe('')
    const lines = getLogLines(buffer)
    expect(lines).toHaveLength(2)
    expect(lines[0].text).toBe('pending')
    expect(lines[1].text).toBe('new text')
  })

  test('splits multi-line text into separate log lines', () => {
    const buffer = createLogBuffer()

    const result = flushAndLogMultiLine('', 'line1\nline2\nline3', buffer)

    expect(result).toBe('')
    const lines = getLogLines(buffer)
    expect(lines).toHaveLength(3)
    expect(lines.map(l => l.text)).toEqual(['line1', 'line2', 'line3'])
  })

  test('flushes partial and splits multi-line text', () => {
    const buffer = createLogBuffer()

    const result = flushAndLogMultiLine('partial', 'first\nsecond', buffer)

    expect(result).toBe('')
    const lines = getLogLines(buffer)
    expect(lines).toHaveLength(3)
    expect(lines.map(l => l.text)).toEqual(['partial', 'first', 'second'])
  })

  test('does not flush when partial is empty', () => {
    const buffer = createLogBuffer()

    flushAndLogMultiLine('', 'only text', buffer)

    const lines = getLogLines(buffer)
    expect(lines).toHaveLength(1)
    expect(lines[0].text).toBe('only text')
  })
})

describe('buildEventMessage', () => {
  test('builds message with all required fields', () => {
    const event: AgentSessionEvent = {
      type: 'agent-session-started',
      title: 'Test',
      prompt: 'test prompt',
      agentType: 'claude',
      purpose: 'testing',
      machineName: 'test-machine',
      cwd: '/test',
      platform: 'darwin',
      dustVersion: '1.0.0',
      runtimeVersion: '1.0.0',
    }

    const msg = buildEventMessage({
      sequence: 1,
      sessionId: 'session-1',
      repository: 'test-repo',
      event,
    })

    expect(msg.sequence).toBe(1)
    expect(msg.sessionId).toBe('session-1')
    expect(msg.repository).toBe('test-repo')
    expect(msg.event).toBe(event)
    expect(msg.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(msg.agentSessionId).toBeUndefined()
  })

  test('includes agentSessionId when provided', () => {
    const event: AgentSessionEvent = {
      type: 'agent-session-ended',
      success: true,
    }

    const msg = buildEventMessage({
      sequence: 2,
      sessionId: 'session-2',
      repository: 'repo',
      event,
      agentSessionId: 'agent-123',
    })

    expect(msg.agentSessionId).toBe('agent-123')
  })

  test('omits agentSessionId when undefined', () => {
    const event: AgentSessionEvent = { type: 'agent-session-activity' }

    const msg = buildEventMessage({
      sequence: 3,
      sessionId: 'session-3',
      repository: 'repo',
      event,
      agentSessionId: undefined,
    })

    expect('agentSessionId' in msg).toBe(false)
  })
})

describe('createWakeUpHandler', () => {
  function createMinimalRepoState(): RepositoryState {
    return {
      repository: {
        name: 'test',
        gitUrl: 'test',
        url: 'https://example.com/test',
        id: 1,
      },
      path: '/test',
      loopPromise: null,
      stopRequested: false,
      logBuffer: createLogBuffer(),
      agentStatus: 'idle',
    }
  }

  test('resolves and clears wakeUp when called', () => {
    const repoState = createMinimalRepoState()
    let resolved = false
    const resolve = () => {
      resolved = true
    }

    const handler = createWakeUpHandler(repoState, resolve)
    repoState.wakeUp = handler

    handler()

    expect(resolved).toBe(true)
    expect(repoState.wakeUp).toBeUndefined()
  })

  test('does not resolve when handler is stale', () => {
    const repoState = createMinimalRepoState()
    let resolved = false
    const resolve = () => {
      resolved = true
    }

    const handler = createWakeUpHandler(repoState, resolve)
    // Simulate a newer handler being set
    repoState.wakeUp = () => {}

    handler()

    expect(resolved).toBe(false)
    // The newer handler should still be in place
    expect(repoState.wakeUp).toBeDefined()
  })

  test('does not resolve when wakeUp is undefined', () => {
    const repoState = createMinimalRepoState()
    let resolved = false
    const resolve = () => {
      resolved = true
    }

    const handler = createWakeUpHandler(repoState, resolve)
    // Don't set repoState.wakeUp = handler

    handler()

    expect(resolved).toBe(false)
  })
})

describe('createBufferStdoutSink', () => {
  test('write buffers partial lines', () => {
    const buffer = createLogBuffer()
    const loopState: LoopState = {
      partialLine: '',
      sequence: 0,
      agentSessionId: undefined,
    }
    const sink = createBufferStdoutSink(loopState, buffer)

    sink.write('hello')

    expect(getLogLines(buffer)).toHaveLength(0)
    expect(loopState.partialLine).toBe('hello')
  })

  test('write flushes complete lines', () => {
    const buffer = createLogBuffer()
    const loopState: LoopState = {
      partialLine: '',
      sequence: 0,
      agentSessionId: undefined,
    }
    const sink = createBufferStdoutSink(loopState, buffer)

    sink.write('line1\nline2\npartial')

    const lines = getLogLines(buffer)
    expect(lines).toHaveLength(2)
    expect(lines.map(l => l.text)).toEqual(['line1', 'line2'])
    expect(loopState.partialLine).toBe('partial')
  })

  test('line flushes partial and logs multi-line text', () => {
    const buffer = createLogBuffer()
    const loopState: LoopState = {
      partialLine: 'pending',
      sequence: 0,
      agentSessionId: undefined,
    }
    const sink = createBufferStdoutSink(loopState, buffer)

    sink.line('content')

    const lines = getLogLines(buffer)
    expect(lines).toHaveLength(2)
    expect(lines[0].text).toBe('pending')
    expect(lines[1].text).toBe('content')
    expect(loopState.partialLine).toBe('')
  })
})

describe('createBufferRun', () => {
  test('delegates to run with bufferSinkDeps', async () => {
    let runCalledWith: unknown[] = []
    const mockRun: RepositoryDependencies['run'] = async (...arguments_) => {
      runCalledWith = arguments_
    }
    const mockDeps = {} as RunnerDependencies
    const bufferRun = createBufferRun(mockRun, mockDeps)

    await bufferRun('prompt', {} as Parameters<typeof bufferRun>[1])

    expect(runCalledWith).toEqual(['prompt', {}, mockDeps])
  })
})

describe('noOpPostEvent', () => {
  test('returns a resolved promise', async () => {
    await expect(noOpPostEvent()).resolves.toBeUndefined()
  })
})

describe('createLoopEventHandler', () => {
  test('logs formatted loop events', () => {
    const buffer = createLogBuffer()
    const handler = createLoopEventHandler(buffer)

    handler({ type: 'loop.started', maxIterations: 1 })

    const lines = getLogLines(buffer)
    expect(lines.length).toBeGreaterThan(0)
  })
})

describe('createAgentEventHandler', () => {
  function createMinimalRepoState(): RepositoryState {
    return {
      repository: {
        name: 'test',
        gitUrl: 'test',
        url: 'https://example.com/test',
        id: 1,
      },
      path: '/test',
      loopPromise: null,
      stopRequested: false,
      logBuffer: createLogBuffer(),
      agentStatus: 'idle',
    }
  }

  test('sets agentStatus to busy on session-started', () => {
    const repoState = createMinimalRepoState()
    const loopState: LoopState = {
      partialLine: '',
      sequence: 0,
      agentSessionId: undefined,
    }
    const handler = createAgentEventHandler({
      repoState,
      repoName: 'test',
      loopState,
    })

    handler({
      type: 'agent-session-started',
      title: 'T',
      prompt: 'p',
      agentType: 'claude',
      purpose: 'test',
      machineName: 'm',
      cwd: '/',
      platform: 'darwin',
      dustVersion: '1',
      runtimeVersion: '1',
    })

    expect(repoState.agentStatus).toBe('busy')
  })

  test('sets agentStatus to idle on session-ended', () => {
    const repoState = createMinimalRepoState()
    repoState.agentStatus = 'busy'
    const loopState: LoopState = {
      partialLine: '',
      sequence: 0,
      agentSessionId: undefined,
    }
    const handler = createAgentEventHandler({
      repoState,
      repoName: 'test',
      loopState,
    })

    handler({ type: 'agent-session-ended', success: true })

    expect(repoState.agentStatus).toBe('idle')
  })

  test('sends event when sendEvent and sessionId provided', () => {
    const repoState = createMinimalRepoState()
    const loopState: LoopState = {
      partialLine: '',
      sequence: 0,
      agentSessionId: 'agent-1',
    }
    const sentEvents: unknown[] = []
    const sendEvent: SendEventFn = event => {
      sentEvents.push(event)
    }
    const handler = createAgentEventHandler({
      repoState,
      sendEvent,
      sessionId: 'session-1',
      repoName: 'test',
      loopState,
    })

    handler({ type: 'agent-session-activity' })

    expect(sentEvents).toHaveLength(1)
    expect(loopState.sequence).toBe(1)
    const message = sentEvents[0] as ReturnType<typeof buildEventMessage>
    expect(message.sessionId).toBe('session-1')
    expect(message.repository).toBe('test')
    expect(message.agentSessionId).toBe('agent-1')
  })

  test('does not send event when sendEvent is undefined', () => {
    const repoState = createMinimalRepoState()
    const loopState: LoopState = {
      partialLine: '',
      sequence: 0,
      agentSessionId: undefined,
    }
    const handler = createAgentEventHandler({
      repoState,
      repoName: 'test',
      loopState,
    })

    // Should not throw
    handler({ type: 'agent-session-activity' })

    expect(loopState.sequence).toBe(0)
  })
})

describe('createCancelHandler', () => {
  test('aborts the controller when called', () => {
    const controller = new AbortController()
    const cancel = createCancelHandler(controller)

    cancel()

    expect(controller.signal.aborted).toBe(true)
  })
})

describe('setupFallbackTimeout', () => {
  function createMinimalRepoState(): RepositoryState {
    return {
      repository: {
        name: 'test',
        gitUrl: 'test',
        url: 'https://example.com/test',
        id: 1,
      },
      path: '/test',
      loopPromise: null,
      stopRequested: false,
      logBuffer: createLogBuffer(),
      agentStatus: 'idle',
    }
  }

  test('resolves when handler is still active after timeout', async () => {
    const repoState = createMinimalRepoState()
    let resolved = false
    const resolve = () => {
      resolved = true
    }
    const handler = () => {}
    repoState.wakeUp = handler
    const sleep = () => Promise.resolve()

    setupFallbackTimeout(repoState, sleep, resolve, handler)
    await new Promise(r => setTimeout(r, 0))

    expect(resolved).toBe(true)
    expect(repoState.wakeUp).toBeUndefined()
  })

  test('does not resolve when a newer handler replaces the current one', async () => {
    const repoState = createMinimalRepoState()
    let resolved = false
    const resolve = () => {
      resolved = true
    }
    const handler = () => {}
    repoState.wakeUp = () => {} // Different handler
    const sleep = () => Promise.resolve()

    setupFallbackTimeout(repoState, sleep, resolve, handler)
    await new Promise(r => setTimeout(r, 0))

    expect(resolved).toBe(false)
  })
})

describe('runRepositoryLoop', () => {
  function createTestRepoState(): RepositoryState {
    return {
      repository: {
        name: 'test-repo',
        gitUrl: 'git@example.com:test/repo.git',
        url: 'https://example.com/test/repo',
        id: 1,
      },
      path: '/tmp/test-repo',
      loopPromise: null,
      stopRequested: false,
      logBuffer: createLogBuffer(),
      agentStatus: 'idle',
    }
  }

  test('logs error and continues when runOneIteration throws', async () => {
    const repoState = createTestRepoState()
    let sleepCallCount = 0

    // Spawn throws synchronously, causing gitPull (called by runOneIteration) to throw
    const throwingSpawn = () => {
      throw new Error('Unexpected spawn failure')
    }

    const repoDeps: RepositoryDependencies = {
      spawn: throwingSpawn as RepositoryDependencies['spawn'],
      run: async () => {},
      fileSystem: {
        exists: () => false,
        readFile: async () => '',
        readdir: async () => [],
        isDirectory: () => false,
        writeFile: async () => {},
        mkdir: async () => {},
        chmod: async () => {},
        getFileCreationTime: () => 0,
        rename: async () => {},
      },
      sleep: async () => {
        sleepCallCount++
        // Stop the loop after the error handler's sleep
        if (sleepCallCount >= 1) {
          repoState.stopRequested = true
        }
      },
      getReposDir: () => '/tmp/repos',
    }

    await runRepositoryLoop(repoState, repoDeps)

    const lines = getLogLines(repoState.logBuffer)
    const errorLine = lines.find(
      l => l.stream === 'stderr' && l.text.includes('Loop error:')
    )
    expect(errorLine).toBeDefined()
    expect(errorLine?.text).toContain('Unexpected spawn failure')
    expect(sleepCallCount).toBeGreaterThanOrEqual(1)
  })

  test('handles non-Error thrown values with String()', async () => {
    const repoState = createTestRepoState()
    let sleepCallCount = 0

    const throwingSpawn = () => {
      throw 'string error' // eslint-disable-line no-throw-literal
    }

    const repoDeps: RepositoryDependencies = {
      spawn: throwingSpawn as RepositoryDependencies['spawn'],
      run: async () => {},
      fileSystem: {
        exists: () => false,
        readFile: async () => '',
        readdir: async () => [],
        isDirectory: () => false,
        writeFile: async () => {},
        mkdir: async () => {},
        chmod: async () => {},
        getFileCreationTime: () => 0,
        rename: async () => {},
      },
      sleep: async () => {
        sleepCallCount++
        if (sleepCallCount >= 1) {
          repoState.stopRequested = true
        }
      },
      getReposDir: () => '/tmp/repos',
    }

    await runRepositoryLoop(repoState, repoDeps)

    const lines = getLogLines(repoState.logBuffer)
    const errorLine = lines.find(
      l => l.stream === 'stderr' && l.text.includes('Loop error:')
    )
    expect(errorLine).toBeDefined()
    expect(errorLine?.text).toContain('string error')
  })

  test('does not clear cancelCurrentIteration if replaced during iteration', async () => {
    const repoState = createTestRepoState()
    let sleepCallCount = 0
    const replacementCancel = () => {}

    const throwingSpawn = (() => {
      let callCount = 0
      return () => {
        callCount++
        // On the first call, replace cancelCurrentIteration before throwing
        if (callCount === 1) {
          repoState.cancelCurrentIteration = replacementCancel
        }
        throw new Error('fail')
      }
    })()

    const repoDeps: RepositoryDependencies = {
      spawn: throwingSpawn as RepositoryDependencies['spawn'],
      run: async () => {},
      fileSystem: {
        exists: () => false,
        readFile: async () => '',
        readdir: async () => [],
        isDirectory: () => false,
        writeFile: async () => {},
        mkdir: async () => {},
        chmod: async () => {},
        getFileCreationTime: () => 0,
        rename: async () => {},
      },
      sleep: async () => {
        sleepCallCount++
        if (sleepCallCount >= 1) {
          repoState.stopRequested = true
        }
      },
      getReposDir: () => '/tmp/repos',
    }

    await runRepositoryLoop(repoState, repoDeps)

    // The replacement cancel should still be in place
    expect(repoState.cancelCurrentIteration).toBe(replacementCancel)
  })
})
