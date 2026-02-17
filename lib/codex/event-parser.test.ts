import { describe, expect, test } from 'vitest'
import { parseCodexRawEvent } from './event-parser'

describe('parseCodexRawEvent', () => {
  test('parses agent_message item.completed as text_delta', () => {
    const events = [
      ...parseCodexRawEvent({
        type: 'item.completed',
        item: { type: 'agent_message', text: 'hello world' },
      }),
    ]
    expect(events).toEqual([{ type: 'text_delta', text: 'hello world\n' }])
  })

  test('parses command_execution item.completed as tool_use and tool_result', () => {
    const events = [
      ...parseCodexRawEvent({
        type: 'item.completed',
        item: {
          id: 'item_1',
          type: 'command_execution',
          command: 'ls -la',
          aggregated_output: 'file1.txt\nfile2.txt',
          exit_code: 0,
        },
      }),
    ]
    expect(events).toEqual([
      {
        type: 'tool_use',
        id: 'item_1',
        name: 'command_execution',
        input: { command: 'ls -la' },
      },
      {
        type: 'tool_result',
        toolUseId: 'item_1',
        content: 'file1.txt\nfile2.txt',
      },
    ])
  })

  test('uses exit code when aggregated_output is empty', () => {
    const events = [
      ...parseCodexRawEvent({
        type: 'item.completed',
        item: {
          id: 'item_2',
          type: 'command_execution',
          command: 'test -d foo',
          aggregated_output: '',
          exit_code: 0,
        },
      }),
    ]
    expect(events[1]).toEqual({
      type: 'tool_result',
      toolUseId: 'item_2',
      content: '(exit code: 0)',
    })
  })

  test('silently skips reasoning events', () => {
    const events = [
      ...parseCodexRawEvent({
        type: 'item.completed',
        item: { type: 'reasoning', text: 'thinking...' },
      }),
    ]
    expect(events).toEqual([])
  })

  test('silently skips item.started events', () => {
    const events = [
      ...parseCodexRawEvent({
        type: 'item.started',
        item: { type: 'command_execution', command: 'ls' },
      }),
    ]
    expect(events).toEqual([])
  })

  test('silently skips turn and thread events', () => {
    expect([...parseCodexRawEvent({ type: 'turn.started' })]).toEqual([])
    expect([...parseCodexRawEvent({ type: 'turn.completed' })]).toEqual([])
    expect([...parseCodexRawEvent({ type: 'thread.started' })]).toEqual([])
  })

  test('silently skips item.completed with no item', () => {
    const events = [...parseCodexRawEvent({ type: 'item.completed' })]
    expect(events).toEqual([])
  })

  test('uses unknown when exit_code is null and output is empty', () => {
    const events = [
      ...parseCodexRawEvent({
        type: 'item.completed',
        item: {
          id: 'item_x',
          type: 'command_execution',
          command: 'test',
          aggregated_output: '',
          exit_code: null,
        },
      }),
    ]
    expect(events[1]).toEqual({
      type: 'tool_result',
      toolUseId: 'item_x',
      content: '(exit code: unknown)',
    })
  })

  test('omits tool_result when aggregated_output is not a string', () => {
    const events = [
      ...parseCodexRawEvent({
        type: 'item.completed',
        item: {
          id: 'item_3',
          type: 'command_execution',
          command: 'echo hi',
        },
      }),
    ]
    expect(events).toHaveLength(1)
    expect(events[0].type).toBe('tool_use')
  })

  test('defaults id to empty string when missing', () => {
    const events = [
      ...parseCodexRawEvent({
        type: 'item.completed',
        item: {
          type: 'command_execution',
          command: 'echo hi',
          aggregated_output: 'hi',
        },
      }),
    ]
    expect(events[0]).toMatchObject({ id: '' })
    expect(events[1]).toMatchObject({ toolUseId: '' })
  })
})
