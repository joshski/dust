import type { ClaudeEvent, RawEvent } from './types'

type ContentBlock = {
  type: string
  id?: string
  name?: string
  input?: Record<string, unknown>
  text?: string
  tool_use_id?: string
  content?: unknown
}

function* parseStreamEvent(
  raw: RawEvent & { event?: { delta?: { type?: string; text?: string } } }
): Generator<ClaudeEvent> {
  const event = raw.event
  if (event?.delta?.type === 'text_delta' && event.delta.text) {
    yield { type: 'text_delta', text: event.delta.text }
  }
}

function* parseAssistantMessage(
  raw: RawEvent & { message?: { content?: ContentBlock[] } }
): Generator<ClaudeEvent> {
  const content = raw.message?.content ?? []
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
}

function* parseUserMessage(
  raw: RawEvent & { message?: { content?: ContentBlock[] } }
): Generator<ClaudeEvent> {
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
}

type ResultEvent = RawEvent & {
  subtype?: string
  result?: string
  error?: string
  cost_usd?: number
  total_cost_usd?: number
  duration_ms?: number
  num_turns?: number
  session_id?: string
}

function* parseResultEvent(raw: ResultEvent): Generator<ClaudeEvent> {
  yield {
    type: 'result',
    subtype: (raw.subtype as 'success' | 'error') ?? 'success',
    result: raw.result,
    error: raw.error,
    cost_usd: raw.total_cost_usd ?? raw.cost_usd ?? 0,
    duration_ms: raw.duration_ms ?? 0,
    num_turns: raw.num_turns ?? 0,
    session_id: raw.session_id ?? '',
  }
}

const eventParsers: Record<string, (raw: RawEvent) => Generator<ClaudeEvent>> =
  {
    stream_event: parseStreamEvent,
    assistant: parseAssistantMessage,
    user: parseUserMessage,
    result: parseResultEvent,
  }

export function* parseRawEvent(raw: RawEvent): Generator<ClaudeEvent> {
  const rawType = raw.type
  if (typeof rawType !== 'string') {
    return
  }
  const parser = eventParsers[rawType]
  if (parser) {
    yield* parser(raw)
  }
}
