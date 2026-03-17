import { describe, expect, test } from 'vitest'
import { parseRawEvent } from './event-parser'

describe('parseRawEvent', () => {
  test('parses text_delta from stream_event', () => {
    const raw = {
      type: 'stream_event',
      event: { delta: { type: 'text_delta', text: 'Hello' } },
    }

    const events = [...parseRawEvent(raw)]

    expect(events).toEqual([{ type: 'text_delta', text: 'Hello' }])
  })

  test('skips stream_event without text_delta', () => {
    const raw = {
      type: 'stream_event',
      event: { delta: { type: 'other' } },
    }

    const events = [...parseRawEvent(raw)]

    expect(events).toEqual([])
  })

  test('parses tool_use from assistant message', () => {
    const raw = {
      type: 'assistant',
      message: {
        content: [
          { type: 'text', text: 'I will read the file.' },
          {
            type: 'tool_use',
            id: 'tool_123',
            name: 'Read',
            input: { file_path: '/tmp/test.txt' },
          },
        ],
      },
    }

    const events = [...parseRawEvent(raw)]

    expect(events.length).toBe(2)
    expect(events[0]).toEqual({
      type: 'assistant_message',
      content: raw.message.content,
    })
    expect(events[1]).toEqual({
      type: 'tool_use',
      id: 'tool_123',
      name: 'Read',
      input: { file_path: '/tmp/test.txt' },
    })
  })

  test('parses tool_result from user message', () => {
    const raw = {
      type: 'user',
      message: {
        content: [
          {
            type: 'tool_result',
            tool_use_id: 'tool_123',
            content: 'File contents here',
          },
        ],
      },
    }

    const events = [...parseRawEvent(raw)]

    expect(events).toEqual([
      {
        type: 'tool_result',
        toolUseId: 'tool_123',
        content: 'File contents here',
      },
    ])
  })

  test('parses tool_result with non-string content as JSON', () => {
    const raw = {
      type: 'user',
      message: {
        content: [
          {
            type: 'tool_result',
            tool_use_id: 'tool_123',
            content: { key: 'value', nested: { data: 123 } },
          },
        ],
      },
    }

    const events = [...parseRawEvent(raw)]

    expect(events).toEqual([
      {
        type: 'tool_result',
        toolUseId: 'tool_123',
        content: '{"key":"value","nested":{"data":123}}',
      },
    ])
  })

  test('handles assistant message with missing content', () => {
    const raw = {
      type: 'assistant',
      message: {},
    }

    const events = [...parseRawEvent(raw)]

    expect(events).toEqual([{ type: 'assistant_message', content: [] }])
  })

  test('handles user message with missing content', () => {
    const raw = {
      type: 'user',
      message: {},
    }

    const events = [...parseRawEvent(raw)]

    expect(events).toEqual([])
  })

  test('skips non-tool_result blocks in user message', () => {
    const raw = {
      type: 'user',
      message: {
        content: [
          { type: 'text', text: 'some text' },
          { type: 'tool_result', tool_use_id: 'tool_1', content: 'result' },
          { type: 'image', data: 'base64...' },
        ],
      },
    }

    const events = [...parseRawEvent(raw)]

    // Should only yield the tool_result, not the text or image
    expect(events).toEqual([
      { type: 'tool_result', toolUseId: 'tool_1', content: 'result' },
    ])
  })

  test('parses result event', () => {
    const raw = {
      type: 'result',
      subtype: 'success',
      result: 'Done!',
      cost_usd: 0.0042,
      duration_ms: 1234,
      num_turns: 2,
      session_id: 'sess_123',
    }

    const events = [...parseRawEvent(raw)]

    expect(events).toEqual([
      {
        type: 'result',
        subtype: 'success',
        result: 'Done!',
        error: undefined,
        cost_usd: 0.0042,
        duration_ms: 1234,
        num_turns: 2,
        session_id: 'sess_123',
      },
    ])
  })

  test('parses result event with total_cost_usd', () => {
    const raw = {
      type: 'result',
      subtype: 'success',
      total_cost_usd: 0.05,
      cost_usd: 0.01, // should be ignored when total_cost_usd is present
    }

    const events = [...parseRawEvent(raw)]

    expect(events[0]).toMatchObject({
      type: 'result',
      cost_usd: 0.05,
    })
  })

  test('parses result event with defaults for missing fields', () => {
    const raw = {
      type: 'result',
    }

    const events = [...parseRawEvent(raw)]

    expect(events).toEqual([
      {
        type: 'result',
        subtype: 'success',
        result: undefined,
        error: undefined,
        cost_usd: 0,
        duration_ms: 0,
        num_turns: 0,
        session_id: '',
      },
    ])
  })

  test('returns empty for unknown event types', () => {
    const raw = { type: 'unknown', data: 'whatever' }

    const events = [...parseRawEvent(raw)]

    expect(events).toEqual([])
  })

  test('returns empty when type is not a string', () => {
    const raw = { type: 123, data: 'whatever' }

    const events = [...parseRawEvent(raw)]

    expect(events).toEqual([])
  })
})
