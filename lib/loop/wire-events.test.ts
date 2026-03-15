import { describe, expect, test } from 'vitest'
import type { EventMessage } from '../agent-events'
import { createTestAgentSessionStartedEvent } from '../test/test-utilities'
import { createPostEvent, createWireEventSender } from './wire-events'

const throwingMockFetch = async (
  _url: string | URL | Request,
  _options?: RequestInit
): Promise<Response> => {
  throw new Error('Network failure')
}

const throwingPostEvent = async () => {
  throw new Error('Network error')
}

describe('createPostEvent', () => {
  test('calls fetch with correct URL, method, and headers', async () => {
    const fetchCalls: { url: string; options: RequestInit }[] = []
    const mockFetch = async (
      url: string | URL | Request,
      options?: RequestInit
    ) => {
      fetchCalls.push({ url: url.toString(), options: options ?? {} })
      return new Response()
    }
    const postEvent = createPostEvent(mockFetch as typeof fetch)

    await postEvent('http://example.com/events', {
      sequence: 1,
      timestamp: '2024-01-01T00:00:00.000Z',
      sessionId: 'test-session',
      repository: '',
      event: { type: 'agent-session-ended', success: true },
    })

    expect(fetchCalls).toHaveLength(1)
    expect(fetchCalls[0].url).toBe('http://example.com/events')
    expect(fetchCalls[0].options.method).toBe('POST')
    expect(fetchCalls[0].options.headers).toEqual({
      'Content-Type': 'application/json',
    })
  })

  test('serializes payload as JSON body', async () => {
    const fetchCalls: { url: string; options: RequestInit }[] = []
    const mockFetch = async (
      url: string | URL | Request,
      options?: RequestInit
    ) => {
      fetchCalls.push({ url: url.toString(), options: options ?? {} })
      return new Response()
    }
    const postEvent = createPostEvent(mockFetch as typeof fetch)

    const payload: EventMessage = {
      sequence: 42,
      timestamp: '2024-01-01T12:34:56.789Z',
      sessionId: 'session-abc',
      repository: 'my-repo',
      event: { type: 'agent-session-ended', success: false, error: 'timeout' },
    }
    await postEvent('http://example.com/events', payload)

    expect(fetchCalls).toHaveLength(1)
    expect(fetchCalls[0].options.body).toBe(JSON.stringify(payload))
  })

  test('propagates fetch errors', async () => {
    const postEvent = createPostEvent(throwingMockFetch as typeof fetch)

    await expect(
      postEvent('http://example.com/events', {
        sequence: 1,
        timestamp: '2024-01-01T00:00:00.000Z',
        sessionId: 'test-session',
        repository: '',
        event: { type: 'agent-session-ended', success: true },
      })
    ).rejects.toThrow('Network failure')
  })
})

describe('createWireEventSender', () => {
  const testSessionId = 'test-session-123'

  test('does not post when eventsUrl is undefined', async () => {
    let postCalled = false
    const postEvent = async () => {
      postCalled = true
    }
    const send = createWireEventSender(
      undefined,
      testSessionId,
      postEvent,
      () => {}
    )
    send(createTestAgentSessionStartedEvent())
    await Promise.resolve()
    expect(postCalled).toBe(false)
  })

  test('posts agent session events with sessionId, sequence number and timestamp', async () => {
    const postedEvents: EventMessage[] = []
    const postEvent = async (_url: string, payload: EventMessage) => {
      postedEvents.push(payload)
    }
    const send = createWireEventSender(
      'http://example.com',
      testSessionId,
      postEvent,
      () => {}
    )
    send(createTestAgentSessionStartedEvent())
    send({ type: 'agent-session-ended', success: true })
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
    const send = createWireEventSender(
      'http://example.com',
      testSessionId,
      postEvent,
      () => {}
    )
    send(createTestAgentSessionStartedEvent())
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
    const send = createWireEventSender(
      'http://example.com',
      testSessionId,
      postEvent,
      () => {},
      () => 'claude-session-abc'
    )
    send(createTestAgentSessionStartedEvent())
    send({ type: 'agent-session-ended', success: true })
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
    const send = createWireEventSender(
      'http://example.com',
      testSessionId,
      postEvent,
      () => {},
      () => undefined
    )
    send(createTestAgentSessionStartedEvent())
    await Promise.resolve()

    expect(postedEvents[0].agentSessionId).toBeUndefined()
  })

  test('calls onError when post fails', async () => {
    const errors: unknown[] = []
    const send = createWireEventSender(
      'http://example.com',
      testSessionId,
      throwingPostEvent,
      (error: unknown) => {
        errors.push(error)
      }
    )
    send(createTestAgentSessionStartedEvent())
    await Promise.resolve()
    await Promise.resolve()
    expect(errors).toHaveLength(1)
    expect((errors[0] as Error).message).toBe('Network error')
  })
})
