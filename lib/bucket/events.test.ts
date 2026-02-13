import { EventEmitter } from 'node:events'
import { describe, expect, test } from 'vitest'
import {
  type BucketEventPayload,
  createBucketEventEmitter,
  formatBucketEvent,
  type WebSocketLike,
  WS_CLOSED,
  WS_OPEN,
} from './events'

function createMockWebSocket(): WebSocketLike & EventEmitter {
  const emitter = new EventEmitter() as WebSocketLike & EventEmitter
  emitter.readyState = WS_CLOSED
  emitter.onopen = null
  emitter.onclose = null
  emitter.onerror = null
  emitter.onmessage = null
  emitter.close = () => {
    emitter.readyState = WS_CLOSED
  }
  emitter.send = () => {}
  return emitter
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

  test('formats bucket.iteration_started event', () => {
    const result = formatBucketEvent({
      type: 'bucket.iteration_started',
      repository: 'my-repo',
    })
    expect(result).toBe('Starting iteration for my-repo')
  })

  test('formats bucket.iteration_completed event (success)', () => {
    const result = formatBucketEvent({
      type: 'bucket.iteration_completed',
      repository: 'my-repo',
      success: true,
    })
    expect(result).toBe('Completed iteration for my-repo')
  })

  test('formats bucket.iteration_completed event (failure)', () => {
    const result = formatBucketEvent({
      type: 'bucket.iteration_completed',
      repository: 'my-repo',
      success: false,
      error: 'dust exited with code 1',
    })
    expect(result).toBe('Iteration failed for my-repo: dust exited with code 1')
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

  test('formats bucket.repository_session_event', () => {
    const result = formatBucketEvent({
      type: 'bucket.repository_session_event',
      repository: 'my-repo',
      event: { type: 'loop.tasks_found' },
    })
    expect(result).toBe('[my-repo] loop.tasks_found')
  })
})

describe('createBucketEventEmitter', () => {
  test('sends event via WebSocket when connected', () => {
    const sentMessages: string[] = []
    const ws = createMockWebSocket()
    ws.readyState = WS_OPEN
    ws.send = (data: string) => sentMessages.push(data)

    const emit = createBucketEventEmitter(() => ws, 'session-123')
    emit({ type: 'bucket.connected' })

    expect(sentMessages).toHaveLength(1)
    const payload = JSON.parse(sentMessages[0]) as BucketEventPayload
    expect(payload.type).toBe('bucket.connected')
    expect(payload.sessionId).toBe('session-123')
    expect(payload.sequence).toBe(1)
    expect(payload.timestamp).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/
    )
  })

  test('increments sequence number', () => {
    const sentMessages: string[] = []
    const ws = createMockWebSocket()
    ws.readyState = WS_OPEN
    ws.send = (data: string) => sentMessages.push(data)

    const emit = createBucketEventEmitter(() => ws, 'session-123')
    emit({ type: 'bucket.connected' })
    emit({ type: 'bucket.repository_added', repository: 'repo1' })
    emit({ type: 'bucket.repository_added', repository: 'repo2' })

    expect(sentMessages).toHaveLength(3)
    expect((JSON.parse(sentMessages[0]) as BucketEventPayload).sequence).toBe(1)
    expect((JSON.parse(sentMessages[1]) as BucketEventPayload).sequence).toBe(2)
    expect((JSON.parse(sentMessages[2]) as BucketEventPayload).sequence).toBe(3)
  })

  test('does not send when WebSocket is null', () => {
    const sendCalled = false
    const emit = createBucketEventEmitter(() => null, 'session-123')

    emit({ type: 'bucket.connected' })

    expect(sendCalled).toBe(false)
  })

  test('does not send when WebSocket is not open', () => {
    const sentMessages: string[] = []
    const ws = createMockWebSocket()
    ws.readyState = WS_CLOSED
    ws.send = (data: string) => sentMessages.push(data)

    const emit = createBucketEventEmitter(() => ws, 'session-123')
    emit({ type: 'bucket.connected' })

    expect(sentMessages).toHaveLength(0)
  })

  test('includes repository field for repo-specific events', () => {
    const sentMessages: string[] = []
    const ws = createMockWebSocket()
    ws.readyState = WS_OPEN
    ws.send = (data: string) => sentMessages.push(data)

    const emit = createBucketEventEmitter(() => ws, 'session-123')
    emit({ type: 'bucket.repository_added', repository: 'my-repo' })

    const payload = JSON.parse(sentMessages[0]) as BucketEventPayload
    expect(payload.repository).toBe('my-repo')
  })

  test('includes details for disconnected event', () => {
    const sentMessages: string[] = []
    const ws = createMockWebSocket()
    ws.readyState = WS_OPEN
    ws.send = (data: string) => sentMessages.push(data)

    const emit = createBucketEventEmitter(() => ws, 'session-123')
    emit({ type: 'bucket.disconnected', code: 1006, reason: 'Connection lost' })

    const payload = JSON.parse(sentMessages[0]) as BucketEventPayload
    expect(payload.details).toEqual({ code: 1006, reason: 'Connection lost' })
  })

  test('includes details for iteration_completed event', () => {
    const sentMessages: string[] = []
    const ws = createMockWebSocket()
    ws.readyState = WS_OPEN
    ws.send = (data: string) => sentMessages.push(data)

    const emit = createBucketEventEmitter(() => ws, 'session-123')
    emit({
      type: 'bucket.iteration_completed',
      repository: 'my-repo',
      success: false,
      error: 'Process crashed',
    })

    const payload = JSON.parse(sentMessages[0]) as BucketEventPayload
    expect(payload.details).toEqual({
      success: false,
      error: 'Process crashed',
    })
  })

  test('includes details for error event', () => {
    const sentMessages: string[] = []
    const ws = createMockWebSocket()
    ws.readyState = WS_OPEN
    ws.send = (data: string) => sentMessages.push(data)

    const emit = createBucketEventEmitter(() => ws, 'session-123')
    emit({ type: 'bucket.error', repository: 'my-repo', error: 'Clone failed' })

    const payload = JSON.parse(sentMessages[0]) as BucketEventPayload
    expect(payload.details).toEqual({ error: 'Clone failed' })
  })

  test('includes details for repository_session_event', () => {
    const sentMessages: string[] = []
    const ws = createMockWebSocket()
    ws.readyState = WS_OPEN
    ws.send = (data: string) => sentMessages.push(data)

    const emit = createBucketEventEmitter(() => ws, 'session-123')
    emit({
      type: 'bucket.repository_session_event',
      repository: 'my-repo',
      event: { type: 'claude.ended', success: true },
    })

    const payload = JSON.parse(sentMessages[0]) as BucketEventPayload
    expect(payload.type).toBe('bucket.repository_session_event')
    expect(payload.repository).toBe('my-repo')
    expect(payload.details).toEqual({
      event: { type: 'claude.ended', success: true },
    })
  })

  test('ignores send errors (fire-and-forget)', () => {
    const ws = createMockWebSocket()
    ws.readyState = WS_OPEN
    ws.send = () => {
      throw new Error('Send failed')
    }

    const emit = createBucketEventEmitter(() => ws, 'session-123')

    expect(() => emit({ type: 'bucket.connected' })).not.toThrow()
  })
})
