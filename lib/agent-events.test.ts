import { describe, expect, test } from 'vitest'
import { formatAgentEvent, rawEventToAgentEvent } from './agent-events'

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
