import { describe, expect, test } from 'vitest'
import type { AgentSessionEvent } from '../agent-events'
import { createLogBuffer, getLogLines } from './log-buffer'
import type { RepositoryState } from './repository'
import {
  buildEventMessage,
  createLogCallbacks,
  createWakeUpHandler,
  flushAndLogMultiLine,
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
