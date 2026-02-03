export type RawEvent = Record<string, unknown>

export type TextDeltaEvent = { type: 'text_delta'; text: string }
export type ToolUseEvent = {
  type: 'tool_use'
  id: string
  name: string
  input: Record<string, unknown>
}
export type ToolResultEvent = {
  type: 'tool_result'
  toolUseId: string
  content: string
}
export type AssistantMessageEvent = {
  type: 'assistant_message'
  content: Array<{
    type: string
    text?: string
    name?: string
    input?: unknown
  }>
}
export type ResultEvent = {
  type: 'result'
  subtype: 'success' | 'error'
  result?: string
  error?: string
  cost_usd: number
  duration_ms: number
  num_turns: number
  session_id: string
}

export type ClaudeEvent =
  | TextDeltaEvent
  | ToolUseEvent
  | ToolResultEvent
  | AssistantMessageEvent
  | ResultEvent

export type WriteOp = { op: 'write'; text: string }
export type LineOp = { op: 'line'; text: string }
export type OutputOp = WriteOp | LineOp

export interface OutputSink {
  write(text: string): void
  line(text: string): void
}

export interface SpawnOptions {
  cwd?: string
  allowedTools?: string[]
  maxTurns?: number
  model?: string
  systemPrompt?: string
  sessionId?: string
  dangerouslySkipPermissions?: boolean
  env?: Record<string, string>
}

export type RawEventCallback = (event: RawEvent) => void
