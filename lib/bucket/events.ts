/**
 * Bucket event types and WebSocket event emission.
 *
 * Defines the event schema for dustbucket communication and provides
 * helpers for formatting events and sending them over WebSocket.
 */

// WebSocket readyState constants
export const WS_CONNECTING = 0
export const WS_OPEN = 1
export const WS_CLOSING = 2
export const WS_CLOSED = 3

export interface WebSocketLike {
  onopen: (() => void) | null
  onclose: ((event: { code: number; reason: string }) => void) | null
  onerror: ((error: Error) => void) | null
  onmessage: ((event: { data: string }) => void) | null
  close: () => void
  send: (data: string) => void
  readyState: number
}

// Bucket-specific event types
export interface BucketConnectedEvent {
  type: 'bucket.connected'
}

export interface BucketDisconnectedEvent {
  type: 'bucket.disconnected'
  code: number
  reason: string
}

export interface BucketRepositoryAddedEvent {
  type: 'bucket.repository_added'
  repository: string
}

export interface BucketRepositoryRemovedEvent {
  type: 'bucket.repository_removed'
  repository: string
}

export interface BucketIterationStartedEvent {
  type: 'bucket.iteration_started'
  repository: string
}

export interface BucketIterationCompletedEvent {
  type: 'bucket.iteration_completed'
  repository: string
  success: boolean
  error?: string
}

export interface BucketErrorEvent {
  type: 'bucket.error'
  repository?: string
  error: string
}

export interface BucketRepositorySessionEvent {
  type: 'bucket.repository_session_event'
  repository: string
  agentSessionId?: string
  event: { type: string; [key: string]: unknown }
}

export type BucketEvent =
  | BucketConnectedEvent
  | BucketDisconnectedEvent
  | BucketRepositoryAddedEvent
  | BucketRepositoryRemovedEvent
  | BucketIterationStartedEvent
  | BucketIterationCompletedEvent
  | BucketErrorEvent
  | BucketRepositorySessionEvent

export interface BucketEventPayload {
  type: BucketEvent['type']
  timestamp: string
  sessionId: string
  sequence: number
  repository?: string
  agentSessionId?: string
  details?: unknown
}

export type BucketEmitFn = (event: BucketEvent) => void

// Format event for console output
export function formatBucketEvent(event: BucketEvent): string {
  switch (event.type) {
    case 'bucket.connected':
      return 'Connected to dustbucket'
    case 'bucket.disconnected':
      return `Disconnected (code: ${event.code}, reason: ${event.reason || 'none'})`
    case 'bucket.repository_added':
      return `Added repository: ${event.repository}`
    case 'bucket.repository_removed':
      return `Removed repository: ${event.repository}`
    case 'bucket.iteration_started':
      return `Starting iteration for ${event.repository}`
    case 'bucket.iteration_completed':
      return event.success
        ? `Completed iteration for ${event.repository}`
        : `Iteration failed for ${event.repository}: ${event.error}`
    case 'bucket.error':
      return event.repository
        ? `Error for ${event.repository}: ${event.error}`
        : `Error: ${event.error}`
    case 'bucket.repository_session_event':
      return `[${event.repository}] ${event.event.type}`
  }
}

// Create an event emitter that sends events via WebSocket
export function createBucketEventEmitter(
  getWebSocket: () => WebSocketLike | null,
  sessionId: string
): BucketEmitFn {
  let sequence = 0

  return (event: BucketEvent) => {
    sequence++

    const payload: BucketEventPayload = {
      type: event.type,
      timestamp: new Date().toISOString(),
      sessionId,
      sequence,
    }

    // Add repository field for repo-specific events
    if ('repository' in event && event.repository) {
      payload.repository = event.repository
    }

    // Add details for events with extra data
    if (event.type === 'bucket.disconnected') {
      payload.details = { code: event.code, reason: event.reason }
    } else if (event.type === 'bucket.iteration_completed') {
      payload.details = { success: event.success, error: event.error }
    } else if (event.type === 'bucket.error') {
      payload.details = { error: event.error }
    } else if (event.type === 'bucket.repository_session_event') {
      payload.details = { event: event.event }
      if (event.agentSessionId) {
        payload.agentSessionId = event.agentSessionId
      }
    }

    const ws = getWebSocket()
    if (ws && ws.readyState === WS_OPEN) {
      try {
        ws.send(JSON.stringify(payload))
      } catch {
        // Fire-and-forget: ignore send errors
      }
    }
  }
}
