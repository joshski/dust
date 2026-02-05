import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import {
  createContextEmulator,
  createFileSystemEmulator,
} from '../../test/test-utilities'
import type { CommandDependencies } from '../types'
import { focus } from './focus'

function createDependencies(
  commandArguments: string[] = []
): CommandDependencies & { context: ReturnType<typeof createContextEmulator> } {
  const context = createContextEmulator()
  const fileSystem = createFileSystemEmulator({})
  return {
    arguments: commandArguments,
    context,
    fileSystem,
    globScanner: fileSystem,
    settings: { dustCommand: 'dust' },
  }
}

describe('focus', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    // Clear dust env vars before each test
    delete process.env.DUST_SESSION_ID
    delete process.env.DUST_AGENT_SESSION_ID
    delete process.env.DUST_EVENTS_URL
  })

  afterEach(() => {
    // Restore original env
    process.env = { ...originalEnv }
  })

  test('outputs error when no objective provided', async () => {
    const dependencies = createDependencies([])

    const result = await focus(dependencies)

    expect(result.exitCode).toBe(1)
    expect(dependencies.context.stderrLines.join('\n')).toContain(
      'Error: No objective provided'
    )
    expect(dependencies.context.stderrLines.join('\n')).toContain('Usage:')
  })

  test('outputs focus message with objective', async () => {
    const dependencies = createDependencies(['add', 'login', 'box'])

    const result = await focus(dependencies)

    expect(result.exitCode).toBe(0)
    expect(dependencies.context.stdoutLines.join('\n')).toContain(
      '🎯 Focus: add login box'
    )
  })

  test('outputs note when not in loop session', async () => {
    const dependencies = createDependencies(['add login box'])

    const result = await focus(dependencies)

    expect(result.exitCode).toBe(0)
    expect(dependencies.context.stdoutLines.join('\n')).toContain(
      'Not in a loop session'
    )
  })

  test('posts event when in loop session', async () => {
    process.env.DUST_SESSION_ID = 'test-session-id'
    process.env.DUST_AGENT_SESSION_ID = 'test-agent-session-id'
    process.env.DUST_EVENTS_URL = 'http://example.com/events'

    const dependencies = createDependencies(['add login box'])
    const postedPayloads: unknown[] = []

    const result = await focus(dependencies, {
      postEvent: async (_url, payload) => {
        postedPayloads.push(payload)
      },
    })

    expect(result.exitCode).toBe(0)
    expect(postedPayloads).toHaveLength(1)
    const payload = postedPayloads[0] as {
      sessionId: string
      agentSessionId: string
      agentType: string
      event: { type: string; objective: string }
    }
    expect(payload.sessionId).toBe('test-session-id')
    expect(payload.agentSessionId).toBe('test-agent-session-id')
    expect(payload.agentType).toBe('claude')
    expect(payload.event.type).toBe('agent.focus')
    expect(payload.event.objective).toBe('add login box')
  })

  test('does not show loop session note when posting succeeds', async () => {
    process.env.DUST_SESSION_ID = 'test-session-id'
    process.env.DUST_AGENT_SESSION_ID = 'test-agent-session-id'
    process.env.DUST_EVENTS_URL = 'http://example.com/events'

    const dependencies = createDependencies(['add login box'])

    const result = await focus(dependencies, {
      postEvent: async () => {},
    })

    expect(result.exitCode).toBe(0)
    expect(dependencies.context.stdoutLines.join('\n')).not.toContain(
      'Not in a loop session'
    )
  })

  test('handles post failure gracefully', async () => {
    process.env.DUST_SESSION_ID = 'test-session-id'
    process.env.DUST_AGENT_SESSION_ID = 'test-agent-session-id'
    process.env.DUST_EVENTS_URL = 'http://example.com/events'

    const dependencies = createDependencies(['add login box'])

    const result = await focus(dependencies, {
      postEvent: async () => {
        throw new Error('Network error')
      },
    })

    expect(result.exitCode).toBe(0)
    expect(dependencies.context.stderrLines.join('\n')).toContain(
      'Failed to post focus event'
    )
    expect(dependencies.context.stderrLines.join('\n')).toContain(
      'Network error'
    )
  })

  test('handles non-Error post failure', async () => {
    process.env.DUST_SESSION_ID = 'test-session-id'
    process.env.DUST_AGENT_SESSION_ID = 'test-agent-session-id'
    process.env.DUST_EVENTS_URL = 'http://example.com/events'

    const dependencies = createDependencies(['add login box'])

    const result = await focus(dependencies, {
      postEvent: async () => {
        throw 'string error'
      },
    })

    expect(result.exitCode).toBe(0)
    expect(dependencies.context.stderrLines.join('\n')).toContain(
      'string error'
    )
  })

  test('requires all three env vars to post event', async () => {
    // Only set two of the three required vars
    process.env.DUST_SESSION_ID = 'test-session-id'
    process.env.DUST_AGENT_SESSION_ID = 'test-agent-session-id'
    // DUST_EVENTS_URL not set

    const dependencies = createDependencies(['add login box'])
    let postCalled = false

    const result = await focus(dependencies, {
      postEvent: async () => {
        postCalled = true
      },
    })

    expect(result.exitCode).toBe(0)
    expect(postCalled).toBe(false)
    expect(dependencies.context.stdoutLines.join('\n')).toContain(
      'Not in a loop session'
    )
  })

  test('includes timestamp in posted event', async () => {
    process.env.DUST_SESSION_ID = 'test-session-id'
    process.env.DUST_AGENT_SESSION_ID = 'test-agent-session-id'
    process.env.DUST_EVENTS_URL = 'http://example.com/events'

    const dependencies = createDependencies(['test objective'])
    const postedPayloads: unknown[] = []

    await focus(dependencies, {
      postEvent: async (_url, payload) => {
        postedPayloads.push(payload)
      },
    })

    const payload = postedPayloads[0] as { timestamp: string }
    expect(payload.timestamp).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/
    )
  })

  test('posts to correct URL from env var', async () => {
    process.env.DUST_SESSION_ID = 'test-session-id'
    process.env.DUST_AGENT_SESSION_ID = 'test-agent-session-id'
    process.env.DUST_EVENTS_URL = 'http://custom-endpoint.com/api/events'

    const dependencies = createDependencies(['test objective'])
    let postedUrl: string | undefined

    await focus(dependencies, {
      postEvent: async url => {
        postedUrl = url
      },
    })

    expect(postedUrl).toBe('http://custom-endpoint.com/api/events')
  })
})
