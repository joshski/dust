import { processEvent } from '../claude/streamer'
import type { OutputSink, RawEvent, RawEventCallback } from '../claude/types'
import { parseCodexRawEvent } from './event-parser'

/**
 * Process a stream of raw Codex events and write output to the sink.
 * Uses the shared processEvent logic with Codex-specific event parsing.
 */
export async function streamCodexEvents(
  events: AsyncIterable<RawEvent>,
  sink: OutputSink,
  onRawEvent?: RawEventCallback
): Promise<void> {
  let hadTextOutput = false

  for await (const raw of events) {
    onRawEvent?.(raw)
    for (const event of parseCodexRawEvent(raw)) {
      processEvent(event, sink, { hadTextOutput })
      if (event.type === 'text_delta') {
        hadTextOutput = true
      } else if (event.type === 'tool_use') {
        hadTextOutput = false
      }
    }
  }
}
