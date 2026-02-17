import { describe, expect, test } from 'vitest'
import type { OutputOp, RawEvent } from '../claude/types'
import { streamCodexEvents } from './streamer'

function collectSinkOutput(): {
  ops: OutputOp[]
  sink: { write: (text: string) => void; line: (text: string) => void }
} {
  const ops: OutputOp[] = []
  return {
    ops,
    sink: {
      write: (text: string) => ops.push({ op: 'write', text }),
      line: (text: string) => ops.push({ op: 'line', text }),
    },
  }
}

async function* asyncOf(...events: RawEvent[]): AsyncGenerator<RawEvent> {
  for (const e of events) yield e
}

describe('streamCodexEvents', () => {
  test('streams agent_message events to sink', async () => {
    const { ops, sink } = collectSinkOutput()
    await streamCodexEvents(
      asyncOf({
        type: 'item.completed',
        item: { type: 'agent_message', text: 'hello' },
      }),
      sink
    )
    expect(ops).toEqual([{ op: 'write', text: 'hello\n' }])
  })

  test('streams command_execution events as tool use and result', async () => {
    const { ops, sink } = collectSinkOutput()
    await streamCodexEvents(
      asyncOf({
        type: 'item.completed',
        item: {
          id: 'item_1',
          type: 'command_execution',
          command: 'ls',
          aggregated_output: 'file.txt',
          exit_code: 0,
        },
      }),
      sink
    )
    // Should have tool use formatting + result
    expect(
      ops.some(op => op.op === 'line' && op.text.includes('Result:'))
    ).toBe(true)
  })

  test('skips unknown events', async () => {
    const { ops, sink } = collectSinkOutput()
    await streamCodexEvents(asyncOf({ type: 'turn.started' }), sink)
    expect(ops).toEqual([])
  })

  test('works without onRawEvent callback', async () => {
    const { ops, sink } = collectSinkOutput()
    await streamCodexEvents(
      asyncOf({
        type: 'item.completed',
        item: { type: 'agent_message', text: 'no callback' },
      }),
      sink
    )
    expect(ops).toEqual([{ op: 'write', text: 'no callback\n' }])
  })

  test('calls onRawEvent callback for each raw event', async () => {
    const rawEvents: RawEvent[] = []
    const { sink } = collectSinkOutput()
    await streamCodexEvents(
      asyncOf(
        {
          type: 'item.completed',
          item: { type: 'agent_message', text: 'hi' },
        },
        { type: 'turn.started' }
      ),
      sink,
      event => rawEvents.push(event)
    )
    expect(rawEvents).toHaveLength(2)
  })
})
