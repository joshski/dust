import type { ClaudeEvent, RawEvent } from '../claude/types'

/**
 * Parse a raw Codex JSON event into ClaudeEvent types.
 *
 * Codex `exec --json` emits JSONL with these event types:
 * - { type: "item.completed", item: { type: "agent_message", text: "..." } } → text output
 * - { type: "item.completed", item: { type: "command_execution", command, aggregated_output, exit_code } } → tool use + result
 * - { type: "item.completed", item: { type: "reasoning", text: "..." } } → skipped (internal thinking)
 * - { type: "item.started", item: { type: "command_execution", command } } → skipped (in-progress)
 * - { type: "turn.started" } / { type: "turn.completed" } → skipped
 * - { type: "thread.started" } → skipped
 */
export function* parseCodexRawEvent(raw: RawEvent): Generator<ClaudeEvent> {
  if (raw.type !== 'item.completed') return

  const item = raw.item as
    | {
        type: string
        text?: string
        command?: string
        aggregated_output?: string
        exit_code?: number | null
        id?: string
      }
    | undefined
  if (!item) return

  if (item.type === 'agent_message' && typeof item.text === 'string') {
    yield { type: 'text_delta', text: `${item.text}\n` }
  } else if (
    item.type === 'command_execution' &&
    typeof item.command === 'string'
  ) {
    yield {
      type: 'tool_use',
      id: typeof item.id === 'string' ? item.id : '',
      name: 'command_execution',
      input: { command: item.command },
    }
    if (typeof item.aggregated_output === 'string') {
      yield {
        type: 'tool_result',
        toolUseId: typeof item.id === 'string' ? item.id : '',
        content:
          item.aggregated_output ||
          `(exit code: ${item.exit_code ?? 'unknown'})`,
      }
    }
  }
}
