import { describe, expect, test } from 'vitest'
import { type CommandEventMessage, createEventEmitter } from './command-events'

describe('createEventEmitter', () => {
  test('wraps events in CommandEventMessage envelope with sequence and timestamp', () => {
    const messages: CommandEventMessage[] = []
    const emitEvent = createEventEmitter(msg => messages.push(msg))

    emitEvent({ type: 'check-started', name: 'lint' })

    expect(messages).toHaveLength(1)
    expect(messages[0]).toMatchObject({
      sequence: 0,
      event: { type: 'check-started', name: 'lint' },
    })
    expect(messages[0].timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  test('increments sequence number for each event', () => {
    const messages: CommandEventMessage[] = []
    const emitEvent = createEventEmitter(msg => messages.push(msg))

    emitEvent({ type: 'check-started', name: 'lint' })
    emitEvent({ type: 'check-passed', name: 'lint', durationMs: 100 })
    emitEvent({ type: 'check-started', name: 'test' })

    expect(messages.map(m => m.sequence)).toEqual([0, 1, 2])
  })

  test('preserves all event properties', () => {
    const messages: CommandEventMessage[] = []
    const emitEvent = createEventEmitter(msg => messages.push(msg))

    emitEvent({
      type: 'check-failed',
      name: 'test',
      durationMs: 500,
      output: 'Error details',
    })

    expect(messages[0].event).toEqual({
      type: 'check-failed',
      name: 'test',
      durationMs: 500,
      output: 'Error details',
    })
  })
})
