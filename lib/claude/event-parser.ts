import type { ClaudeEvent, RawEvent } from './types'

export function* parseRawEvent(raw: RawEvent): Generator<ClaudeEvent> {
  if (raw.type === 'stream_event') {
    const event = (
      raw as { event?: { delta?: { type?: string; text?: string } } }
    ).event
    if (event?.delta?.type === 'text_delta' && event.delta.text) {
      yield { type: 'text_delta', text: event.delta.text }
    }
  } else if (raw.type === 'assistant') {
    const msg = raw as {
      message?: {
        content?: Array<{
          type: string
          id?: string
          name?: string
          input?: Record<string, unknown>
          text?: string
        }>
      }
    }
    const content = msg.message?.content ?? []
    yield { type: 'assistant_message', content }

    for (const block of content) {
      if (block.type === 'tool_use' && block.id && block.name && block.input) {
        yield {
          type: 'tool_use',
          id: block.id,
          name: block.name,
          input: block.input,
        }
      }
    }
  } else if (raw.type === 'user') {
    const msg = raw as {
      message?: {
        content?: Array<{
          type: string
          tool_use_id?: string
          content?: unknown
        }>
      }
    }
    for (const block of msg.message?.content ?? []) {
      if (block.type === 'tool_result' && block.tool_use_id) {
        yield {
          type: 'tool_result',
          toolUseId: block.tool_use_id,
          content:
            typeof block.content === 'string'
              ? block.content
              : JSON.stringify(block.content),
        }
      }
    }
  } else if (raw.type === 'result') {
    const r = raw as {
      subtype?: string
      result?: string
      error?: string
      cost_usd?: number
      total_cost_usd?: number
      duration_ms?: number
      num_turns?: number
      session_id?: string
    }
    yield {
      type: 'result',
      subtype: (r.subtype as 'success' | 'error') ?? 'success',
      result: r.result,
      error: r.error,
      cost_usd: r.total_cost_usd ?? r.cost_usd ?? 0,
      duration_ms: r.duration_ms ?? 0,
      num_turns: r.num_turns ?? 0,
      session_id: r.session_id ?? '',
    }
  }
}
