import { parseRawEvent } from './event-parser'
import type { ClaudeEvent, OutputSink, RawEvent } from './types'

/**
 * Process a stream of raw events and write output to the sink.
 * This is the core streaming logic, separated from I/O concerns.
 */
export async function streamEvents(
  events: AsyncIterable<RawEvent>,
  sink: OutputSink
): Promise<void> {
  let hadTextOutput = false

  for await (const raw of events) {
    for (const event of parseRawEvent(raw)) {
      processEvent(event, sink, { hadTextOutput })
      if (event.type === 'text_delta') {
        hadTextOutput = true
      } else if (event.type === 'tool_use') {
        hadTextOutput = false
      }
    }
  }
}

/**
 * Process a single typed event and write to the sink.
 * Exported for fine-grained testing.
 */
export function processEvent(
  event: ClaudeEvent,
  sink: OutputSink,
  state: { hadTextOutput: boolean }
): void {
  switch (event.type) {
    case 'text_delta':
      sink.write(event.text)
      break

    case 'tool_use':
      if (state.hadTextOutput) {
        sink.line('')
        sink.line('')
      }
      sink.line(`🔧 Tool: ${event.name}`)
      sink.line(
        `   Input: ${JSON.stringify(event.input, null, 2).replace(/\n/g, '\n   ')}`
      )
      break

    case 'tool_result':
      sink.line(`✅ Result (${event.content.length} chars)`)
      sink.line('')
      break

    case 'result':
      sink.line('')
      sink.line(
        `🏁 Done: ${event.subtype}, ${event.num_turns} turns, $${event.cost_usd.toFixed(4)}`
      )
      break

    case 'assistant_message':
      // Skip - we use text_delta for streaming text
      break
  }
}

export function createStdoutSink(): OutputSink {
  return {
    write: (text: string) => process.stdout.write(text),
    line: (text: string) => console.log(text),
  }
}
