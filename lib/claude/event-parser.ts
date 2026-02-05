import type { ClaudeEvent, RawEvent } from './types'

export function* parseRawEvent(raw: RawEvent): Generator<ClaudeEvent> {
  switch (raw.type) {
    case 'stream_event': {
      const event = raw.event
      if (event?.delta?.type === 'text_delta' && event.delta.text) {
        yield { type: 'text_delta', text: event.delta.text }
      }
      break
    }
    case 'assistant': {
      const content = raw.message?.content ?? []
      yield { type: 'assistant_message', content }

      for (const block of content) {
        if (
          block.type === 'tool_use' &&
          block.id &&
          block.name &&
          block.input
        ) {
          yield {
            type: 'tool_use',
            id: block.id,
            name: block.name,
            input: block.input,
          }
        }
      }
      break
    }
    case 'user': {
      for (const block of raw.message?.content ?? []) {
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
      break
    }
    case 'result': {
      yield {
        type: 'result',
        subtype: raw.subtype === 'error' ? 'error' : 'success',
        result: raw.result,
        error: raw.error,
        cost_usd: raw.total_cost_usd ?? raw.cost_usd ?? 0,
        duration_ms: raw.duration_ms ?? 0,
        num_turns: raw.num_turns ?? 0,
        session_id: raw.session_id ?? '',
      }
      break
    }
  }
}
