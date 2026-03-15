import { EventEmitter } from 'node:events'
import { describe, expect, test } from 'vitest'
import type { EventMessage } from '../agent-events'
import { createTestAgentSessionStartedEvent } from '../test/test-utilities'
import {
  createEventMessageSender,
  formatBucketEvent,
  type WebSocketLike,
  WS_CLOSED,
  WS_OPEN,
} from './events'

function createMockWebSocket(): WebSocketLike & EventEmitter {
  const emitter = new EventEmitter() as WebSocketLike & EventEmitter
  emitter.readyState = WS_CLOSED
  emitter.addEventListener = (type, handler) => emitter.on(type, handler)
  emitter.close = () => {
    emitter.readyState = WS_CLOSED
  }
  emitter.send = () => {}
  return emitter
}

function createTestEventMessage(
  overrides: Partial<EventMessage> = {}
): EventMessage {
  return {
    sequence: 1,
    timestamp: new Date().toISOString(),
    sessionId: 'session-123',
    repository: 'my-repo',
    event: createTestAgentSessionStartedEvent(),
    ...overrides,
  }
}

describe('formatBucketEvent', () => {
  test('formats bucket.connected event', () => {
    const result = formatBucketEvent({ type: 'bucket.connected' })
    expect(result).toBe('Connected to dustbucket')
  })

  test('formats bucket.disconnected event', () => {
    const result = formatBucketEvent({
      type: 'bucket.disconnected',
      code: 1006,
      reason: 'Connection lost',
    })
    expect(result).toBe('Disconnected (code: 1006, reason: Connection lost)')
  })

  test('formats bucket.disconnected event with empty reason', () => {
    const result = formatBucketEvent({
      type: 'bucket.disconnected',
      code: 1000,
      reason: '',
    })
    expect(result).toBe('Disconnected (code: 1000, reason: none)')
  })

  test('formats bucket.repository_added event', () => {
    const result = formatBucketEvent({
      type: 'bucket.repository_added',
      repository: 'my-repo',
    })
    expect(result).toBe('Added repository: my-repo')
  })

  test('formats bucket.repository_removed event', () => {
    const result = formatBucketEvent({
      type: 'bucket.repository_removed',
      repository: 'my-repo',
    })
    expect(result).toBe('Removed repository: my-repo')
  })

  test('formats bucket.error event with repository', () => {
    const result = formatBucketEvent({
      type: 'bucket.error',
      repository: 'my-repo',
      error: 'Clone failed',
    })
    expect(result).toBe('Error for my-repo: Clone failed')
  })

  test('formats bucket.error event without repository', () => {
    const result = formatBucketEvent({
      type: 'bucket.error',
      error: 'Connection timeout',
    })
    expect(result).toBe('Error: Connection timeout')
  })
})

describe('createEventMessageSender', () => {
  test('sends EventMessage via WebSocket when connected', () => {
    const sentMessages: string[] = []
    const ws = createMockWebSocket()
    ws.readyState = WS_OPEN
    ws.send = (data: string) => sentMessages.push(data)

    const send = createEventMessageSender(() => ws)
    const msg = createTestEventMessage()
    send(msg)

    expect(sentMessages).toHaveLength(1)
    const payload = JSON.parse(sentMessages[0]) as EventMessage
    expect(payload.event.type).toBe('agent-session-started')
    expect(payload.sessionId).toBe('session-123')
    expect(payload.repository).toBe('my-repo')
    expect(payload.sequence).toBe(1)
  })

  test('does not send when WebSocket is null', () => {
    const sendCalled = false
    const send = createEventMessageSender(() => null)

    send(createTestEventMessage())

    expect(sendCalled).toBe(false)
  })

  test('does not send when WebSocket is not open', () => {
    const sentMessages: string[] = []
    const ws = createMockWebSocket()
    ws.readyState = WS_CLOSED
    ws.send = (data: string) => sentMessages.push(data)

    const send = createEventMessageSender(() => ws)
    send(createTestEventMessage())

    expect(sentMessages).toHaveLength(0)
  })

  test('includes agentSessionId when present', () => {
    const sentMessages: string[] = []
    const ws = createMockWebSocket()
    ws.readyState = WS_OPEN
    ws.send = (data: string) => sentMessages.push(data)

    const send = createEventMessageSender(() => ws)
    send(createTestEventMessage({ agentSessionId: 'agent-456' }))

    const payload = JSON.parse(sentMessages[0]) as EventMessage
    expect(payload.agentSessionId).toBe('agent-456')
  })

  test('ignores send errors (fire-and-forget)', () => {
    const ws = createMockWebSocket()
    ws.readyState = WS_OPEN
    ws.send = () => {
      throw new Error('Send failed')
    }

    const send = createEventMessageSender(() => ws)

    expect(() => send(createTestEventMessage())).not.toThrow()
  })
})
