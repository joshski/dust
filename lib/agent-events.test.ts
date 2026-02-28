import { describe, expect, test } from 'vitest'
import {
  createHeartbeatThrottler,
  formatAgentEvent,
  rawEventToAgentEvent,
} from './agent-events'

describe('rawEventToAgentEvent', () => {
  test('converts stream_event to agent-session-activity', () => {
    const result = rawEventToAgentEvent({ type: 'stream_event', data: {} })
    expect(result).toEqual({ type: 'agent-session-activity' })
  })

  test('forwards other events as claude-event', () => {
    const rawEvent = { type: 'message', content: 'hello' }
    const result = rawEventToAgentEvent(rawEvent)
    expect(result).toEqual({ type: 'claude-event', rawEvent })
  })

  test('forwards events without type as claude-event', () => {
    const rawEvent = { data: 'something' }
    const result = rawEventToAgentEvent(rawEvent)
    expect(result).toEqual({ type: 'claude-event', rawEvent })
  })
})

describe('formatAgentEvent', () => {
  test('formats agent-session-started with Claude agent type', () => {
    const result = formatAgentEvent({
      type: 'agent-session-started',
      title: 'Test Session',
      prompt: 'Do something',
      agentType: 'claude',
      purpose: 'testing',
      machineName: 'test-machine',
      cwd: '/test',
      platform: 'darwin',
      dustVersion: '1.0.0',
      runtimeVersion: '1.0.0',
    })
    expect(result).toBe('🤖 Starting Claude: Test Session')
  })

  test('formats agent-session-started with Codex agent type', () => {
    const result = formatAgentEvent({
      type: 'agent-session-started',
      title: 'Test Session',
      prompt: 'Do something',
      agentType: 'codex',
      purpose: 'testing',
      machineName: 'test-machine',
      cwd: '/test',
      platform: 'darwin',
      dustVersion: '1.0.0',
      runtimeVersion: '1.0.0',
    })
    expect(result).toBe('🤖 Starting Codex: Test Session')
  })

  test('formats successful agent-session-ended', () => {
    const result = formatAgentEvent({
      type: 'agent-session-ended',
      success: true,
    })
    expect(result).toBe('🤖 Agent session ended (success)')
  })

  test('formats failed agent-session-ended with error', () => {
    const result = formatAgentEvent({
      type: 'agent-session-ended',
      success: false,
      error: 'Something went wrong',
    })
    expect(result).toBe('🤖 Agent session ended (error: Something went wrong)')
  })

  test('returns null for agent-session-activity', () => {
    const result = formatAgentEvent({ type: 'agent-session-activity' })
    expect(result).toBeNull()
  })

  test('returns null for claude-event', () => {
    const result = formatAgentEvent({
      type: 'claude-event',
      rawEvent: { data: 'test' },
    })
    expect(result).toBeNull()
  })
})

describe('createHeartbeatThrottler', () => {
  test('sends first heartbeat immediately', () => {
    const events: unknown[] = []
    const throttler = createHeartbeatThrottler(e => events.push(e), {
      intervalMs: 5000,
      now: () => 0,
    })

    throttler({ type: 'stream_event' })

    expect(events).toEqual([{ type: 'agent-session-activity' }])
  })

  test('suppresses heartbeats within interval', () => {
    const events: unknown[] = []
    let currentTime = 0
    const throttler = createHeartbeatThrottler(e => events.push(e), {
      intervalMs: 5000,
      now: () => currentTime,
    })

    throttler({ type: 'stream_event' }) // t=0, sent
    currentTime = 1000
    throttler({ type: 'stream_event' }) // t=1000, suppressed
    currentTime = 4999
    throttler({ type: 'stream_event' }) // t=4999, suppressed

    expect(events).toEqual([{ type: 'agent-session-activity' }])
  })

  test('sends heartbeat again after interval expires', () => {
    const events: unknown[] = []
    let currentTime = 0
    const throttler = createHeartbeatThrottler(e => events.push(e), {
      intervalMs: 5000,
      now: () => currentTime,
    })

    throttler({ type: 'stream_event' }) // t=0, sent
    currentTime = 5000
    throttler({ type: 'stream_event' }) // t=5000, sent (interval expired)

    expect(events).toEqual([
      { type: 'agent-session-activity' },
      { type: 'agent-session-activity' },
    ])
  })

  test('forwards non-stream events without throttling', () => {
    const events: unknown[] = []
    let currentTime = 0
    const throttler = createHeartbeatThrottler(e => events.push(e), {
      intervalMs: 5000,
      now: () => currentTime,
    })

    const messageEvent = { type: 'message', content: 'hello' }
    throttler(messageEvent)
    currentTime = 100
    throttler(messageEvent)

    expect(events).toEqual([
      { type: 'claude-event', rawEvent: messageEvent },
      { type: 'claude-event', rawEvent: messageEvent },
    ])
  })

  test('non-stream events do not reset heartbeat timer', () => {
    const events: unknown[] = []
    let currentTime = 0
    const throttler = createHeartbeatThrottler(e => events.push(e), {
      intervalMs: 5000,
      now: () => currentTime,
    })

    throttler({ type: 'stream_event' }) // t=0, heartbeat sent
    currentTime = 3000
    throttler({ type: 'message', content: 'hello' }) // t=3000, claude-event
    currentTime = 4000
    throttler({ type: 'stream_event' }) // t=4000, heartbeat suppressed (only 4s since last)

    expect(events).toEqual([
      { type: 'agent-session-activity' },
      { type: 'claude-event', rawEvent: { type: 'message', content: 'hello' } },
    ])
  })

  test('uses default interval of 5000ms', () => {
    const events: unknown[] = []
    let currentTime = 0
    const throttler = createHeartbeatThrottler(e => events.push(e), {
      now: () => currentTime,
    })

    throttler({ type: 'stream_event' }) // t=0, sent
    currentTime = 4999
    throttler({ type: 'stream_event' }) // t=4999, suppressed
    currentTime = 5000
    throttler({ type: 'stream_event' }) // t=5000, sent

    expect(events).toEqual([
      { type: 'agent-session-activity' },
      { type: 'agent-session-activity' },
    ])
  })
})
