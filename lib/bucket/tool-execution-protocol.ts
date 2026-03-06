import type { ToolExecutionStatus } from './command-events-proxy'

export interface ToolExecutionRequestMessage {
  type: 'tool-execution-request'
  requestId: string
  toolName: string
  arguments: string[]
  repositoryId: string
}

export interface ToolExecutionResultMessage {
  type: 'tool-execution-result'
  requestId: string
  status: ToolExecutionStatus
  output?: string
  error?: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function isToolExecutionResultMessage(
  payload: unknown
): payload is ToolExecutionResultMessage {
  if (!isRecord(payload)) return false
  if (payload.type !== 'tool-execution-result') return false
  if (typeof payload.requestId !== 'string' || payload.requestId.length === 0) {
    return false
  }
  if (
    payload.status !== 'success' &&
    payload.status !== 'tool-not-found' &&
    payload.status !== 'error'
  ) {
    return false
  }
  if (payload.output !== undefined && typeof payload.output !== 'string') {
    return false
  }
  if (payload.error !== undefined && typeof payload.error !== 'string') {
    return false
  }
  return true
}
