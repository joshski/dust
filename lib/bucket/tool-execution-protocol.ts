/**
 * Tool execution protocol types for the WebSocket messages between
 * dust clients and dustbucket servers.
 *
 * These types define the wire format. Both sides must agree on this protocol.
 * Import from '@joshski/dust/types' for downstream implementations.
 */

// ── Request ──────────────────────────────────────────────────────────

/**
 * Client-to-server message requesting tool execution.
 *
 * Sent over the bucket WebSocket when an agent invokes `dust bucket tool <name>`.
 * The `tool` field identifies the server-defined tool by name.
 * The `arguments` field contains named parameters matching the tool definition.
 * The `repositoryId` identifies the repository context (numeric server-side ID).
 */
export interface ToolExecutionRequestMessage {
  type: 'tool-execution-request'
  requestId: string
  tool: string
  repositoryId: number
  arguments: Record<string, unknown>
}

// ── Result ───────────────────────────────────────────────────────────

export interface ToolExecutionSuccessResult {
  type: 'success'
  data: unknown
}

export interface ToolExecutionToolNotFoundResult {
  type: 'tool-not-found'
  message: string
}

export interface ToolExecutionErrorResult {
  type: 'error'
  message: string
}

export type ToolExecutionResult =
  | ToolExecutionSuccessResult
  | ToolExecutionToolNotFoundResult
  | ToolExecutionErrorResult

/**
 * Server-to-client message with the result of a tool execution request.
 *
 * The `requestId` correlates this response to the original request.
 * The `result` is a discriminated union on the `type` field.
 */
export interface ToolExecutionResultMessage {
  type: 'tool-execution-result'
  requestId: string
  result: ToolExecutionResult
}

// ── Validation ───────────────────────────────────────────────────────

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isValidResultType(
  value: unknown
): value is 'success' | 'tool-not-found' | 'error' {
  return value === 'success' || value === 'tool-not-found' || value === 'error'
}

function isValidResult(value: unknown): value is ToolExecutionResult {
  if (!isRecord(value)) return false
  if (!isValidResultType(value.type)) return false
  if (value.type === 'success') return true
  return typeof value.message === 'string'
}

export function isToolExecutionResultMessage(
  payload: unknown
): payload is ToolExecutionResultMessage {
  if (!isRecord(payload)) return false
  if (payload.type !== 'tool-execution-result') return false
  if (typeof payload.requestId !== 'string' || payload.requestId.length === 0) {
    return false
  }
  return isValidResult(payload.result)
}

export function isToolExecutionRequestMessage(
  payload: unknown
): payload is ToolExecutionRequestMessage {
  if (!isRecord(payload)) return false
  if (payload.type !== 'tool-execution-request') return false
  if (typeof payload.requestId !== 'string' || payload.requestId.length === 0) {
    return false
  }
  if (typeof payload.tool !== 'string' || payload.tool.length === 0) {
    return false
  }
  if (typeof payload.repositoryId !== 'number') return false
  return isRecord(payload.arguments)
}
